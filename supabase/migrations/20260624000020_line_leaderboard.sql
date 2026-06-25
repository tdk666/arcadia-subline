-- =============================================================================
-- ARCADIA SUBLINE — Migration 0020 : CLASSEMENT PAR LIGNE (« Maître de la Ligne »)
--
-- Phase B de l'architecture de titres (DEC-012). Agrégation de la MÊME source de
-- vérité que 0019 : station_best (meilleur score/joueur/station) sommé sur les
-- stations de la ligne (via line_stations). « Maître de la Ligne » = tête du Σ.
--
-- 100 % ADDITIF & sûr : lecture seule, security definer, search_path verrouillé,
-- données NON sensibles (pseudo + total). fn_submit_attempt intact.
-- =============================================================================

create or replace function public.fn_line_leaderboard(p_line_id uuid, p_limit int default 20)
returns table (player_id uuid, display_name text, total_score bigint, rank bigint)
language sql
stable
security definer
set search_path = public
as $$
  with station_best as (
    select qa.player_id, q.station_id, max(qa.score) as best
    from public.quest_attempts qa
    join public.quests q on q.id = qa.quest_id
    where not qa.flagged and q.station_id is not null
    group by qa.player_id, q.station_id
  ),
  on_line as (
    select sb.player_id, sum(sb.best) as total_score
    from station_best sb
    join public.line_stations ls on ls.station_id = sb.station_id
    where ls.line_id = p_line_id
    group by sb.player_id
  )
  select o.player_id, p.display_name, o.total_score,
         rank() over (order by o.total_score desc) as rank
  from on_line o
  join public.players p on p.id = o.player_id
  where o.total_score > 0
  order by o.total_score desc
  limit greatest(1, least(p_limit, 100));
$$;

grant execute on function public.fn_line_leaderboard(uuid, int) to anon, authenticated;

comment on function public.fn_line_leaderboard(uuid, int) is
  'Classement par ligne (titre « Maître de la Ligne ») : somme des meilleurs scores du joueur sur les stations de la ligne (line_stations). Lecture publique non sensible. DEC-012 Phase B.';
