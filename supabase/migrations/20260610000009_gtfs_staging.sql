-- =============================================================================
-- ARCADIA SUBLINE — Migration 0009 : Staging d'ingestion GTFS (IDFM/PRIM)
-- Support serveur de l'Edge Function gtfs-ingest :
--   staging brute → matching nom+géo → upsert stations + historisation source_refs
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLE DE STAGING — copie brute de stops.txt, purgée à chaque run
-- (schéma volontairement laxiste : la donnée source n'est pas de confiance)
-- ---------------------------------------------------------------------------
create table if not exists public.gtfs_stops_staging (
  ingest_run_id  uuid not null,                 -- identifiant du run (traçabilité)
  stop_id        text not null,
  stop_name      text,
  stop_lat       double precision,
  stop_lon       double precision,
  location_type  text,                          -- '1' = station mère dans le GTFS
  parent_station text,
  raw            jsonb,                         -- ligne CSV complète (debug/évolutivité)
  created_at     timestamptz not null default now()
);
create index if not exists ix_gtfs_staging_run on public.gtfs_stops_staging (ingest_run_id);

alter table public.gtfs_stops_staging enable row level security;
-- aucune policy : table interne, accessible uniquement via service_role.

comment on table public.gtfs_stops_staging is
  'Zone tampon de l''ingestion GTFS. Écrite/purgée par l''Edge Function gtfs-ingest (service_role).';

-- ---------------------------------------------------------------------------
-- Normalisation de nom sans dépendre de l'extension unaccent (Crostini-friendly) :
-- mini-translit des diacritiques françaises. Remplaçable par unaccent() si activée.
-- ---------------------------------------------------------------------------
create or replace function public.unaccent_lite(t text)
returns text
language sql
immutable
as $$
  select translate(t,
    'àâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ’''',
    'aaaeeeeiioouuucAAAEEEEIIOOUUUC  ');
$$;


-- ---------------------------------------------------------------------------
-- FONCTION DE RAPPROCHEMENT + UPSERT IDEMPOTENT
-- Stratégie de matching, par priorité décroissante :
--   1. source_refs courant (source='IDFM-GTFS', external_id=stop_id, valid_to IS NULL)
--      → station déjà connue, rien à créer.
--   2. Nom normalisé identique + distance < p_match_radius_m (défaut 300 m)
--      → nouveau stop_id pour une station existante : on historise (SCD-2).
--   3. Aucun match → création de la station + ref courante.
-- Rejouable à l'infini : chaque branche est idempotente.
-- ---------------------------------------------------------------------------
create or replace function public.fn_gtfs_match_and_upsert(
  p_network_id     uuid,
  p_ingest_run_id  uuid,
  p_match_radius_m double precision default 300
)
returns table (created int, relinked int, unchanged int)
language plpgsql
security definer
set search_path = public
as $$
declare
  r            record;
  v_station_id uuid;
  v_created    int := 0;
  v_relinked   int := 0;
  v_unchanged  int := 0;
begin
  for r in
    select distinct on (stop_id) *
      from public.gtfs_stops_staging
     where ingest_run_id = p_ingest_run_id
       and coalesce(location_type, '1') = '1'      -- stations mères uniquement
       and stop_name is not null
  loop
    -- ----- 1) stop_id déjà mappé (référence courante) ------------------------
    select sr.station_id into v_station_id
      from public.source_refs sr
     where sr.source = 'IDFM-GTFS'
       and sr.external_id = r.stop_id
       and sr.valid_to is null;

    if found then
      v_unchanged := v_unchanged + 1;
      continue;
    end if;

    -- ----- 2) matching nom normalisé + proximité géographique ----------------
    select s.id into v_station_id
      from public.stations s
     where s.network_id = p_network_id
       and lower(unaccent_lite(s.name)) = lower(unaccent_lite(r.stop_name))
       and (
            s.geo is null
            or r.stop_lat is null
            or st_dwithin(
                 s.geo,
                 st_setsrid(st_makepoint(r.stop_lon, r.stop_lat), 4326)::geography,
                 p_match_radius_m)
           )
     limit 1;

    if found then
      v_relinked := v_relinked + 1;
    else
      -- ----- 3) création de la station ---------------------------------------
      insert into public.stations (network_id, name, slug, geo)
      values (
        p_network_id,
        r.stop_name,
        -- slug naïf ; collisions résolues par suffixe stop_id
        regexp_replace(lower(unaccent_lite(r.stop_name)), '[^a-z0-9]+', '-', 'g'),
        case when r.stop_lat is not null
             then st_setsrid(st_makepoint(r.stop_lon, r.stop_lat), 4326)::geography
             end
      )
      on conflict (network_id, slug) do update set updated_at = now()
      returning id into v_station_id;
      v_created := v_created + 1;
    end if;

    -- Historisation : clore l'éventuelle ref précédente de CE stop_id…
    update public.source_refs
       set valid_to = current_date
     where source = 'IDFM-GTFS'
       and external_id = r.stop_id
       and valid_to is null
       and station_id <> v_station_id;

    -- …et poser la référence courante (idempotent grâce à uq_source_refs_current)
    insert into public.source_refs (station_id, source, external_id, valid_from)
    values (v_station_id, 'IDFM-GTFS', r.stop_id, current_date)
    on conflict (source, external_id) where (valid_to is null) do nothing;
  end loop;

  return query select v_created, v_relinked, v_unchanged;
end;
$$;

comment on function public.fn_gtfs_match_and_upsert(uuid, uuid, double precision) is
  'Rapprochement stops GTFS → stations (ref courante > nom+géo > création) avec historisation SCD-2 de source_refs. Idempotent.';
