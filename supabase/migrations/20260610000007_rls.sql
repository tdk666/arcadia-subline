-- =============================================================================
-- ARCADIA SUBLINE — Migration 0007 : Row Level Security
-- Doctrine :
--   · Référentiel & contenu  → lecture publique (anon + authenticated),
--                              écriture exclusivement service_role (bypass RLS).
--   · Progression / achats / check-ins → owner-only via auth.uid().
--   · quest_steps.answer_key → JAMAIS lisible côté client (table masquée,
--     exposition via vue filtrée quest_steps_public).
-- Idempotent : drop policy if exists avant chaque create policy.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Activation RLS sur TOUTES les tables (deny-by-default)
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'networks','lines','stations','line_stations','source_refs',
    'seasons','sponsors','station_content','quests','quest_steps',
    'players','player_station_progress','player_line_progress',
    'quest_attempts','check_ins','battle_passes','pass_purchases'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

-- =============================================================================
-- 1) RÉFÉRENTIEL — lecture publique intégrale
-- =============================================================================
do $$
declare t text;
begin
  foreach t in array array['networks','lines','stations','line_stations','seasons','battle_passes'] loop
    execute format('drop policy if exists p_%1$s_read_all on public.%1$s;', t);
    execute format(
      'create policy p_%1$s_read_all on public.%1$s
         for select to anon, authenticated using (true);', t);
  end loop;
end $$;
-- Aucune policy INSERT/UPDATE/DELETE : seules les clés service_role (qui
-- contournent RLS) peuvent écrire le référentiel (ingestion GTFS, back-office).

-- source_refs : détail d'ingestion, inutile côté client → aucune policy (service_role only)
-- sponsors    : données commerciales B2B → aucune policy (service_role only)

-- =============================================================================
-- 2) CONTENU — seul le contenu PUBLIÉ est visible du public
-- =============================================================================
drop policy if exists p_station_content_read_published on public.station_content;
create policy p_station_content_read_published on public.station_content
  for select to anon, authenticated
  using (status = 'published');
-- drafts/curated restent invisibles : le back-office de curation passe par service_role.

-- Quêtes : lecture publique (le ciblage saison/sponsor actif relève de l'applicatif)
drop policy if exists p_quests_read_all on public.quests;
create policy p_quests_read_all on public.quests
  for select to anon, authenticated using (true);

-- quest_steps : AUCUNE policy SELECT → answer_key inaccessible aux clients.
-- L'app lit les étapes via la vue filtrée ci-dessous ; la validation des
-- réponses se fait côté serveur (Edge Function avec service_role).
create or replace view public.quest_steps_public
with (security_invoker = false)  -- la vue lit la table avec les droits du créateur
as
  select id, quest_id, position, prompt, payload
    from public.quest_steps;     -- answer_key volontairement exclu

grant select on public.quest_steps_public to anon, authenticated;
comment on view public.quest_steps_public is
  'Projection client de quest_steps SANS answer_key. Seule surface de lecture autorisée.';

-- =============================================================================
-- 3) JOUEURS & PROGRESSION — owner-only via auth.uid()
-- =============================================================================

-- players : chacun lit/édite SON profil ; insert de son propre id à l'onboarding
drop policy if exists p_players_select_own on public.players;
create policy p_players_select_own on public.players
  for select to authenticated using (id = auth.uid());

drop policy if exists p_players_insert_own on public.players;
create policy p_players_insert_own on public.players
  for insert to authenticated with check (id = auth.uid());

drop policy if exists p_players_update_own on public.players;
create policy p_players_update_own on public.players
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- NB : xp_total/streak_count sont recalculés par le serveur ; si besoin de durcir,
-- déplacer ces colonnes vers une table séparée service_role-only ou poser un trigger
-- interdisant leur modification quand current_setting('request.jwt.claims') ≠ service.

-- player_station_progress : owner-only (lecture + upsert)
drop policy if exists p_psp_select_own on public.player_station_progress;
create policy p_psp_select_own on public.player_station_progress
  for select to authenticated using (player_id = auth.uid());

drop policy if exists p_psp_insert_own on public.player_station_progress;
create policy p_psp_insert_own on public.player_station_progress
  for insert to authenticated with check (player_id = auth.uid());

drop policy if exists p_psp_update_own on public.player_station_progress;
create policy p_psp_update_own on public.player_station_progress
  for update to authenticated
  using (player_id = auth.uid()) with check (player_id = auth.uid());

-- player_line_progress : owner-only (mêmes règles)
drop policy if exists p_plp_select_own on public.player_line_progress;
create policy p_plp_select_own on public.player_line_progress
  for select to authenticated using (player_id = auth.uid());

drop policy if exists p_plp_insert_own on public.player_line_progress;
create policy p_plp_insert_own on public.player_line_progress
  for insert to authenticated with check (player_id = auth.uid());

drop policy if exists p_plp_update_own on public.player_line_progress;
create policy p_plp_update_own on public.player_line_progress
  for update to authenticated
  using (player_id = auth.uid()) with check (player_id = auth.uid());

-- quest_attempts : journal IMMUABLE côté joueur → select + insert uniquement
drop policy if exists p_qa_select_own on public.quest_attempts;
create policy p_qa_select_own on public.quest_attempts
  for select to authenticated using (player_id = auth.uid());

drop policy if exists p_qa_insert_own on public.quest_attempts;
create policy p_qa_insert_own on public.quest_attempts
  for insert to authenticated with check (player_id = auth.uid());
-- pas d'UPDATE/DELETE : on ne réécrit pas l'historique (anti-triche).

-- check_ins : select + insert owner-only (le cooldown est appliqué par trigger)
drop policy if exists p_ci_select_own on public.check_ins;
create policy p_ci_select_own on public.check_ins
  for select to authenticated using (player_id = auth.uid());

drop policy if exists p_ci_insert_own on public.check_ins;
create policy p_ci_insert_own on public.check_ins
  for insert to authenticated with check (player_id = auth.uid());

-- =============================================================================
-- 4) ACHATS — lecture owner-only ; écriture exclusivement webhooks (service_role)
-- =============================================================================
drop policy if exists p_pp_select_own on public.pass_purchases;
create policy p_pp_select_own on public.pass_purchases
  for select to authenticated using (player_id = auth.uid());
-- Aucune policy INSERT/UPDATE : seuls les webhooks Stripe/RevenueCat (service_role)
-- créent et font évoluer les achats (pending → active → refunded).
