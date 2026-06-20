/**
 * PRÉVISUALISATION de score — miroir assumé de la formule serveur (migration
 * 0012) pour deux usages SANS autorité :
 *   · mode démo (pas de backend)
 *   · invité en mode Supabase : on montre un aperçu, la tentative est mise en
 *     file et REJOUÉE via fn_submit_attempt à la création du compte — seul le
 *     résultat serveur fait foi et alimente classement/XP/mastery.
 */
import type { DifficultyTier, GameAnswers, QuizQuestion } from '@arcadia/games';
import type { AttemptResult } from './backend/types';

export const TIER_MULT: Record<DifficultyTier, number> = { bronze: 1.0, silver: 1.5, gold: 2.0 };
export const TIER_MASTERY: Record<DifficultyTier, number> = { bronze: 40, silver: 80, gold: 100 };

/**
 * Miroir SANS autorité de la branche quiz de fn_submit_attempt (migration 0012) :
 *   v_points par étape (def. 10), succès si TOUTES correctes, anti-triche durée
 *   (300 ms × nombre d'étapes), mastery imposée par palier.
 * Usage : mode démo + aperçu invité. Le serveur reste seul juge en mode réel.
 * answers : { "<quest_step_id>": "<choiceId>" } — exactement p_answers.
 */
export function previewQuizScore(
  params: Record<string, unknown>,
  tier: DifficultyTier,
  answers: GameAnswers,
  durationMs: number,
  bestPrev = 0,
): AttemptResult {
  const questions = (params.questions as QuizQuestion[] | undefined) ?? [];
  const total = questions.length;

  let correct = 0;
  let score = 0;
  for (const q of questions) {
    const given = answers[q.stepId];
    if (given !== undefined && given === q.answer) {
      correct += 1;
      score += q.points ?? 10;
    }
  }

  // Anti-triche durée globale : seuil serveur par défaut = 300 ms par étape.
  const flagged = total > 0 && durationMs < 300 * total;
  const success = !flagged && total > 0 && correct === total;
  if (flagged) score = 0;

  return {
    attemptId: null,
    score,
    success,
    xpGained: Math.max(0, score - bestPrev),
    mastery: success ? TIER_MASTERY[tier] : 0,
    flagged,
  };
}

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
