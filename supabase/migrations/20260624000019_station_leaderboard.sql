-- =============================================================================
-- ARCADIA SUBLINE — Migration 0019 : CLASSEMENT PAR STATION (« Chef de Station »)
--
-- Phase A de l'architecture de titres (DEC-012, brain/architecture-jeu.md).
-- Source de vérité = le MEILLEUR score d'un joueur sur les quêtes d'une station
-- (max(quest_attempts.score) non flaggé, relié par quests.station_id). De cette
-- brique unique découleront ligne / quartier / arrondissement / rive / empire.
--
-- 100 % ADDITIF & sûr : aucune écriture, aucun answer_key, security definer +
-- search_path verrouillé. Lecture PUBLIQUE de données NON sensibles (pseudo +
-- score), exactement comme la matview `leaderboard_entries` déjà exposée.
-- fn_submit_attempt reste l'unique porte du score — on ne fait que LIRE/classer.
-- Idempotent (create or replace).
-- =============================================================================

create or replace function public.fn_station_leaderboard(
  p_station_id uuid,
  p_limit      int default 20
)
returns table (player_id uuid, display_name text, best_score int, rank bigint)
language sql
stable
security definer
set search_path = public
as $$
  with bests as (
    select qa.player_id, max(qa.score) as best_score
      from public.quest_attempts qa
      join public.quests q on q.id = qa.quest_id
     where q.station_id = p_station_id
       and not qa.flagged
     group by qa.player_id
  )
  select b.player_id,
         p.display_name,
         b.best_score,
         rank() over (order by b.best_score desc) as rank
    from bests b
    join public.players p on p.id = b.player_id
   where b.best_score > 0
   order by b.best_score desc
   limit greatest(1, least(p_limit, 100));
$$;

revoke all on function public.fn_station_leaderboard(uuid, int) from public, anon;
grant execute on function public.fn_station_leaderboard(uuid, int) to anon, authenticated;

comment on function public.fn_station_leaderboard(uuid, int) is
  'Classement par station (titre « Chef de Station ») : meilleur score par joueur sur les quêtes de la station, non flaggé. Lecture publique (pseudo + score, non sensible). Brique de base du système de titres (DEC-012).';
