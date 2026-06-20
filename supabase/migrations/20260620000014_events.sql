-- =============================================================================
-- ARCADIA SUBLINE — Migration 0014 : télémétrie produit (events) — sink serveur
-- Objectif : pouvoir mesurer la rétention J1/J7 et le funnel. L'app pose déjà
-- des events (analytics.ts) ; cette table en est le réceptacle.
-- Doctrine : insert-only côté client, AUCUNE lecture client (analyse = service_role).
-- Pas de PII dans props. Compromis MVP : insert anon ouvert (petit vecteur de
-- spam, insert-only, sans lecture) — on rate-limitera plus tard si besoin.
-- Idempotent.
-- =============================================================================

create table if not exists public.events (
  id         uuid primary key default gen_random_uuid(),
  player_id  uuid references public.players(id) on delete set null,  -- si connecté
  anon_id    text,                                                    -- sinon (cohorte invité)
  name       text not null,
  props      jsonb not null default '{}'::jsonb,
  client_ts  timestamptz,
  server_ts  timestamptz not null default now()
);

comment on table public.events is
  'Télémétrie produit (funnel/rétention). Insert-only client ; lecture service_role uniquement. Pas de PII dans props.';

alter table public.events enable row level security;

-- insert-only pour anon (invités) ET authenticated. Aucune policy SELECT/UPDATE/
-- DELETE → le client ne peut jamais relire/altérer les events.
drop policy if exists p_events_insert on public.events;
create policy p_events_insert on public.events
  for insert to anon, authenticated
  with check (true);

create index if not exists idx_events_name_ts   on public.events (name, server_ts);
create index if not exists idx_events_player_ts on public.events (player_id, server_ts);

-- ---------------------------------------------------------------------------
-- RÉTENTION J1 (exemple d'analyse — à lancer en SQL service_role) :
--   % des uid (player_id sinon anon_id) ayant un first_play à J0 ET un
--   événement quelconque le lendemain (J0+1).
-- ---------------------------------------------------------------------------
-- with first_play as (
--   select coalesce(player_id::text, anon_id) as uid, min(server_ts)::date as d0
--   from public.events where name = 'first_play'
--   group by 1
-- ),
-- activity as (
--   select coalesce(player_id::text, anon_id) as uid, server_ts::date as d
--   from public.events
-- )
-- select f.d0 as cohorte_jour,
--        count(distinct f.uid) as nouveaux,
--        count(distinct a.uid) filter (where a.d = f.d0 + 1) as revenus_j1,
--        round(100.0 * count(distinct a.uid) filter (where a.d = f.d0 + 1)
--              / nullif(count(distinct f.uid), 0), 1) as retention_j1_pct
-- from first_play f
-- left join activity a on a.uid = f.uid
-- group by f.d0
-- order by f.d0;
