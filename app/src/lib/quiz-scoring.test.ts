import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import type { GameAnswers, QuizQuestion } from '@arcadia/games';
import { previewQuizScore, TIER_MASTERY } from './scoring';

/**
 * Verrou sur la branche QUIZ du scoring (miroir de fn_submit_attempt, migr. 0012) :
 *   · succès UNIQUEMENT si toutes les réponses sont correctes,
 *   · anti-triche durée (300 ms × nombre d'étapes),
 *   · XP = marge au-delà du meilleur score, mastery imposée par palier.
 * On joue sur le VRAI contenu Louvre pour prouver qu'il est cohérent et jouable.
 */

const louvre = JSON.parse(
  readFileSync(new URL('../../../content/stations/louvre-rivoli.json', import.meta.url), 'utf8'),
) as {
  quests: Record<'bronze' | 'silver' | 'gold', { params: { questions: QuizQuestion[] } }>;
};

/** Réponses « sans faute » d'un palier : chaque step → son bon choix (contenu). */
function perfectAnswers(questions: QuizQuestion[]): GameAnswers {
  const out: GameAnswers = {};
  for (const q of questions) out[q.stepId] = q.answer;
  return out;
}

describe('previewQuizScore — succès / échec', () => {
  it('victoire « sans faute » sur les 3 paliers Louvre (score = 10 × questions)', () => {
    for (const tier of ['bronze', 'silver', 'gold'] as const) {
      const qs = louvre.quests[tier].params.questions;
      const r = previewQuizScore(louvre.quests[tier].params, tier, perfectAnswers(qs), 60_000);
      expect(r.flagged).toBe(false);
      expect(r.success).toBe(true);
      expect(r.score).toBe(qs.length * 10);
      expect(r.mastery).toBe(TIER_MASTERY[tier]);
    }
  });

  it('une seule mauvaise réponse → pas de succès, score partiel', () => {
    const qs = louvre.quests.bronze.params.questions;
    const answers = perfectAnswers(qs);
    // on casse la 1ʳᵉ réponse en choisissant un id volontairement faux
    answers[qs[0].stepId] = qs[0].answer === 'a' ? 'b' : 'a';
    const r = previewQuizScore(louvre.quests.bronze.params, 'bronze', answers, 60_000);
    expect(r.success).toBe(false);
    expect(r.mastery).toBe(0);
    expect(r.score).toBe((qs.length - 1) * 10);
  });

  it('réponses manquantes (vies épuisées) → pas de succès', () => {
    const qs = louvre.quests.gold.params.questions;
    const answers: GameAnswers = {};
    answers[qs[0].stepId] = qs[0].answer; // une seule répondue
    const r = previewQuizScore(louvre.quests.gold.params, 'gold', answers, 60_000);
    expect(r.success).toBe(false);
    expect(r.score).toBe(10);
  });
});

describe('previewQuizScore — anti-triche & XP', () => {
  it('manche trop rapide (< 300 ms × étapes) → flagged, score 0', () => {
    const qs = louvre.quests.bronze.params.questions;
    const r = previewQuizScore(louvre.quests.bronze.params, 'bronze', perfectAnswers(qs), 100);
    expect(r.flagged).toBe(true);
    expect(r.score).toBe(0);
    expect(r.success).toBe(false);
  });

  it('xpGained = score sans meilleur précédent, puis 0 sans progression', () => {
    const qs = louvre.quests.silver.params.questions;
    const a = perfectAnswers(qs);
    const first = previewQuizScore(louvre.quests.silver.params, 'silver', a, 60_000);
    expect(first.xpGained).toBe(first.score);
    const again = previewQuizScore(louvre.quests.silver.params, 'silver', a, 60_000, first.score);
    expect(again.xpGained).toBe(0);
  });
});
