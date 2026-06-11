-- =============================================================================
-- ARCADIA SUBLINE — Migration 0001 : Extensions & Types énumérés
-- Idempotent / rollback-safe. Toutes les migrations supposent Postgres 15+.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------------
-- pgcrypto : gen_random_uuid() (natif en PG15 mais on sécurise les environnements)
create extension if not exists pgcrypto;

-- PostGIS : stations.geo geography(Point,4326) + index GiST + matching géo GTFS
create extension if not exists postgis;

-- pg_cron : rafraîchissement périodique des leaderboards (matviews)
-- NB : sur Supabase, activer pg_cron via Dashboard > Database > Extensions
create extension if not exists pg_cron;

-- ---------------------------------------------------------------------------
-- ENUMS (création idempotente : on ignore duplicate_object)
-- ---------------------------------------------------------------------------

-- Cycle de vie éditorial du contenu de station (pipeline GenAI -> curation humaine)
do $$ begin
  create type content_status as enum ('draft', 'curated', 'published');
exception when duplicate_object then null; end $$;

-- Nature des quêtes (knowledge = quiz, exploration = terrain, sponsored = marque)
do $$ begin
  create type quest_type as enum ('knowledge', 'exploration', 'sponsored');
exception when duplicate_object then null; end $$;

-- Progression du joueur sur une station
do $$ begin
  create type progress_state as enum ('discovered', 'visited', 'mastered');
exception when duplicate_object then null; end $$;

-- Méthode de validation de présence (location-optional : geo n'est PAS obligatoire)
do $$ begin
  create type checkin_method as enum ('geo', 'manual', 'qr');
exception when duplicate_object then null; end $$;

-- Portée des classements
do $$ begin
  create type leaderboard_scope as enum ('global', 'line', 'season');
exception when duplicate_object then null; end $$;

-- Statut des achats Battle Pass (réconciliation Stripe/RevenueCat asynchrone)
do $$ begin
  create type purchase_status as enum ('pending', 'active', 'refunded');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- FONCTION UTILITAIRE : maj automatique de updated_at (audit)
-- ---------------------------------------------------------------------------
create or replace function public.fn_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.fn_touch_updated_at() is
  'Trigger générique : horodate updated_at à chaque UPDATE (colonnes d''audit).';
