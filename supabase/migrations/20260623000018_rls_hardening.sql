-- =============================================================================
-- ARCADIA SUBLINE — Migration 0018 : Durcissement RLS (filet de sécurité)
--
-- CAUSE : alerte Supabase « rls_disabled_in_public » (22/06/2026). Diagnostic
-- (23/06) : la table signalée est **public.spatial_ref_sys** — table SYSTÈME de
-- l'extension PostGIS (définitions de systèmes de référence spatiale / EPSG).
-- C'est un FAUX POSITIF classique de l'Advisor sur les projets PostGIS :
--   · données de RÉFÉRENCE publiques (aucune donnée Arcadia) ;
--   · possédée par l'extension/`supabase_admin` → on n'en est PAS propriétaire,
--     impossible d'y activer la RLS (ERROR 42501 « must be owner ») ;
--   · non modifiable par un client (insert/update/delete nécessitent ownership).
-- Toutes les VRAIES tables Arcadia ont déjà la RLS (0007/0014/0016/0009).
--
-- CE FILET (idempotent, sans erreur) : active la RLS (deny-by-default) sur toute
-- table de base de `public` qui ne l'a pas ET qu'on possède — i.e. une éventuelle
-- table créée à la main hors migrations (dette DEC-003). Exclut explicitement les
-- tables possédées par une EXTENSION (PostGIS) et avale insufficient_privilege.
--   · service_role bypasse la RLS → ingestion / Edge / fn_submit_attempt OK ;
--   · les tables à lecture client ont déjà leurs policies ;
--   · fermer une table inconnue par défaut = choix sûr, jamais une fuite.
-- =============================================================================

do $$
declare r record;
begin
  for r in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind = 'r'                 -- tables de base uniquement
       and not c.relrowsecurity
       -- exclure les tables possédées par une EXTENSION (PostGIS spatial_ref_sys…)
       and not exists (
         select 1 from pg_depend d
          where d.classid = 'pg_class'::regclass
            and d.objid   = c.oid
            and d.deptype = 'e')
  loop
    begin
      execute format('alter table public.%I enable row level security;', r.relname);
      raise notice 'RLS activée (filet 0018) sur public.%', r.relname;
    exception
      when insufficient_privilege then
        raise notice 'RLS ignorée (non-propriétaire / table système) sur public.%', r.relname;
    end;
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- DIAGNOSTIC (lister ce qui reste sans RLS, hors tables d'extension) :
--
--   select c.relname as "table", c.relrowsecurity as rls_on
--     from pg_class c
--     join pg_namespace n on n.oid = c.relnamespace
--    where n.nspname = 'public' and c.relkind = 'r'
--      and not exists (select 1 from pg_depend d
--                       where d.classid='pg_class'::regclass and d.objid=c.oid and d.deptype='e')
--    order by c.relrowsecurity, c.relname;
--
-- spatial_ref_sys (PostGIS) restera `false` et c'est ATTENDU (faux positif).
-- -----------------------------------------------------------------------------
