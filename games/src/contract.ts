/**
 * CONTRAT DE MINI-JEU ARCADIA
 * ───────────────────────────
 * Tout mini-jeu (les ~8 archétypes) implémente ce contrat et RIEN d'autre :
 * il reçoit un GameContext, joue, et rend un GameResult brut (télémétrie).
 *
 * INVARIANT DE SÉCURITÉ : un mini-jeu ne calcule JAMAIS de score.
 * Il remonte des FAITS observables (coups joués, % détruit, durée…) dans
 * `answers` ; le score est calculé côté serveur par fn_submit_attempt,
 * qui valide la télémétrie contre les paramètres de la quête.
 */
import type { ComponentType } from 'react';

/** Les 8 archétypes prévus. Un seul est livré dans cette tranche. */
export type GameArchetype =
  | 'demolition'
  | 'quiz'
  | 'maze'
  | 'match'
  | 'defense'
  | 'words'
  | 'rhythm'
  | 'build';

/** Paliers façon Geometry Dash : même terrain, paramètres qui durcissent. */
export type DifficultyTier = 'bronze' | 'silver' | 'gold';

export const TIER_ORDER: DifficultyTier[] = ['bronze', 'silver', 'gold'];

export interface GameContext {
  /** Quête serveur visée par cette partie (1 quête = 1 station × 1 palier). */
  questId: string;
  stationId: string;
  stationSlug: string;
  difficulty: DifficultyTier;
  /**
   * Paramètres de jeu côté client (copie de quest_steps.payload).
   * Le serveur garde la copie AUTORITATIVE pour valider la télémétrie.
   */
  params: Record<string, unknown>;
  locale: string;
  reducedMotion: boolean;
}

/** Télémétrie brute — devient p_answers de fn_submit_attempt, telle quelle. */
export type GameAnswers = Record<string, number | string | boolean>;

export interface GameResult {
  /** La partie est allée à son terme (victoire OU défaite, pas un abandon). */
  completed: boolean;
  /** Le joueur pense avoir gagné — purement cosmétique, le serveur tranche. */
  clientWin: boolean;
  durationMs: number;
  answers: GameAnswers;
}

export interface GameProps {
  ctx: GameContext;
  onFinish: (result: GameResult) => void;
  onQuit: () => void;
}

export interface MiniGameModule {
  default: ComponentType<GameProps>;
}

export interface MiniGameDefinition {
  archetype: GameArchetype;
  /** Import dynamique → chaque archétype est code-splitté hors du bundle initial. */
  load: () => Promise<MiniGameModule>;
}
