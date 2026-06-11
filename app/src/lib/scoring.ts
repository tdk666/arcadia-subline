/**
 * PRÉVISUALISATION de score — miroir assumé de la formule serveur (migration
 * 0012) pour deux usages SANS autorité :
 *   · mode démo (pas de backend)
 *   · invité en mode Supabase : on montre un aperçu, la tentative est mise en
 *     file et REJOUÉE via fn_submit_attempt à la création du compte — seul le
 *     résultat serveur fait foi et alimente classement/XP/mastery.
 */
import type { DifficultyTier, GameAnswers } from '@arcadia/games';
import type { AttemptResult } from './backend/types';

export const TIER_MULT: Record<DifficultyTier, number> = { bronze: 1.0, silver: 1.5, gold: 2.0 };
export const TIER_MASTERY: Record<DifficultyTier, number> = { bronze: 40, silver: 80, gold: 100 };

export function previewDemolitionScore(
  params: Record<string, unknown>,
  tier: DifficultyTier,
  answers: GameAnswers,
  durationMs: number,
  bestPrev = 0,
): AttemptResult {
  const maxShots = (params.maxShots as number) ?? 5;
  const minPct = (params.targetPct as number) ?? 0;
  const mult = TIER_MULT[tier];

  const shots = Number(answers.shots_used ?? 0);
  const pct = Number(answers.destruction_pct ?? 0);
  const targets = Number(answers.targets_down ?? 0);
  const totalTargets = Number(answers.total_targets ?? 3);
  const timeLeftMs = Number(answers.time_left_ms ?? 0);

  const flagged = pct < 0 || pct > 100 || shots < 1 || shots > maxShots || durationMs < shots * 800;
  const success = !flagged && targets === totalTargets && pct >= minPct;
  const score = flagged
    ? 0
    : success
      ? Math.round((600 * pct / 100 + 80 * (maxShots - shots) + Math.min(60, timeLeftMs / 1000)) * mult)
      : Math.round((600 * pct / 100) * 0.25 * mult);

  return {
    attemptId: null,
    score,
    success,
    xpGained: Math.max(0, score - bestPrev),
    mastery: success ? TIER_MASTERY[tier] : 0,
    flagged,
  };
}
