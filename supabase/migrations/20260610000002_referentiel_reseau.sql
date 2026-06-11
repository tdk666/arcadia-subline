-- =============================================================================
-- ARCADIA SUBLINE — Migration 0002 : Référentiel réseau (multi-villes ready)
-- networks · lines · stations · line_stations · source_refs
-- =============================================================================

-- ---------------------------------------------------------------------------
-- NETWORKS — dimension racine multi-villes (Paris/IDFM aujourd'hui, TfL demain)
-- ---------------------------------------------------------------------------
create table if not exists public.networks (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,                    -- ex: "Île-de-France Mobilités"
  city        text not null,                    -- ex: "Paris"
  country     text not null,                    -- ISO ou libellé, ex: "FR"
  timezone    text not null default 'Europe/Paris', -- IANA tz (saisons/cooldowns locaux)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (name, city)
);
comment on table public.networks is 'Réseau de transport exploité (1 ligne = 1 ville/AOM). Dimension multi-villes.';

-- ---------------------------------------------------------------------------
-- LINES — lignes du réseau (M1..M14, RER, Tram)
-- ---------------------------------------------------------------------------
create table if not exists public.lines (
  id          uuid primary key default gen_random_uuid(),
  network_id  uuid not null references public.networks(id) on delete cascade,
  code        text not null,                    -- ex: "M1", "RER A"
  name        text not null,                    -- ex: "La Défense — Château de Vincennes"
  color       text not null default '#888888',  -- hex officiel de la ligne (UI)
  mode        text not null default 'metro'
              check (mode in ('metro', 'rer', 'tram')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (network_id, code)
);
comment on table public.lines is 'Lignes exploitées par un réseau. code unique par réseau.';

-- ---------------------------------------------------------------------------
-- STATIONS — l'unité de jeu fondamentale. geo nullable = location-optional.
-- ---------------------------------------------------------------------------
create table if not exists public.stations (
  id          uuid primary key default gen_random_uuid(),
  network_id  uuid not null references public.networks(id) on delete cascade,
  name        text not null,                    -- ex: "Bastille"
  slug        text not null,                    -- ex: "bastille" (URL / deep-links)
  geo         geography(Point, 4326),           -- nullable : le jeu fonctionne sans géoloc
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (network_id, slug)
);
comment on table public.stations is 'Stations physiques. geo nullable (architecture location-optional).';
comment on column public.stations.geo is 'Point WGS84 issu du GTFS IDFM/PRIM. Sert au matching d''ingestion et au check-in geo.';

-- ---------------------------------------------------------------------------
-- LINE_STATIONS — ordonnancement des stations sur une ligne (topologie du plateau)
-- ---------------------------------------------------------------------------
create table if not exists public.line_stations (
  id          uuid primary key default gen_random_uuid(),
  line_id     uuid not null references public.lines(id) on delete cascade,
  station_id  uuid not null references public.stations(id) on delete cascade,
  position    int  not null check (position >= 0), -- ordre sur la ligne
  created_at  timestamptz not null default now(),
  unique (line_id, station_id),                 -- une station apparaît 1 fois par ligne
  unique (line_id, position)                    -- pas deux stations au même rang
);
comment on table public.line_stations is 'Table de jointure ordonnée ligne↔station. Base de la "conquête de ligne".';

-- ---------------------------------------------------------------------------
-- SOURCE_REFS — historisation des identifiants externes (stop_id GTFS)
-- Pattern SCD-2 léger : valid_to NULL = référence courante.
-- ---------------------------------------------------------------------------
create table if not exists public.source_refs (
  id           uuid primary key default gen_random_uuid(),
  station_id   uuid not null references public.stations(id) on delete cascade,
  source       text not null default 'IDFM-GTFS',  -- système source
  external_id  text not null,                      -- stop_id GTFS
  valid_from   date not null default current_date,
  valid_to     date,                               -- NULL = courant
  created_at   timestamptz not null default now(),
  check (valid_to is null or valid_to >= valid_from)
);
comment on table public.source_refs is
  'Mapping historisé station ↔ identifiants externes (stop_id GTFS). Permet de survivre aux refontes du référentiel IDFM.';

-- Un seul mapping COURANT par (source, external_id) : index unique partiel
create unique index if not exists uq_source_refs_current
  on public.source_refs (source, external_id)
  where valid_to is null;

-- ---------------------------------------------------------------------------
-- Triggers updated_at
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['networks','lines','stations'] loop
    execute format(
      'drop trigger if exists trg_touch_%1$s on public.%1$s;
       create trigger trg_touch_%1$s before update on public.%1$s
       for each row execute function public.fn_touch_updated_at();', t);
  end loop;
end $$;
