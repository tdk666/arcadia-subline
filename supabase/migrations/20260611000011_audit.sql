-- =============================================================================
-- ARCADIA SUBLINE — Migration 0011 : PASSE D'AUDIT
--
-- Corrections issues de la relecture des migrations 0001→0010 :
--   A. quest_steps.payload : interdire toute clé "solution" dans la partie
--      visible du client (seul answer_key, masqué, porte le corrigé).
--   B. Vue quest_steps_public : re-création avec barrière de sécurité
--      explicite + re-vérification qu'answer_key est exclu.
--   C. Fonctions sensibles : EXECUTE révoqué pour anon/authenticated
--      (fn_gtfs_match_and_upsert, fn_refresh_leaderboards, triggers).
--   D. Leaderboard : exclusion des joueurs dont les tentatives récentes sont
--      majoritairement signalées (flagged) ;
--      vérification de l'index unique requis par REFRESH CONCURRENTLY.
--   E. Staging GTFS : privilèges révoqués (service_role only, même si une
--      policy permissive apparaissait par erreur).
--   F. check_ins : pas d'UPDATE/DELETE client (un check-in ne s'efface pas).
-- Idempotent / rollback-safe.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A) ANTI-FUITE : payload (visible client) ne doit JAMAIS contenir le corrigé.
--    Contrainte CHECK sur les clés interdites au premier niveau + trigger de
--    défense en profondeur qui inspecte récursivement le JSONB.
-- ---------------------------------------------------------------------------
alter table public.quest_steps
  drop constraint if exists ck_quest_steps_payload_no_answer;
alter table public.quest_steps
  add constraint ck_quest_steps_payload_no_answer
  check (not (payload ?| array['answer', 'answers', 'answer_key', 'solution', 'correct', 'correct_answer']));

create or replace function public.fn_jsonb_has_forbidden_key(p jsonb)
returns boolean
language sql
immutable
as $$
  -- Parcours récursif : true si une clé "corrigé" apparaît à n'importe quelle
  -- profondeur du document (objets imbriqués et tableaux compris).
  with recursive walk(node) as (
    select p
    union all
    select case when jsonb_typeof(node) = 'object' then v.value
                when jsonb_typeof(node) = 'array'  then e.elem
           end
      from walk
      left join lateral jsonb_each(case when jsonb_typeof(node) = 'object' then node end) v on true
      left join lateral jsonb_array_elements(case when jsonb_typeof(node) = 'array' then node end) e(elem) on true
     where jsonb_typeof(node) in ('object', 'array')
  )
  select exists (
    select 1 from walk
     where jsonb_typeof(node) = 'object'
       and node ?| array['answer', 'answers', 'answer_key', 'solution', 'correct', 'correct_answer']
  );
$$;

create or replace function public.fn_quest_steps_payload_guard()
returns trigger
language plpgsql
as $$
begin
  if public.fn_jsonb_has_forbidden_key(new.payload) then
    raise exception 'PAYLOAD_LEAK: le payload client contient une clé de corrigé (answer/solution/correct…). Utiliser answer_key.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_quest_steps_payload_guard on public.quest_steps;
create trigger trg_quest_steps_payload_guard
  before insert or update of payload on public.quest_steps
  for each row execute function public.fn_quest_steps_payload_guard();

-- ---------------------------------------------------------------------------
-- B) Vue projetée : re-création explicite (idempotente) SANS answer_key,
--    avec security_barrier pour empêcher les fuites par fonctions "leaky".
-- ---------------------------------------------------------------------------
create or replace view public.quest_steps_public
with (security_invoker = false, security_barrier = true)
as
  select id, quest_id, position, prompt, payload
    from public.quest_steps;        -- answer_key volontairement exclu

grant select on public.quest_steps_public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- C) Durcissement des fonctions : seules les surfaces voulues sont exposées.
-- ---------------------------------------------------------------------------
revoke all on function public.fn_gtfs_match_and_upsert(uuid, uuid, double precision)
  from public, anon, authenticated;            -- ingestion = service_role only
revoke all on function public.fn_refresh_leaderboards()
  from public, anon, authenticated;            -- refresh = pg_cron/service_role
revoke all on function public.fn_enforce_checkin_cooldown()
  from public, anon, authenticated;
revoke all on function public.fn_touch_updated_at()
  from public, anon, authenticated;
revoke all on function public.fn_jsonb_has_forbidden_key(jsonb)
  from public, anon;                           -- lecture seule, sans secret : ok authenticated

-- ---------------------------------------------------------------------------
-- D) LEADERBOARD : on écarte les joueurs dont les tentatives récentes sont
--    majoritairement signalées (anti-pollution du classement), et on
--    re-vérifie l'index unique exigé par REFRESH CONCURRENTLY.
-- ---------------------------------------------------------------------------
drop materialized view if exists public.leaderboard_entries;

create materialized view public.leaderboard_entries as
with suspicious as (
  -- Joueurs "toxiques" : > 50 % de tentatives flaggées sur les 7 derniers jours
  -- (au moins 5 tentatives pour éviter de bannir sur un faux positif isolé)
  select player_id
    from public.quest_attempts
   where created_at > now() - interval '7 days'
   group by player_id
  having count(*) >= 5
     and avg(case when flagged then 1.0 else 0.0 end) > 0.5
)
-- ----- SCOPE GLOBAL ----------------------------------------------------------
select
  md5('global' || p.id::text)::uuid              as id,
  p.id                                           as player_id,
  p.display_name                                 as display_name,
  'global'::leaderboard_scope                    as scope,
  null::uuid                                     as line_id,
  null::uuid                                     as season_id,
  p.xp_total                                     as score,
  rank() over (order by p.xp_total desc)         as rank,
  now()                                          as updated_at
from public.players p
where p.xp_total > 0
  and p.id not in (select player_id from suspicious)

union all
-- ----- SCOPE LINE ("conquiers ta ligne") --------------------------------------
select
  md5('line' || plp.player_id::text || plp.line_id::text)::uuid,
  plp.player_id,
  p.display_name,
  'line'::leaderboard_scope,
  plp.line_id,
  null::uuid,
  plp.line_score,
  rank() over (partition by plp.line_id order by plp.line_score desc),
  now()
from public.player_line_progress plp
join public.players p on p.id = plp.player_id
where plp.line_score > 0
  and plp.player_id not in (select player_id from suspicious)

union all
-- ----- SCOPE SEASON ------------------------------------------------------------
select
  md5('season' || qa.player_id::text || qa.season_id::text)::uuid,
  qa.player_id,
  p.display_name,
  'season'::leaderboard_scope,
  null::uuid,
  qa.season_id,
  sum(qa.score)::int,
  rank() over (partition by qa.season_id order by sum(qa.score) desc),
  now()
from public.quest_attempts qa
join public.players p on p.id = qa.player_id
where qa.season_id is not null
  and not qa.flagged                              -- les tentatives signalées ne comptent pas
  and qa.player_id not in (select player_id from suspicious)
group by qa.player_id, qa.season_id, p.display_name;

-- Index unique : PRÉREQUIS de REFRESH MATERIALIZED VIEW CONCURRENTLY
create unique index if not exists uq_leaderboard_entries_id
  on public.leaderboard_entries (id);
create index if not exists ix_leaderboard_scope_line_rank
  on public.leaderboard_entries (scope, line_id, rank);
create index if not exists ix_leaderboard_scope_season_rank
  on public.leaderboard_entries (scope, season_id, rank);
create index if not exists ix_leaderboard_player
  on public.leaderboard_entries (player_id);

-- Matview ⇒ pas de RLS possible : on n'y expose QUE du non-sensible
-- (display_name + scores agrégés), accès contrôlé par GRANT.
grant select on public.leaderboard_entries to anon, authenticated;

comment on materialized view public.leaderboard_entries is
  'Classements global/line/season. Exclut tentatives flaggées et joueurs majoritairement signalés (7 j). Refresh pg_cron via fn_refresh_leaderboards().';

-- ---------------------------------------------------------------------------
-- E) STAGING GTFS : aucun privilège client, même théorique.
-- ---------------------------------------------------------------------------
revoke all on public.gtfs_stops_staging from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- F) CHECK_INS : un check-in ne se modifie ni ne s'efface côté client
--    (le cooldown serait contournable en supprimant l'historique).
-- ---------------------------------------------------------------------------
revoke update, delete on public.check_ins from anon, authenticated;
