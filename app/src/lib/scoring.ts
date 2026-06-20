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
 * Notation d'une MANCHE de banque V2 (miroir SANS autorité de la branche banque
 * de fn_submit_attempt, migration 0016) : seuls les items tirés/soumis comptent,
 * et un item déjà réussi (dans `alreadyPassed`) n'est JAMAIS re-crédité.
 * `answers` : { "<stepId slug>": "<choiceId>" } — exactement p_answers.
 */
/** Fisher-Yates : mélange non biaisé (copie). */
function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Tire `n` items au hasard parmi la banque, en EXCLUANT les déjà réussis
 * (`passed`). Banque épuisée (tout réussi) → on repart de la banque complète
 * (rejouabilité). Règle board : on ne rejoue jamais un item déjà réussi.
 */
export function drawBank(
  bank: readonly QuizQuestion[],
  n: number,
  passed: readonly string[] = [],
): QuizQuestion[] {
  const set = new Set(passed);
  let pool = bank.filter((q) => !set.has(q.stepId));
  if (pool.length < n) pool = bank.slice();
  return shuffle(pool).slice(0, n);
}

export function scoreBankedRound(
  questions: QuizQuestion[],
  answers: GameAnswers,
  alreadyPassed: readonly string[] = [],
): { pointsGained: number; newPassed: string[]; correct: number; submitted: number } {
  const passed = new Set(alreadyPassed);
  const byId = new Map(questions.map((q) => [q.stepId, q]));
  let pointsGained = 0;
  let correct = 0;
  let submitted = 0;
  const newPassed: string[] = [];
  for (const stepId of Object.keys(answers)) {
    const q = byId.get(stepId);
    if (!q) continue;
    submitted += 1;
    if (answers[stepId] === q.answer) {
      correct += 1;
      if (!passed.has(stepId)) {
        pointsGained += q.points ?? 10;
        newPassed.push(stepId);
      }
    }
  }
  return { pointsGained, newPassed, correct, submitted };
}

/**
 * Aperçu SANS autorité d'une manche de banque (démo + invité + panne réseau).
 * Le succès/mastery dépendent du CUMUL (points déjà acquis + manche) vs seuil.
 * Le serveur (fn_submit_attempt v3) reste seul juge en mode réel.
 */
export function previewBankedQuizScore(
  questions: QuizQuestion[],
  tier: DifficultyTier,
  answers: GameAnswers,
  durationMs: number,
  threshold: number,
  prevPoints = 0,
  alreadyPassed: readonly string[] = [],
): AttemptResult & { pointsTotal: number; newPassed: string[] } {
  const { pointsGained, newPassed, submitted } = scoreBankedRound(questions, answers, alreadyPassed);
  // Anti-triche durée : 300 ms par item soumis (seuil serveur par défaut).
  const flagged = submitted > 0 && durationMs < 300 * submitted;
  const gained = flagged ? 0 : pointsGained;
  const pointsTotal = prevPoints + gained;
  const success = !flagged && threshold > 0 && pointsTotal >= threshold;
  const ratio = threshold > 0 ? Math.min(1, pointsTotal / threshold) : 0;
  return {
    attemptId: null,
    score: gained,
    success,
    xpGained: gained,
    mastery: Math.round(TIER_MASTERY[tier] * ratio),
    flagged,
    pointsTotal,
    newPassed: flagged ? [] : newPassed,
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
