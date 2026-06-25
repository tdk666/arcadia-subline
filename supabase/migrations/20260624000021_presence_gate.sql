-- =============================================================================
-- ARCADIA SUBLINE — Migration 0021 : GATE DE PRÉSENCE GÉNÉRALISÉ (DEC-015)
--
-- Décision fondateur : « on conquiert quand on est sur la ligne ». La présence
-- (check-in actif) devient la condition pour qu'une partie COMPTE (points / XP /
-- maîtrise / lignes / classements). Sans présence, la partie reste JOUABLE mais
-- en ENTRAÎNEMENT : journalisée, non créditée, hors classements.
--
-- Remplace le blocage DUR « exploration ⇒ CHECKIN_REQUIRED » (qui empêchait de
-- jouer) par un gate DOUX, généralisé à toutes les quêtes rattachées à une station.
--
-- 100 % ADDITIF & sûr : colonne `scored` (default true ⇒ historique inchangé),
-- fn_submit_attempt garde sa signature et toutes ses sécurités (answer_key serveur,
-- anti-triche durée, anti-farming, advisory lock), les classements filtrent `scored`.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- (1) Colonne `scored` : la tentative a-t-elle été comptabilisée (présence OK) ?
--     Les lignes existantes = true (aucune régression sur l'historique).
-- ---------------------------------------------------------------------------
alter table public.quest_attempts
  add column if not exists scored boolean not null default true;

comment on column public.quest_attempts.scored is
  'Présence validée à la soumission (check-in actif) ⇒ partie comptabilisée. false = entraînement (DEC-015).';

-- ---------------------------------------------------------------------------
-- (2) fn_submit_attempt : gate de présence DOUX (journalise toujours, crédite si présent)
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
  v_scored        boolean := true;   -- présence validée ? (DEC-015)
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

  -- ----- GATE DE PRÉSENCE (DEC-015) : doux, généralisé -----------------------
  -- Toute quête rattachée à une station ne COMPTE qu'avec un check-in actif. Sans
  -- présence : on laisse jouer (entraînement) mais on ne crédite rien (v_scored=false).
  if v_quest.station_id is not null then
    v_scored := exists (
      select 1 from public.check_ins ci
       where ci.player_id  = v_player
         and ci.station_id = v_quest.station_id
         and ci.expires_at > now());
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
    v_score   := 0;
    v_success := false;
  end if;

  -- ----- Anti-farming : seule la MARGE au-delà du meilleur score COMPTÉ paie --
  select coalesce(max(score), 0) into v_best_prev
    from public.quest_attempts
   where player_id = v_player and quest_id = p_quest_id and not flagged and scored;
  v_xp_gained := greatest(0, v_score - v_best_prev);

  -- ----- Journal immuable (inclut le drapeau de comptabilisation) ------------
  insert into public.quest_attempts
         (player_id, quest_id, season_id, score, success, duration_ms,
          answers, flagged, flag_reason, scored)
  values (v_player, p_quest_id, v_quest.season_id, v_score, v_success,
          p_duration_ms, p_answers, v_flagged, v_flag_reason, v_scored)
  returning id into v_attempt_id;

  -- ----- Propagation atomique (rien si flagged NI si entraînement) -----------
  if not v_flagged and v_scored then

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
  else
    -- entraînement (ou flagged) : aucune marge créditée
    v_xp_gained := 0;
  end if;

  -- ----- Résultat (jamais le corrigé) ; `scored` informe l'UI ----------------
  return jsonb_build_object(
    'attempt_id',    v_attempt_id,
    'score',         v_score,
    'success',       v_success,
    'correct_steps', v_correct,
    'total_steps',   v_total,
    'xp_gained',     v_xp_gained,
    'mastery',       v_mastery,
    'flagged',       v_flagged,
    'scored',        v_scored
  );
end;
$$;

comment on function public.fn_submit_attempt(uuid, jsonb, int) is
  'Unique porte d''entrée du score. Gate de présence DOUX (DEC-015) : journalise toujours, ne crédite (progression/lignes/XP/streak) que si check-in actif. Note serveur contre answer_key, anti-farming (marge), anti-triche durée.';

revoke all on function public.fn_submit_attempt(uuid, jsonb, int) from public, anon;
grant execute on function public.fn_submit_attempt(uuid, jsonb, int) to authenticated;

-- ---------------------------------------------------------------------------
-- (3) Classements : n'agréger que les tentatives COMPTÉES (présence validée)
-- ---------------------------------------------------------------------------
create or replace function public.fn_station_leaderboard(p_station_id uuid, p_limit int default 20)
returns table (player_id uuid, display_name text, best_score int, rank bigint)
language sql
stable
security definer
set search_path = public
as $$
  with best as (
    select qa.player_id, max(qa.score) as best_score
    from public.quest_attempts qa
    join public.quests q on q.id = qa.quest_id
    where not qa.flagged and qa.scored and q.station_id = p_station_id
    group by qa.player_id
  )
  select b.player_id, p.display_name, b.best_score,
         rank() over (order by b.best_score desc) as rank
  from best b
  join public.players p on p.id = b.player_id
  where b.best_score > 0
  order by b.best_score desc
  limit greatest(1, least(p_limit, 100));
$$;

grant execute on function public.fn_station_leaderboard(uuid, int) to anon, authenticated;

create or replace function public.fn_line_leaderboard(p_line_id uuid, p_limit int default 20)
returns table (player_id uuid, display_name text, total_score bigint, rank bigint)
language sql
stable
security definer
set search_path = public
as $$
  with station_best as (
    select qa.player_id, q.station_id, max(qa.score) as best
    from public.quest_attempts qa
    join public.quests q on q.id = qa.quest_id
    where not qa.flagged and qa.scored and q.station_id is not null
    group by qa.player_id, q.station_id
  ),
  on_line as (
    select sb.player_id, sum(sb.best) as total_score
    from station_best sb
    join public.line_stations ls on ls.station_id = sb.station_id
    where ls.line_id = p_line_id
    group by sb.player_id
  )
  select o.player_id, p.display_name, o.total_score,
         rank() over (order by o.total_score desc) as rank
  from on_line o
  join public.players p on p.id = o.player_id
  where o.total_score > 0
  order by o.total_score desc
  limit greatest(1, least(p_limit, 100));
$$;

grant execute on function public.fn_line_leaderboard(uuid, int) to anon, authenticated;

comment on function public.fn_station_leaderboard(uuid, int) is
  'Classement par station (Chef de Station) : meilleur score COMPTÉ (présence validée) par joueur. DEC-012/DEC-015.';
comment on function public.fn_line_leaderboard(uuid, int) is
  'Classement par ligne (Maître de la Ligne) : Σ des meilleurs scores COMPTÉS par station de la ligne. DEC-012/DEC-015.';
