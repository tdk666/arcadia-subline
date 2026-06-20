import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import type { GameAnswers, QuizQuestion } from '@arcadia/games';
import { drawBank, previewBankedQuizScore, scoreBankedRound, TIER_MASTERY } from './scoring';

/**
 * Verrou sur la BANQUE V2 (miroir de la branche banque de fn_submit_attempt,
 * migration 0016) : seuls les items tirés/soumis comptent, un item déjà réussi
 * n'est JAMAIS re-crédité, succès = CUMUL ≥ seuil, anti-triche durée.
 * On joue sur le VRAI contenu Louvre v2.
 */
const louvre = JSON.parse(
  readFileSync(new URL('../../../content/stations/louvre-rivoli.json', import.meta.url), 'utf8'),
) as {
  progression: { thresholds: { bronzeToSilver: number; silverToGold: number; goldMastery: number } };
  quests: Record<'bronze' | 'silver' | 'gold', { params: { draw: number; questions: QuizQuestion[] } }>;
};

const TH = louvre.progression.thresholds;

/** Tire les `n` premiers items du palier et répond juste à chacun. */
function correctDraw(tier: 'bronze' | 'silver' | 'gold', n: number): { answers: GameAnswers; qs: QuizQuestion[] } {
  const qs = louvre.quests[tier].params.questions.slice(0, n);
  const answers: GameAnswers = {};
  for (const q of qs) answers[q.stepId] = q.answer;
  return { answers, qs };
}

describe('scoreBankedRound — ne crédite que les items soumis et non déjà réussis', () => {
  it('crédite les bonnes réponses tirées (10 pts/item)', () => {
    const { answers } = correctDraw('bronze', 5);
    const r = scoreBankedRound(louvre.quests.bronze.params.questions, answers, []);
    expect(r.correct).toBe(5);
    expect(r.submitted).toBe(5);
    expect(r.pointsGained).toBe(50);
    expect(r.newPassed).toHaveLength(5);
  });

  it('ne re-crédite JAMAIS un item déjà réussi', () => {
    const { answers, qs } = correctDraw('bronze', 5);
    const r = scoreBankedRound(louvre.quests.bronze.params.questions, answers, qs.map((q) => q.stepId));
    expect(r.correct).toBe(5);       // toujours correct…
    expect(r.pointsGained).toBe(0);  // …mais 0 point neuf
    expect(r.newPassed).toHaveLength(0);
  });

  it('ignore une mauvaise réponse (pas de point, pas de passed)', () => {
    const qs = louvre.quests.bronze.params.questions.slice(0, 3);
    const answers: GameAnswers = {};
    answers[qs[0].stepId] = qs[0].answer;
    answers[qs[1].stepId] = qs[1].answer === 'a' ? 'b' : 'a'; // faux
    answers[qs[2].stepId] = qs[2].answer;
    const r = scoreBankedRound(louvre.quests.bronze.params.questions, answers, []);
    expect(r.correct).toBe(2);
    expect(r.pointsGained).toBe(20);
  });
});

describe('drawBank — tirage qui ne rejoue jamais un item réussi', () => {
  const bank = louvre.quests.gold.params.questions; // 90 items

  it('tire exactement `draw` items, jamais un déjà réussi', () => {
    const passed = bank.slice(0, 10).map((q) => q.stepId);
    const drawn = drawBank(bank, 8, passed);
    expect(drawn).toHaveLength(8);
    expect(drawn.every((q) => !passed.includes(q.stepId))).toBe(true);
    // pas de doublon dans la manche
    expect(new Set(drawn.map((q) => q.stepId)).size).toBe(8);
  });

  it('banque épuisée (tout réussi) → repart de la banque complète', () => {
    const passed = bank.map((q) => q.stepId); // tout réussi
    const drawn = drawBank(bank, 8, passed);
    expect(drawn).toHaveLength(8); // rejouabilité plutôt que blocage
  });
});

describe('previewBankedQuizScore — succès par SEUIL cumulé', () => {
  it('un tirage parfait de 5 (50 pts) dépasse le seuil bronze (30) → succès', () => {
    const { answers } = correctDraw('bronze', 5);
    const r = previewBankedQuizScore(louvre.quests.bronze.params.questions, 'bronze', answers, 60_000, TH.bronzeToSilver);
    expect(r.flagged).toBe(false);
    expect(r.score).toBe(50);
    expect(r.pointsTotal).toBe(50);
    expect(r.success).toBe(true);
    expect(r.mastery).toBe(TIER_MASTERY.bronze);
  });

  it('cumul sur plusieurs manches jusqu’au seuil (gold = 56)', () => {
    // manche 1 : 4 items justes = 40 pts (< 56) → pas encore
    const d1 = correctDraw('gold', 4);
    const r1 = previewBankedQuizScore(louvre.quests.gold.params.questions, 'gold', d1.answers, 60_000, TH.goldMastery, 0, []);
    expect(r1.success).toBe(false);
    expect(r1.pointsTotal).toBe(40);
    // manche 2 : 2 NOUVEAUX items justes = 20 pts → cumul 60 ≥ 56 → succès
    const next = louvre.quests.gold.params.questions.slice(4, 6);
    const a2: GameAnswers = {};
    for (const q of next) a2[q.stepId] = q.answer;
    const r2 = previewBankedQuizScore(
      louvre.quests.gold.params.questions, 'gold', a2, 60_000, TH.goldMastery,
      r1.pointsTotal, d1.qs.map((q) => q.stepId),
    );
    expect(r2.pointsTotal).toBe(60);
    expect(r2.success).toBe(true);
    expect(r2.mastery).toBe(TIER_MASTERY.gold);
  });

  it('manche trop rapide (< 300 ms × items) → flagged, 0 pt, rien de passé', () => {
    const { answers } = correctDraw('bronze', 5);
    const r = previewBankedQuizScore(louvre.quests.bronze.params.questions, 'bronze', answers, 100, TH.bronzeToSilver);
    expect(r.flagged).toBe(true);
    expect(r.score).toBe(0);
    expect(r.pointsTotal).toBe(0);
    expect(r.newPassed).toHaveLength(0);
  });
});
