-- =============================================================================
-- ARCADIA SUBLINE — Migration 0012 : PALIERS DE DIFFICULTÉ + SCORING MINI-JEU
--
-- Modélisation retenue : UN PALIER = UNE QUÊTE DISTINCTE par station.
--   · quests.difficulty (bronze|silver|gold, nullable = quête sans palier)
--   · même terrain, paramètres durcis dans quest_steps.payload (client) et
--     quest_steps.answer_key (seuils AUTORITATIFS serveur, jamais exposés)
--   · avantages : fn_submit_attempt reste mono-clé (quest_id), l'anti-farming
--     "marge au-delà du meilleur score" fonctionne PAR PALIER, le journal
--     quest_attempts porte naturellement le palier joué.
--
-- Extension de fn_submit_attempt (MÊME signature, MÊME autorité) :
--   · étape "minigame" (payload.kind='minigame') → la réponse soumise est la
--     TÉLÉMÉTRIE brute du run ; le serveur la valide contre answer_key
--     (max_shots, min_destruction_pct, time_limit_s…) et calcule le score.
--     Toute télémétrie implausible → flagged, score 0 (journalisée pour revue).
--   · étapes quiz : comportement 0010 inchangé.
--   · paliers gagnés → mastery imposée par palier : bronze 40 · silver 80 ·
--     gold 100 (mastered = silver+ ET présence physique, règle 0010 conservée).
--   · gating serveur : silver exige un succès bronze sur la même station,
--     gold exige silver (le client ne peut pas forcer un palier verrouillé).
-- Idempotent / rollback-safe.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) ENUM + COLONNE difficulty
-- ---------------------------------------------------------------------------
do $$ begin
  create type quest_difficulty as enum ('bronze', 'silver', 'gold');
exception when duplicate_object then null; end $$;

alter table public.quests
  add column if not exists difficulty quest_difficulty;

comment on column public.quests.difficulty is
  'Palier Geometry-Dash-like. NULL = quête sans palier. Un palier = une quête distincte (même station, même archétype, paramètres durcis).';

-- Un seul jeu par (station, palier) pour les quêtes à palier
create unique index if not exists uq_quests_station_difficulty
  on public.quests (station_id, difficulty)
  where difficulty is not null and station_id is not null;

-- ---------------------------------------------------------------------------
-- 2) fn_submit_attempt v2 — quiz inchangé + branche mini-jeu + paliers
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
  -- branche mini-jeu
  v_kind          text;
  v_ak            jsonb;
  v_shots         int;
  v_max_shots     int;
  v_pct           int;
  v_min_pct       int;
  v_targets       int;
  v_total_targets int;
  v_time_limit_s  int;
  v_time_left_ms  int;
  v_mult          numeric;
  v_step_win      boolean;
begin
  -- ----- Identité & garde-fous (inchangé 0010) --------------------------------
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

  if v_quest.season_id is not null and not exists (
       select 1 from public.seasons s
        where s.id = v_quest.season_id
          and s.is_active
          and now() between s.starts_at and s.ends_at)
  then
    raise exception 'SEASON_CLOSED';
  end if;

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

  -- ----- Gating de palier : le serveur verrouille la porte, pas le client -----
  if v_quest.difficulty in ('silver', 'gold') and v_quest.station_id is not null then
    if not exists (
         select 1
           from public.quest_attempts qa
           join public.quests q2 on q2.id = qa.quest_id
          where qa.player_id = v_player
            and qa.success
            and not qa.flagged
            and q2.station_id = v_quest.station_id
            and q2.difficulty = (case v_quest.difficulty
                                   when 'silver' then 'bronze'
                                   else 'silver' end)::quest_difficulty)
    then
      raise exception 'TIER_LOCKED'
        using hint = 'Réussir le palier précédent de cette station avant de tenter celui-ci.';
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_player::text || p_quest_id::text, 42));

  -- ----- Notation serveur, étape par étape ------------------------------------
  for v_step in
    select id, payload, answer_key
      from public.quest_steps
     where quest_id = p_quest_id
     order by position
  loop
    v_total := v_total + 1;
    v_given := p_answers -> v_step.id::text;
    v_kind  := v_step.payload ->> 'kind';

    if v_kind = 'minigame' then
      -- ======= BRANCHE MINI-JEU : la réponse est la télémétrie du run =======
      v_ak            := v_step.answer_key;
      v_max_shots     := coalesce((v_ak ->> 'max_shots')::int, 5);
      v_min_pct       := coalesce((v_ak ->> 'min_destruction_pct')::int, 0);
      v_total_targets := coalesce((v_ak ->> 'total_targets')::int, 3);
      v_time_limit_s  := coalesce((v_ak ->> 'time_limit_s')::int, 0);
      v_mult          := coalesce((v_ak ->> 'tier_multiplier')::numeric, 1.0);

      v_shots        := coalesce((v_given ->> 'shots_used')::int, -1);
      v_pct          := coalesce((v_given ->> 'destruction_pct')::int, -1);
      v_targets      := coalesce((v_given ->> 'targets_down')::int, -1);
      v_time_left_ms := coalesce((v_given ->> 'time_left_ms')::int, 0);

      -- Plausibilité : toute valeur hors des bornes PHYSIQUES du terrain = triche
      if v_given is null
         or v_pct < 0 or v_pct > 100
         or v_shots < 1 or v_shots > v_max_shots
         or v_targets < 0 or v_targets > v_total_targets
         or v_time_left_ms < 0
         or (v_time_limit_s > 0 and v_time_left_ms > v_time_limit_s * 1000)
         or (p_duration_ms is not null and p_duration_ms < v_shots * 800)
      then
        v_flagged     := true;
        v_flag_reason := coalesce(v_flag_reason || ' ; ', '')
                         || format('télémétrie implausible (étape %s)', v_step.id);
        continue;
      end if;

      -- Victoire du palier : tous les étendards à terre + % de destruction requis
      v_step_win := (v_targets = v_total_targets and v_pct >= v_min_pct);

      if v_step_win then
        v_correct := v_correct + 1;
        -- Score serveur : destruction + économie de boulets + bonus chrono,
        -- pondéré par le multiplicateur de palier (answer_key, invisible client)
        v_score := v_score + round(
          ( 600.0 * v_pct / 100.0
          + 80.0  * (v_max_shots - v_shots)
          + least(60.0, v_time_left_ms / 1000.0)
          ) * v_mult);
      else
        -- Run honnête mais perdu : petite participation (rejouabilité)
        v_score := v_score + round(600.0 * v_pct / 100.0 * 0.25 * v_mult);
      end if;

    else
      -- ======= BRANCHE QUIZ (0010, inchangée) =======
      v_points := coalesce((v_step.payload ->> 'points')::int, 10);
      if v_given is not null
         and v_given = coalesce(v_step.answer_key -> 'answer', v_step.answer_key) then
        v_correct := v_correct + 1;
        v_score   := v_score + v_points;
      end if;
    end if;
  end loop;

  if v_total = 0 then
    raise exception 'QUEST_HAS_NO_STEPS';
  end if;
  v_success := (v_correct = v_total) and not v_flagged;

  -- ----- Anti-triche durée globale (0010, inchangé) ---------------------------
  begin
    v_min_step_ms := coalesce(nullif(current_setting('arcadia.min_step_duration_ms', true), '')::int, 300);
  exception when others then v_min_step_ms := 300; end;

  if p_duration_ms is not null and p_duration_ms < v_min_step_ms * v_total then
    v_flagged     := true;
    v_flag_reason := format('durée %s ms < seuil %s ms (%s étapes)',
                            p_duration_ms, v_min_step_ms * v_total, v_total);
    v_success     := false;
  end if;
  if v_flagged then
    v_score := 0;
  end if;

  -- ----- Anti-farming : seule la MARGE au-delà du meilleur score paie ---------
  select coalesce(max(score), 0) into v_best_prev
    from public.quest_attempts
   where player_id = v_player and quest_id = p_quest_id and not flagged;
  v_xp_gained := greatest(0, v_score - v_best_prev);

  -- ----- Journal immuable -----------------------------------------------------
  insert into public.quest_attempts
         (player_id, quest_id, season_id, score, success, duration_ms,
          answers, flagged, flag_reason)
  values (v_player, p_quest_id, v_quest.season_id, v_score, v_success,
          p_duration_ms, p_answers, v_flagged, v_flag_reason)
  returning id into v_attempt_id;

  -- ----- Propagation atomique (rien si flagged) -------------------------------
  if not v_flagged then

    if v_quest.station_id is not null then
      -- Mastery : imposée par le palier gagné, sinon ratio (quêtes sans palier)
      if v_quest.difficulty is not null then
        v_mastery := case
                       when not v_success then 0
                       when v_quest.difficulty = 'bronze' then 40
                       when v_quest.difficulty = 'silver' then 80
                       else 100
                     end;
      else
        v_mastery := least(100, (100 * v_correct) / v_total);
      end if;

      insert into public.player_station_progress
             (player_id, station_id, state, mastery_score, first_seen_at)
      values (v_player, v_quest.station_id, 'discovered', v_mastery, now())
      on conflict (player_id, station_id) do update
         set mastery_score = greatest(public.player_station_progress.mastery_score, excluded.mastery_score),
             updated_at    = now()
      returning * into v_psp;

      if v_psp.state = 'visited' and v_psp.mastery_score >= 80 then
        update public.player_station_progress
           set state = 'mastered', updated_at = now()
         where id = v_psp.id;
        v_newly_mastered := true;
      end if;
    end if;

    insert into public.player_line_progress as plp (player_id, line_id, line_score, stations_mastered)
    select v_player, l.line_id, v_xp_gained,
           case when v_newly_mastered then 1 else 0 end
      from (
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

  -- ----- Résultat (jamais le corrigé, jamais les seuils) -----------------------
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
  'Unique porte d''entrée du score (v2 paliers). Quiz : notation answer_key. Mini-jeu : validation de télémétrie contre les seuils answer_key + score serveur pondéré par palier. Gating serveur bronze→silver→gold. Anti-farming + anti-triche durée/plausibilité.';

-- Les GRANT/REVOKE de 0010 restent valides (CREATE OR REPLACE conserve les ACL).
