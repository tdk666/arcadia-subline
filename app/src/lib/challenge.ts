/**
 * DÉFI DU JOUR — le rituel quotidien (« station du jour »), réponse directe au
 * board (« définir + enseigner la boucle 30 s ») et au playtest Agathe (« trop
 * long, trop d'objectifs »). On choisit UN défi clair par jour : le prochain
 * palier sensé du joueur, tourné déterministiquement entre les stations jouables
 * (fraîcheur sans aléa cassant). Pur & testable — aucune autorité de score ici.
 */
import { TIER_ORDER, type DifficultyTier } from '@arcadia/games';
import { dayStr } from './daily';

export interface DailyChallenge {
  slug: string;
  name: string;
  tier: DifficultyTier;
  /** true = la station est déjà entièrement conquise → on rejoue le palier max. */
  isReplay: boolean;
}

/** Le prochain palier sensé d'une station : le 1er non gagné (toujours débloqué),
 *  sinon le palier max en rejeu. */
export function nextTierFor(slug: string, tiersWon: Record<string, DifficultyTier[]>): { tier: DifficultyTier; isReplay: boolean } {
  const won = tiersWon[slug] ?? [];
  for (const t of TIER_ORDER) if (!won.includes(t)) return { tier: t, isReplay: false };
  return { tier: TIER_ORDER[TIER_ORDER.length - 1], isReplay: true };
}

/** Hash déterministe d'un jour (YYYY-MM-DD) → entier positif (rotation stable). */
function hashDay(day: string): number {
  let h = 0;
  for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Le défi du jour. Priorité aux stations avec un palier encore à conquérir
 * (la progression d'abord) ; à défaut, rejeu. Rotation déterministe par jour.
 */
export function challengeOfDay(
  playable: { slug: string; name: string }[],
  tiersWon: Record<string, DifficultyTier[]>,
  day: string = dayStr(),
): DailyChallenge | null {
  if (playable.length === 0) return null;
  const withState = playable.map((s) => ({ ...s, ...nextTierFor(s.slug, tiersWon) }));
  const fresh = withState.filter((s) => !s.isReplay);
  const pool = fresh.length > 0 ? fresh : withState;
  const pick = pool[hashDay(day) % pool.length];
  return { slug: pick.slug, name: pick.name, tier: pick.tier, isReplay: pick.isReplay };
}
