-- =============================================================================
-- ARCADIA SUBLINE — Migration 0018 : Durcissement RLS (filet de sécurité)
--
-- CAUSE : alerte Supabase « rls_disabled_in_public » (22/06/2026) — une table du
-- schéma `public` est exposée via l'API PostgREST SANS Row-Level Security.
-- Le dépôt active pourtant la RLS sur TOUTES ses tables (0007 boucle + events 0014
-- + player_quest_progress 0016 + gtfs_stops_staging 0009). La table fautive a donc
-- été créée HORS migrations (SQL Editor à la main — cf. DEC-003).
--
-- CE FILET : active la RLS (deny-by-default) sur TOUTE table de base de `public`
-- qui ne l'a pas encore. SÛR par construction :
--   · service_role bypasse la RLS → ingestion / Edge / fn_submit_attempt (security
--     definer) continuent d'écrire normalement ;
--   · les tables à lecture client ont DÉJÀ leurs policies (0007/0014/0016) ;
--   · activer la RLS sur une table non couverte = la FERMER par défaut (choix sûr),
--     jamais une fuite. Si une telle table devait être lue côté client, on ajoutera
--     une policy explicite une fois son nom connu (Advisor / get_advisors).
-- Idempotent : ne touche que les tables dont relrowsecurity = false.
--
-- NB MATVIEW : `public.leaderboard_entries` est une vue matérialisée exposée à
-- anon/authenticated (données non sensibles : display_name + scores). Les matviews
-- ne supportent pas la RLS ; si l'Advisor la signale aussi, le correctif propre est
-- de la sortir de l'API (RPC security definer + REVOKE) — changement applicatif
-- traité séparément, hors de ce filet.
-- =============================================================================

do $$
declare r record;
begin
  for r in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind = 'r'          -- tables de base uniquement (ni vues ni matviews)
       and not c.relrowsecurity
  loop
    execute format('alter table public.%I enable row level security;', r.relname);
    raise notice 'RLS activée (filet 0018) sur public.%', r.relname;
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- DIAGNOSTIC (à exécuter manuellement si besoin d'identifier la/les table(s)) :
--
--   select n.nspname as schema, c.relname as table, c.relrowsecurity as rls_on
--     from pg_class c
--     join pg_namespace n on n.oid = c.relnamespace
--    where n.nspname = 'public' and c.relkind = 'r'
--    order by c.relrowsecurity, c.relname;
--
-- Toute ligne avec rls_on = false APRÈS cette migration = anomalie à investiguer.
-- -----------------------------------------------------------------------------
