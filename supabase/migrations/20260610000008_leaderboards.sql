-- =============================================================================
-- ARCADIA SUBLINE — Migration 0008 : Leaderboards (vues matérialisées)
-- L'entité ERD "leaderboard_entries" est implémentée comme matview unifiée
-- (UNION des scopes global / line / season) + fonction de refresh + pg_cron.
-- Avantage : zéro écriture transactionnelle au moment du jeu (async-first),
-- coût de lecture O(index), fraîcheur pilotée par le cron (5 min).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- MATVIEW UNIFIÉE leaderboard_entries
--   · global : classement par xp_total (players)
--   · line   : classement par line_score (player_line_progress)
--   · season : somme des scores de quest_attempts par saison
-- id déterministe (md5→uuid) pour permettre l'index unique requis par
-- REFRESH MATERIALIZED VIEW CONCURRENTLY (lecture jamais bloquée).
-- ---------------------------------------------------------------------------
drop materialized view if exists public.leaderboard_entries;

create materialized view public.leaderboard_entries as
-- ----- SCOPE GLOBAL ----------------------------------------------------------
select
  md5('global' || p.id::text)::uuid              as id,
  p.id                                           as player_id,
  p.display_name                                 as display_name,   -- dénormalisé pour l'UI
  'global'::leaderboard_scope                    as scope,
  null::uuid                                     as line_id,
  null::uuid                                     as season_id,
  p.xp_total                                     as score,
  rank() over (order by p.xp_total desc)         as rank,
  now()                                          as updated_at
from public.players p
where p.xp_total > 0

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
group by qa.player_id, qa.season_id, p.display_name;

-- Index unique : prérequis du REFRESH ... CONCURRENTLY
create unique index if not exists uq_leaderboard_entries_id
  on public.leaderboard_entries (id);

-- Index de lecture : "top N de ma ligne / de la saison / global"
create index if not exists ix_leaderboard_scope_line_rank
  on public.leaderboard_entries (scope, line_id, rank);
create index if not exists ix_leaderboard_scope_season_rank
  on public.leaderboard_entries (scope, season_id, rank);
create index if not exists ix_leaderboard_player
  on public.leaderboard_entries (player_id);

-- NB RLS : les matviews ne supportent pas RLS. On expose uniquement des données
-- non sensibles (display_name + scores) et on contrôle l'accès par GRANT.
grant select on public.leaderboard_entries to anon, authenticated;

comment on materialized view public.leaderboard_entries is
  'Classements global/line/season. Rafraîchie par pg_cron (fn_refresh_leaderboards), jamais écrite en transactionnel.';

-- ---------------------------------------------------------------------------
-- FONCTION DE REFRESH (+ recalcul du rank_cache dénormalisé des lignes)
-- ---------------------------------------------------------------------------
create or replace function public.fn_refresh_leaderboards()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- CONCURRENTLY : les lectures clients ne sont jamais bloquées pendant le refresh
  refresh materialized view concurrently public.leaderboard_entries;

  -- Synchronisation du cache de rang par ligne (UI hors-ligne / push notifs)
  update public.player_line_progress plp
     set rank_cache = le.rank
    from public.leaderboard_entries le
   where le.scope = 'line'
     and le.player_id = plp.player_id
     and le.line_id   = plp.line_id
     and plp.rank_cache is distinct from le.rank;
end;
$$;

comment on function public.fn_refresh_leaderboards() is
  'Refresh CONCURRENTLY de leaderboard_entries + maj de player_line_progress.rank_cache.';

-- ---------------------------------------------------------------------------
-- PLANIFICATION pg_cron — toutes les 5 minutes (idempotent : unschedule avant)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Supprime un éventuel job existant du même nom avant de replanifier
    perform cron.unschedule(jobid)
      from cron.job
     where jobname = 'arcadia_refresh_leaderboards';

    perform cron.schedule(
      'arcadia_refresh_leaderboards',
      '*/5 * * * *',
      $cron$ select public.fn_refresh_leaderboards(); $cron$
    );
  else
    raise notice 'pg_cron absent : planifier fn_refresh_leaderboards() manuellement.';
  end if;
end $$;
