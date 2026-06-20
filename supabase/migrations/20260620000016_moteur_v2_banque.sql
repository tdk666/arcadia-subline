-- =============================================================================
-- ARCADIA SUBLINE — Migration 0016 : MOTEUR V2 (banque tiérée + seuils)
--
-- Passage du modèle « N questions fixes » au modèle « banque large, tirage
-- aléatoire, déblocage par SEUIL DE POINTS cumulés ». 100 % ADDITIF :
--   · le mode démolition (kind:'minigame') et la branche quiz historique
--     (success = tout correct) restent INCHANGÉS quand quests.points_threshold
--     est NULL — aucune quête existante n'est altérée.
--   · une quête « banque » est repérée par points_threshold NOT NULL.
--
-- Invariants conservés : fn_submit_attempt seule porte du score ; answer_key
-- jamais exposé ; security definer + search_path verrouillé ; progression
-- joueur strictement owner-scoped (RLS) ; écriture progression UNIQUEMENT
-- depuis fn_submit_attempt (security definer bypasse la RLS — aucune policy
-- write côté client).
-- Idempotent.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) SEUIL DE PROGRESSION par quête (NULL = quête non-banque, comportement 0012)
-- ---------------------------------------------------------------------------
alter table public.quests
  add column if not exists points_threshold int
  check (points_threshold is null or points_threshold > 0);

comment on column public.quests.points_threshold is
  'Banque V2 : points cumulés requis pour valider le palier (déblocage du suivant / mastery). NULL = quête non-banque (scoring 0012 inchangé).';

-- ---------------------------------------------------------------------------
-- 2) PROGRESSION JOUEUR PAR QUÊTE — points cumulés + items déjà réussis
-- ---------------------------------------------------------------------------
create table if not exists public.player_quest_progress (
  player_id       uuid not null references public.players(id) on delete cascade,
  quest_id        uuid not null references public.quests(id)  on delete cascade,
  points_total    int  not null default 0 check (points_total >= 0),
  -- slugs des items (payload.stepId) déjà RÉUSSIS : exclus des tirages futurs
  -- et jamais re-crédités (anti-farming naturel de la banque).
  passed_step_ids text[] not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (player_id, quest_id)
);
comment on table public.player_quest_progress is
  'Progression banque V2 par (joueur, quête) : points cumulés vers le seuil + items réussis (jamais rejoués). Écrite UNIQUEMENT par fn_submit_attempt (security definer).';

alter table public.player_quest_progress enable row level security;

-- Lecture owner-only. AUCUNE policy insert/update/delete → le client ne peut
-- jamais écrire ; seul fn_submit_attempt (security definer) écrit en bypass RLS.
drop policy if exists p_pqp_select_own on public.player_quest_progress;
create policy p_pqp_select_own on public.player_quest_progress
  for select to authenticated using (player_id = auth.uid());

create index if not exists idx_pqp_player on public.player_quest_progress (player_id);

-- updated_at automatique (réutilise le trigger générique 0003)
drop trigger if exists trg_touch_player_quest_progress on public.player_quest_progress;
create trigger trg_touch_player_quest_progress before update on public.player_quest_progress
  for each row execute function public.fn_touch_updated_at();

-- ---------------------------------------------------------------------------
-- 3) fn_submit_attempt v3 — branche BANQUE additive (v2), tout le reste = 0012
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
  -- branche banque (v2)
  v_banked        boolean;
  v_threshold     int;
  v_key           text;
  v_stepid        text;
  v_prog_points   int := 0;
  v_prog_passed   text[] := '{}';
  v_new_passed    text[] := '{}';
  v_total_points  int := 0;
  v_prev_diff     quest_difficulty;
  v_prev_points   int;
  v_prev_thresh   int;
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

  v_threshold := v_quest.points_threshold;
  v_banked    := v_threshold is not null;

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
  if not v_banked then
    -- 0012 inchangé : silver/gold exigent un SUCCÈS au palier précédent
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
  else
    -- v2 banque : silver/gold exigent que le SEUIL du palier précédent soit atteint
    if v_quest.difficulty in ('silver', 'gold') and v_quest.station_id is not null then
      v_prev_diff := (case v_quest.difficulty when 'silver' then 'bronze' else 'silver' end)::quest_difficulty;
      select pqp.points_total, q2.points_threshold
        into v_prev_points, v_prev_thresh
        from public.quests q2
        left join public.player_quest_progress pqp
          on pqp.quest_id = q2.id and pqp.player_id = v_player
       where q2.station_id = v_quest.station_id
         and q2.difficulty = v_prev_diff
       limit 1;
      if v_prev_thresh is null or coalesce(v_prev_points, 0) < v_prev_thresh then
        raise exception 'TIER_LOCKED'
          using hint = 'Atteindre le seuil de points du palier précédent avant de tenter celui-ci.';
      end if;
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_player::text || p_quest_id::text, 42));

  -- état de progression banque (avant la manche)
  if v_banked then
    select points_total, passed_step_ids
      into v_prog_points, v_prog_passed
      from public.player_quest_progress
     where player_id = v_player and quest_id = p_quest_id;
    v_prog_points := coalesce(v_prog_points, 0);
    v_prog_passed := coalesce(v_prog_passed, '{}');
  end if;

  -- ----- Notation serveur, étape par étape ------------------------------------
  for v_step in
    select id, payload, answer_key
      from public.quest_steps
     where quest_id = p_quest_id
     order by position
  loop
    -- clé d'appariement : slug de banque (payload.stepId) sinon id (démolition/0012)
    v_key   := coalesce(v_step.payload ->> 'stepId', v_step.id::text);
    v_given := p_answers -> v_key;
    v_kind  := v_step.payload ->> 'kind';

    -- banque : on ne note QUE les items effectivement tirés/soumis
    if v_banked and v_given is null then
      continue;
    end if;

    v_total := v_total + 1;

    if v_kind = 'minigame' then
      -- ======= BRANCHE MINI-JEU (démolition) — INCHANGÉE 0012 =======
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

      v_step_win := (v_targets = v_total_targets and v_pct >= v_min_pct);

      if v_step_win then
        v_correct := v_correct + 1;
        v_score := v_score + round(
          ( 600.0 * v_pct / 100.0
          + 80.0  * (v_max_shots - v_shots)
          + least(60.0, v_time_left_ms / 1000.0)
          ) * v_mult);
      else
        v_score := v_score + round(600.0 * v_pct / 100.0 * 0.25 * v_mult);
      end if;

    else
      -- ======= BRANCHE QUIZ (answer_key->'answer') =======
      v_points := coalesce((v_step.payload ->> 'points')::int, 10);
      if v_given is not null
         and v_given = coalesce(v_step.answer_key -> 'answer', v_step.answer_key) then
        v_correct := v_correct + 1;
        if v_banked then
          -- banque : on ne crédite QUE les items pas déjà réussis (anti-farming)
          v_stepid := v_step.payload ->> 'stepId';
          if v_stepid is not null and not (v_stepid = any(v_prog_passed)) then
            v_score      := v_score + v_points;
            v_new_passed := array_append(v_new_passed, v_stepid);
          end if;
        else
          v_score := v_score + v_points; -- 0012 inchangé
        end if;
      end if;
    end if;
  end loop;

  if v_total = 0 then
    raise exception 'QUEST_HAS_NO_STEPS';
  end if;

  -- ----- Anti-triche durée globale (0010, inchangé) ---------------------------
  begin
    v_min_step_ms := coalesce(nullif(current_setting('arcadia.min_step_duration_ms', true), '')::int, 300);
  exception when others then v_min_step_ms := 300; end;

  if p_duration_ms is not null and p_duration_ms < v_min_step_ms * v_total then
    v_flagged     := true;
    v_flag_reason := format('durée %s ms < seuil %s ms (%s étapes)',
                            p_duration_ms, v_min_step_ms * v_total, v_total);
  end if;
  if v_flagged then
    v_score := 0;
    v_new_passed := '{}';
  end if;

  -- ----- Succès + XP : modèle SEUIL (banque) ou TOUT-CORRECT (0012) -----------
  if v_banked then
    v_total_points := v_prog_points + v_score;            -- cumul across sessions
    v_success      := (not v_flagged) and (v_total_points >= v_threshold);
    v_xp_gained    := v_score;                            -- seuls les NOUVEAUX items paient
  else
    v_success := (v_correct = v_total) and not v_flagged;
    select coalesce(max(score), 0) into v_best_prev
      from public.quest_attempts
     where player_id = v_player and quest_id = p_quest_id and not flagged;
    v_xp_gained := greatest(0, v_score - v_best_prev);
  end if;

  -- ----- Journal immuable -----------------------------------------------------
  insert into public.quest_attempts
         (player_id, quest_id, season_id, score, success, duration_ms,
          answers, flagged, flag_reason)
  values (v_player, p_quest_id, v_quest.season_id, v_score, v_success,
          p_duration_ms, p_answers, v_flagged, v_flag_reason)
  returning id into v_attempt_id;

  -- ----- Propagation atomique (rien si flagged) -------------------------------
  if not v_flagged then

    -- progression banque : cumul + items réussis (jamais rejoués)
    if v_banked then
      insert into public.player_quest_progress as pqp
             (player_id, quest_id, points_total, passed_step_ids)
      values (v_player, p_quest_id, v_total_points,
              (select array(select distinct unnest(v_prog_passed || v_new_passed))))
      on conflict (player_id, quest_id) do update
         set points_total    = excluded.points_total,
             passed_step_ids  = excluded.passed_step_ids,
             updated_at       = now();
    end if;

    if v_quest.station_id is not null then
      if v_banked then
        -- mastery proportionnelle au seuil (plein palier une fois le seuil atteint)
        v_mastery := round(
          (case v_quest.difficulty when 'bronze' then 40 when 'silver' then 80 else 100 end)
          * least(1.0, v_total_points::numeric / nullif(v_threshold, 0)));
      elsif v_quest.difficulty is not null then
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

  -- ----- Résultat (jamais le corrigé, jamais les seuils bruts d'autres paliers) -
  return jsonb_build_object(
    'attempt_id',    v_attempt_id,
    'score',         v_score,
    'success',       v_success,
    'correct_steps', v_correct,
    'total_steps',   v_total,
    'xp_gained',     v_xp_gained,
    'mastery',       v_mastery,
    'flagged',       v_flagged,
    'points_total',  case when v_banked then v_total_points else null end,
    'points_threshold', v_threshold
  );
end;
$$;

comment on function public.fn_submit_attempt(uuid, jsonb, int) is
  'Unique porte du score (v3). Non-banque (points_threshold NULL) : comportement 0012 (démolition + quiz tout-correct) INCHANGÉ. Banque (threshold NOT NULL) : note les seuls items tirés/soumis, ne crédite jamais un item déjà réussi, cumule vers le seuil, gating par seuil du palier précédent.';

-- Les GRANT/REVOKE de 0010 restent valides (CREATE OR REPLACE conserve les ACL).

-- ---------------------------------------------------------------------------
-- 4) RPC lecture de progression (seuils = autorité serveur, jamais recalculés client)
-- ---------------------------------------------------------------------------
create or replace function public.fn_get_quest_progress(p_quest_ids uuid[])
returns table (
  quest_id         uuid,
  difficulty       quest_difficulty,
  points_total     int,
  points_threshold int,
  passed_step_ids  text[],
  unlocked         boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_player uuid := auth.uid();
begin
  if v_player is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  return query
  with q as (
    select id, station_id, difficulty, points_threshold
      from public.quests
     where id = any(p_quest_ids)
  ),
  prog as (
    select pqp.quest_id, pqp.points_total, pqp.passed_step_ids
      from public.player_quest_progress pqp
     where pqp.player_id = v_player and pqp.quest_id = any(p_quest_ids)
  )
  select
    q.id,
    q.difficulty,
    coalesce(p.points_total, 0)            as points_total,
    q.points_threshold,
    coalesce(p.passed_step_ids, '{}')      as passed_step_ids,
    case
      when q.difficulty is null or q.difficulty = 'bronze' then true
      when q.points_threshold is null then true  -- quête non-banque : géré ailleurs
      else exists (
        select 1
          from public.quests pq
          join public.player_quest_progress pp
            on pp.quest_id = pq.id and pp.player_id = v_player
         where pq.station_id = q.station_id
           and pq.difficulty = (case q.difficulty when 'silver' then 'bronze' else 'silver' end)::quest_difficulty
           and pp.points_total >= pq.points_threshold)
    end as unlocked
  from q
  left join prog p on p.quest_id = q.id;
end;
$$;

revoke all on function public.fn_get_quest_progress(uuid[]) from public, anon;
grant execute on function public.fn_get_quest_progress(uuid[]) to authenticated;

comment on function public.fn_get_quest_progress(uuid[]) is
  'Lecture owner-only de la progression banque (points cumulés, items réussis, déblocage). Les seuils et le calcul de déblocage sont SERVEUR — le client affiche, ne décide pas.';

-- ---------------------------------------------------------------------------
-- 5) STORAGE — bucket public en lecture pour les images de station
--    Rapatriement Commons → Storage par script séparé (cf. supabase/scripts).
--    Pas de hotlink Wikimedia en prod : payload.image.url pointera ce bucket.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('station-images', 'station-images', true)
on conflict (id) do update set public = true;

-- Lecture publique des objets du bucket (écriture = service_role uniquement).
drop policy if exists p_station_images_read on storage.objects;
create policy p_station_images_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'station-images');
