/**
 * HAUTS FAITS — la couche de méta-progression « collection de trophées » (persona
 * Stratège : profondeur qui récompense le retour ; leçon des meilleurs casual —
 * Duolingo/Royal Match). Purs & testables : un prédicat sur un instantané de
 * progression. Aucune autorité de score ici — on LIT l'état local, on ne le mute pas.
 *
 * i18n : chaque haut fait a `achievements.<id>.title` / `.desc`.
 */
export interface AchievementSnapshot {
  /** Stations avec au moins un palier conquis. */
  stationsConquered: number;
  /** Stations conquises au palier Or. */
  goldCount: number;
  /** Paliers gagnés, tous confondus. */
  totalTiers: number;
  /** Archives culturelles débloquées. */
  archivesUnlocked: number;
  /** Série vivante (jours consécutifs). */
  streak: number;
  /** Jetons de laiton accumulés. */
  coins: number;
  /** Total de stations jouables (pour « conquérir la ligne »). */
  playableTotal: number;
}

export interface Achievement {
  id: string;
  /** CLÉ d'icône SVG on-brand (rendue par `AchievementIcon`, icons.tsx) —
   *  zéro emoji dans l'UI (invariant DA). */
  icon: string;
  /** Atteint pour cet instantané ? */
  reached: (s: AchievementSnapshot) => boolean;
}

/** Catalogue — ordonné du plus accessible au plus exigeant (l'ordre d'affichage). */
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'premiere_pierre', icon: 'pave', reached: (s) => s.stationsConquered >= 1 },
  { id: 'erudit', icon: 'seal', reached: (s) => s.archivesUnlocked >= 2 },
  { id: 'gardien', icon: 'shield', reached: (s) => s.goldCount >= 1 },
  { id: 'serie_3', icon: 'flame', reached: (s) => s.streak >= 3 },
  { id: 'tresorier', icon: 'token', reached: (s) => s.coins >= 100 },
  { id: 'serie_7', icon: 'flame', reached: (s) => s.streak >= 7 },
  { id: 'conquerant', icon: 'network', reached: (s) => s.playableTotal > 0 && s.stationsConquered >= s.playableTotal },
];

/** Les ids débloqués pour un instantané (dans l'ordre du catalogue). */
export function unlockedAchievements(snap: AchievementSnapshot): string[] {
  return ACHIEVEMENTS.filter((a) => a.reached(snap)).map((a) => a.id);
}

/** Construit l'instantané à partir de l'état local (pur : pas d'accès store/contenu). */
export function buildSnapshot(args: {
  tiersWon: Record<string, string[]>;
  storyUnlocked: Record<string, boolean>;
  coins: number;
  streak: number;
  playableTotal: number;
}): AchievementSnapshot {
  const slugs = Object.values(args.tiersWon);
  return {
    stationsConquered: slugs.filter((t) => t.length > 0).length,
    goldCount: slugs.filter((t) => t.includes('gold')).length,
    totalTiers: slugs.reduce((n, t) => n + t.length, 0),
    archivesUnlocked: Object.values(args.storyUnlocked).filter(Boolean).length,
    streak: args.streak,
    coins: args.coins,
    playableTotal: args.playableTotal,
  };
}
