-- =============================================================================
-- ARCADIA SUBLINE — Migration 0006 : Index
-- GiST géo · b-tree FK · colonnes de tri leaderboard · index de cooldown
-- (les unique(player_id, station_id) / unique(player_id, line_id) sont déjà
--  créés en tant que contraintes dans la migration 0004)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- GÉO : matching d'ingestion GTFS (ST_DWithin) + check-in geo de surface
-- ---------------------------------------------------------------------------
create index if not exists ix_stations_geo_gist
  on public.stations using gist (geo);

-- ---------------------------------------------------------------------------
-- RÉFÉRENTIEL : FK + parcours topologique de ligne
-- ---------------------------------------------------------------------------
create index if not exists ix_lines_network          on public.lines (network_id);
create index if not exists ix_stations_network       on public.stations (network_id);
create index if not exists ix_line_stations_line_pos on public.line_stations (line_id, position);
create index if not exists ix_line_stations_station  on public.line_stations (station_id);
create index if not exists ix_source_refs_station    on public.source_refs (station_id);

-- ---------------------------------------------------------------------------
-- CONTENU & QUÊTES : lookups d'écran ("contenu publié de cette station")
-- ---------------------------------------------------------------------------
create index if not exists ix_station_content_station_status
  on public.station_content (station_id, status);
create index if not exists ix_quests_station  on public.quests (station_id) where station_id is not null;
create index if not exists ix_quests_line     on public.quests (line_id)    where line_id    is not null;
create index if not exists ix_quests_season   on public.quests (season_id)  where season_id  is not null;
create index if not exists ix_quests_sponsor  on public.quests (sponsor_id) where sponsor_id is not null;
create index if not exists ix_quest_steps_quest_pos on public.quest_steps (quest_id, position);
create index if not exists ix_seasons_network_active on public.seasons (network_id, is_active);

-- ---------------------------------------------------------------------------
-- BOUCLE DE JEU : FK côté "many" + tris de classement
-- ---------------------------------------------------------------------------
create index if not exists ix_players_home_line on public.players (home_line_id);
-- Tri leaderboard global : XP décroissant
create index if not exists ix_players_xp_desc   on public.players (xp_total desc);

create index if not exists ix_psp_station on public.player_station_progress (station_id);
-- Tri "meilleurs maîtres d'une station"
create index if not exists ix_psp_station_mastery
  on public.player_station_progress (station_id, mastery_score desc);

-- Tri leaderboard de ligne : score décroissant par ligne
create index if not exists ix_plp_line_score_desc
  on public.player_line_progress (line_id, line_score desc);

create index if not exists ix_qa_player  on public.quest_attempts (player_id, created_at desc);
create index if not exists ix_qa_quest   on public.quest_attempts (quest_id);
-- Agrégation leaderboard saison : somme des scores par (season, player)
create index if not exists ix_qa_season_player
  on public.quest_attempts (season_id, player_id) where season_id is not null;

-- Cooldown : récupération O(log n) du dernier check-in du joueur
create index if not exists ix_check_ins_player_created
  on public.check_ins (player_id, created_at desc);
create index if not exists ix_check_ins_station on public.check_ins (station_id);
-- Purge / requêtes sur fenêtres actives
create index if not exists ix_check_ins_expires on public.check_ins (expires_at);

-- ---------------------------------------------------------------------------
-- MONÉTISATION
-- ---------------------------------------------------------------------------
create index if not exists ix_battle_passes_season on public.battle_passes (season_id);
create index if not exists ix_pass_purchases_player on public.pass_purchases (player_id, status);
