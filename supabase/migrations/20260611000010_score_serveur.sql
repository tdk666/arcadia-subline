-- =============================================================================
-- ARCADIA SUBLINE — Migration 0010 : SCORE INFALSIFIABLE (serveur-autoritatif)
--
-- Faille corrigée : les policies RLS 0007 laissaient un joueur authentifié
-- écrire lui-même score/success/mastery/line_score/xp. Désormais :
--   · AUCUNE écriture client sur quest_attempts / player_station_progress /
--     player_line_progress (policies supprimées + privilèges révoqués).
--   · players : UPDATE/INSERT limités par PRIVILÈGES DE COLONNES au profil
--     (display_name, home_line_id) — xp_total/streak/last_played_at deviennent
--     inaccessibles au client même avec une policy permissive.
--   · Le client appelle fn_submit_attempt(quête, réponses, durée) ; le serveur
--     note contre answer_key, journalise, propage atomiquement progression,
--     conquête de ligne, XP et streak, et renvoie le résultat (jamais le corrigé).
--   · check_ins alimente la progression via trigger SECURITY DEFINER
--     (le client ne pouvant plus écrire player_station_progress lui-même).
-- Idempotent / rollback-safe.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) RETRAIT DES CHEMINS D'ÉCRITURE CLIENT SUR LES TABLES DE SCORE
-- ---------------------------------------------------------------------------
drop policy if exists p_qa_insert_own  on public.quest_attempts;
drop policy if exists p_psp_insert_own on public.player_station_progress;
drop policy if exists p_psp_update_own on public.player_station_progress;
drop policy if exists p_plp_insert_own on public.player_line_progress;
drop policy if exists p_plp_update_own on public.player_line_progress;
-- Les policies SELECT owner-only (p_qa_select_own, p_psp_select_own,
-- p_plp_select_own) sont conservées : chacun lit SA progression.

-- Ceinture + bretelles : révocation des privilèges (RLS deny-by-default ne
-- suffit pas si une policy permissive réapparaît un jour par erreur).
revoke insert, update, delete on public.quest_attempts          from anon, authenticated;
revoke insert, update, delete on public.player_station_progress from anon, authenticated;
revoke insert, update, delete on public.player_line_progress    from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) PLAYERS : verrouillage des colonnes sensibles par privilèges de colonnes
--    (les policies 0007 restent valides ; la grille de colonnes les complète)
-- ---------------------------------------------------------------------------
revoke insert, update on public.players from anon, authenticated;
grant insert (id, display_name, home_line_id) on public.players to authenticated;
grant update (display_name, home_line_id)     on public.players to authenticated;
-- xp_total / streak_count / last_played_at : écrits exclusivement par
-- fn_submit_attempt (SECURITY DEFINER) et le back-office service_role.

-- ---------------------------------------------------------------------------
-- 3) CHECK_INS : le client ne fournit que (player_id, station_id, method).
--    confidence / expires_at / created_at sont imposés par le serveur.
-- ---------------------------------------------------------------------------
revoke insert on public.check_ins from anon, authenticated;
grant insert (player_id, station_id, method) on public.check_ins to authenticated;

create or replace function public.fn_checkin_server_fields()
returns trigger
language plpgsql
as $$
begin
  new.created_at := now();
  -- Confiance imposée par méthode (le client ne peut plus s'auto-attribuer 1.0)
  new.confidence := case new.method
                      when 'qr'     then 1.00
                      when 'geo'    then 0.90
                      else               0.60   -- manual (déclaratif + cooldown)
                    end;
  new.expires_at := now() + interval '10 minutes';
  return new;
end;
$$;

-- Nommage "trg_a_…" délibéré : les triggers BEFORE s'exécutent en ordre
-- alphabétique, ce forçage serveur doit donc précéder trg_checkin_cooldown
-- pour que le cooldown évalue le created_at SERVEUR, jamais celui du client.
drop trigger if exists trg_checkin_server_fields on public.check_ins;  -- ancien nom éventuel
drop trigger if exists trg_a_checkin_server_fields on public.check_ins;
create trigger trg_a_checkin_server_fields
  before insert on public.check_ins
  for each row execute function public.fn_checkin_server_fields();

-- ---------------------------------------------------------------------------
-- 4) CHECK-IN → PROGRESSION : trigger SECURITY DEFINER (discovered→visited,
--    visits_count). Indispensable : le client ne peut plus écrire psp.
-- ---------------------------------------------------------------------------
create or replace function public.fn_checkin_apply_progress()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.player_station_progress
         (player_id, station_id, state, visits_count, first_seen_at)
  values (new.player_id, new.station_id, 'visited', 1, now())
  on conflict (player_id, station_id) do update
     set visits_count = public.player_station_progress.visits_count + 1,
         -- une visite physique fait au minimum passer 'discovered' → 'visited',
         -- sans jamais rétrograder 'mastered'
         state = case when public.player_station_progress.state = 'discovered'
                      then 'visited'::progress_state
                      else public.player_station_progress.state end,
         updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_checkin_apply_progress on public.check_ins;
create trigger trg_checkin_apply_progress
  after insert on public.check_ins
  for each row execute function public.fn_checkin_apply_progress();

-- ---------------------------------------------------------------------------
-- 5) AUDIT ANTI-TRICHE : colonnes de signalement sur le journal des tentatives
-- ---------------------------------------------------------------------------
alter table public.quest_attempts
  add column if not exists answers     jsonb,                       -- réponses soumises (audit/revue)
  add column if not exists flagged     boolean not null default false,
  add column if not exists flag_reason text;
comment on column public.quest_attempts.flagged is
  'true = tentative suspecte (ex: durée aberrante). Score forcé à 0, journalisée pour revue.';

-- ---------------------------------------------------------------------------
-- 6) LE CŒUR : fn_submit_attempt — l'UNIQUE porte d'entrée du score
--
-- Contrat client : select fn_submit_attempt(p_quest_id, p_answers, p_duration_ms)
--   p_answers = objet jsonb { "<quest_step_id>": <réponse> }
-- Retour : { attempt_id, score, success, correct_steps, total_steps,
--            xp_gained, mastery, flagged } — JAMAIS le corrigé.
--
-- Garanties :
--   · Identité = auth.uid() (le client ne choisit pas pour qui il joue)
--   · Notation serveur contre quest_steps.answer_key (invisible du client)
--   · Anti-farming : l'XP gagné = max(0, score − meilleur score antérieur
--     sur cette quête) → rejouer ne rapporte que la marge de progression
--   · Anti-triche durée : < (arcadia.min_step_duration_ms × nb étapes,
--     défaut 300 ms/étape) ⇒ score 0, flagged, mais journalisée
--   · Exploration : exige un check-in ACTIF (non expiré) sur la station
--     (knowledge/sponsored restent jouables hors station — async-first)
--   · Atomicité + anti double-soumission : advisory lock (player, quest)
-- ---------------------------------------------------------------------------
create or replace function public.fn_submit_attempt(
  p_quest_id    uuid,
  p_answers     jsonb default '{}'::jsonb,
  p_duration_ms int   default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_player        uuid := auth.uid();
  v_quest         public.quests%rowtype;
  v_step          record;
  v_total         int := 0;
  v_correct       int := 0;
  v_score         int := 0;
  v_points        int;
  v_given         jsonb;
  v_success       boolean := false;
  v_flagged       boolean := false;
  v_flag_reason   text;
  v_min_step_ms   int;
  v_best_prev     int;
  v_xp_gained     int := 0;
  v_mastery       int;
  v_psp           public.player_station_progress%rowtype;
  v_newly_mastered boolean := false;
  v_attempt_id    uuid;
  v_today         date;
  v_last_day      date;
begin
  -- ----- Identité & garde-fous ----------------------------------------------
  if v_player is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;
  if not exists (select 1 from public.players where id = v_player) then
    raise exception 'PLAYER_PROFILE_MISSING' using
      hint = 'Créer le profil players avant de jouer.';
  end if;

  select * into v_quest from public.quests q where q.id = p_quest_id;
  if not found then
    raise exception 'QUEST_NOT_FOUND';
  end if;

  -- Saison : une quête rattachée à une saison n'est jouable que pendant celle-ci
  if v_quest.season_id is not null and not exists (
       select 1 from public.seasons s
        where s.id = v_quest.season_id
          and s.is_active
          and now() between s.starts_at and s.ends_at)
  then
    raise exception 'SEASON_CLOSED';
  end if;

  -- Exploration ⇒ présence validée (check-in actif sur la station de la quête)
  if v_quest.type = 'exploration' and v_quest.station_id is not null then
    if not exists (
         select 1 from public.check_ins ci
          where ci.player_id  = v_player
            and ci.station_id = v_quest.station_id
            and ci.expires_at > now())
    then
      raise exception 'CHECKIN_REQUIRED'
        using hint = 'Valider sa présence en station (check-in) avant une quête exploration.';
    end if;
  end if;

  -- Sérialisation des soumissions concurrentes du même couple (joueur, quête)
  perform pg_advisory_xact_lock(hashtextextended(v_player::text || p_quest_id::text, 42));

  -- ----- Notation serveur contre answer_key ---------------------------------
  for v_step in
    select id, payload, answer_key
      from public.quest_steps
     where quest_id = p_quest_id
     order by position
  loop
    v_total  := v_total + 1;
    v_points := coalesce((v_step.payload->>'points')::int, 10);
    v_given  := p_answers -> v_step.id::text;

    -- Convention : answer_key = {"answer": <valeur jsonb>} ; à défaut, on
    -- compare la réponse au answer_key entier (rétro-compatibilité).
    if v_given is not null and v_given = coalesce(v_step.answer_key->'answer', v_step.answer_key) then
      v_correct := v_correct + 1;
      v_score   := v_score + v_points;
    end if;
  end loop;

  if v_total = 0 then
    raise exception 'QUEST_HAS_NO_STEPS';
  end if;
  v_success := (v_correct = v_total);

  -- ----- Anti-triche : durée physiologiquement impossible --------------------
  begin
    v_min_step_ms := coalesce(nullif(current_setting('arcadia.min_step_duration_ms', true), '')::int, 300);
  exception when others then v_min_step_ms := 300; end;

  if p_duration_ms is not null and p_duration_ms < v_min_step_ms * v_total then
    v_flagged     := true;
    v_flag_reason := format('durée %s ms < seuil %s ms (%s étapes)',
                            p_duration_ms, v_min_step_ms * v_total, v_total);
    v_score   := 0;          -- la triche ne rapporte rien…
    v_success := false;
  end if;

  -- ----- Anti-farming : seule la MARGE au-delà du meilleur score paie --------
  select coalesce(max(score), 0) into v_best_prev
    from public.quest_attempts
   where player_id = v_player and quest_id = p_quest_id and not flagged;
  v_xp_gained := greatest(0, v_score - v_best_prev);

  -- ----- Journal immuable ----------------------------------------------------
  insert into public.quest_attempts
         (player_id, quest_id, season_id, score, success, duration_ms,
          answers, flagged, flag_reason)
  values (v_player, p_quest_id, v_quest.season_id, v_score, v_success,
          p_duration_ms, p_answers, v_flagged, v_flag_reason)
  returning id into v_attempt_id;

  -- ----- Propagation atomique (rien si flagged) ------------------------------
  if not v_flagged then

    -- (a) Progression de station : mastery = meilleur ratio observé (0–100)
    if v_quest.station_id is not null then
      v_mastery := least(100, (100 * v_correct) / v_total);

      insert into public.player_station_progress
             (player_id, station_id, state, mastery_score, first_seen_at)
      values (v_player, v_quest.station_id, 'discovered', v_mastery, now())
      on conflict (player_id, station_id) do update
         set mastery_score = greatest(public.player_station_progress.mastery_score, excluded.mastery_score),
             updated_at    = now()
      returning * into v_psp;

      -- 'mastered' exige : maîtrise ≥ 80 ET présence physique passée (visited)
      if v_psp.state = 'visited' and v_psp.mastery_score >= 80 then
        update public.player_station_progress
           set state = 'mastered', updated_at = now()
         where id = v_psp.id;
        v_newly_mastered := true;
      end if;
    end if;

    -- (b) Conquête de ligne : score sur la/les lignes concernées
    insert into public.player_line_progress as plp (player_id, line_id, line_score, stations_mastered)
    select v_player, l.line_id, v_xp_gained,
           case when v_newly_mastered then 1 else 0 end
      from (
        -- lignes ciblées : quest.line_id si défini, sinon toutes les lignes
        -- passant par la station de la quête
        select v_quest.line_id as line_id where v_quest.line_id is not null
        union
        select ls.line_id from public.line_stations ls
         where v_quest.line_id is null and ls.station_id = v_quest.station_id
      ) l
     where l.line_id is not null
    on conflict (player_id, line_id) do update
       set line_score        = plp.line_score + excluded.line_score,
           stations_mastered = plp.stations_mastered + excluded.stations_mastered,
           updated_at        = now();

    -- (c) XP global + streak quotidien (boucle de rétention)
    v_today := (now() at time zone 'Europe/Paris')::date;
    select (last_played_at at time zone 'Europe/Paris')::date
      into v_last_day from public.players where id = v_player;

    update public.players
       set xp_total       = xp_total + v_xp_gained,
           streak_count   = case
                              when v_last_day = v_today              then streak_count
                              when v_last_day = v_today - 1          then streak_count + 1
                              else 1
                            end,
           last_played_at = now(),
           updated_at     = now()
     where id = v_player;
  end if;

  -- ----- Résultat (jamais le corrigé) ----------------------------------------
  return jsonb_build_object(
    'attempt_id',    v_attempt_id,
    'score',         v_score,
    'success',       v_success,
    'correct_steps', v_correct,
    'total_steps',   v_total,
    'xp_gained',     v_xp_gained,
    'mastery',       v_mastery,
    'flagged',       v_flagged
  );
end;
$$;

comment on function public.fn_submit_attempt(uuid, jsonb, int) is
  'Unique porte d''entrée du score. Note côté serveur contre answer_key, propage atomiquement progression/lignes/XP/streak. Anti-farming (marge de progression) + anti-triche durée (flag).';

-- Exposition : authenticated uniquement (PostgREST : POST /rpc/fn_submit_attempt)
revoke all on function public.fn_submit_attempt(uuid, jsonb, int) from public, anon;
grant execute on function public.fn_submit_attempt(uuid, jsonb, int) to authenticated;

-- Les fonctions internes ne sont appelables par personne d'autre que le serveur
revoke all on function public.fn_checkin_apply_progress() from public, anon, authenticated;
revoke all on function public.fn_checkin_server_fields()  from public, anon, authenticated;
