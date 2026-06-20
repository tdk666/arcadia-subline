import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import type { QuizQuestion } from '@arcadia/games';

/**
 * PARITÉ CLIENT ↔ SERVEUR (sans base) + invariants de la banque V2.
 * Le « corrigé » jouable côté client (content/*.json → champ `answer`) DOIT
 * coïncider avec l'autorité serveur (migration seed → answer_key->'answer').
 * fn_submit_attempt reste seul juge ; ce test garantit qu'aucune dérive de
 * contenu ne rend la prévisualisation menteuse.
 */
const content = JSON.parse(
  readFileSync(new URL('../../../content/stations/louvre-rivoli.json', import.meta.url), 'utf8'),
) as {
  schemaVersion: number;
  game: { archetype: string };
  progression: { thresholds: { bronzeToSilver: number; silverToGold: number; goldMastery: number } };
  quests: Record<'bronze' | 'silver' | 'gold', { questId: string; params: { lives: number; timerS: number; draw: number; bankTarget: number; questions: QuizQuestion[] } }>;
};

const seedSql = readFileSync(
  new URL('../../../supabase/migrations/20260620000017_louvre_rivoli_bank_seed.sql', import.meta.url),
  'utf8',
);

/** corrigé serveur : stepId(slug) → answer, lu depuis le tableau jsonb du seed. */
function serverAnswerKey(): Record<string, string> {
  const m = seedSql.match(/jsonb_array_elements\('(.*)'::jsonb\)/s);
  if (!m) throw new Error('tableau jsonb introuvable dans le seed');
  const rows = JSON.parse(m[1].replaceAll("''", "'")) as Array<{ payload: { stepId: string }; answer_key: { answer: string } }>;
  const out: Record<string, string> = {};
  for (const r of rows) out[r.payload.stepId] = r.answer_key.answer;
  return out;
}

const allItems = (['bronze', 'silver', 'gold'] as const).flatMap((t) => content.quests[t].params.questions);

describe('Louvre v2 — parité corrigé client ↔ answer_key serveur', () => {
  const key = serverAnswerKey();

  it('les 150 items du contenu ont le même bon choix côté serveur', () => {
    expect(Object.keys(key)).toHaveLength(150);
    let checked = 0;
    for (const q of allItems) {
      expect(key[q.stepId], `stepId ${q.stepId} absent du seed`).toBeDefined();
      expect(q.answer).toBe(key[q.stepId]);
      checked += 1;
    }
    expect(checked).toBe(150);
  });

  it('le serveur note par answer_key, JAMAIS comme un mini-jeu', () => {
    expect(seedSql).not.toContain('"kind":"minigame"');
    expect(seedSql).toContain('"answer"');
  });
});

describe('Louvre v2 — invariants de banque', () => {
  it('schemaVersion 2, banque 30/30/90, tirage 5/6/8', () => {
    expect(content.schemaVersion).toBe(2);
    expect(content.game.archetype).toBe('quiz');
    expect(content.quests.bronze.params.questions).toHaveLength(30);
    expect(content.quests.silver.params.questions).toHaveLength(30);
    expect(content.quests.gold.params.questions).toHaveLength(90);
    expect(content.quests.bronze.params.draw).toBe(5);
    expect(content.quests.silver.params.draw).toBe(6);
    expect(content.quests.gold.params.draw).toBe(8);
  });

  it('paliers durcis : vies 3/2/1, chrono 0/12/8', () => {
    expect(content.quests.bronze.params.lives).toBe(3);
    expect(content.quests.bronze.params.timerS).toBe(0);
    expect(content.quests.silver.params.lives).toBe(2);
    expect(content.quests.silver.params.timerS).toBe(12);
    expect(content.quests.gold.params.lives).toBe(1);
    expect(content.quests.gold.params.timerS).toBe(8);
  });

  it('seuils de progression 30/36/56', () => {
    expect(content.progression.thresholds.bronzeToSilver).toBe(30);
    expect(content.progression.thresholds.silverToGold).toBe(36);
    expect(content.progression.thresholds.goldMastery).toBe(56);
  });

  it('chaque bonne réponse pointe un choix existant, stepId uniques (150)', () => {
    const seen = new Set<string>();
    for (const q of allItems) {
      expect(q.choices.map((c) => c.id)).toContain(q.answer);
      expect(seen.has(q.stepId)).toBe(false);
      seen.add(q.stepId);
    }
    expect(seen.size).toBe(150);
  });

  it('le tirage (draw) ne dépasse jamais la banque disponible', () => {
    for (const t of ['bronze', 'silver', 'gold'] as const) {
      expect(content.quests[t].params.draw).toBeLessThanOrEqual(content.quests[t].params.questions.length);
    }
  });

  it('les images to_verify coexistent avec des verified (fallback attendu côté client)', () => {
    const withImage = allItems.filter((q) => q.image);
    const verified = withImage.filter((q) => q.image?.status === 'verified');
    const toVerify = withImage.filter((q) => q.image?.status === 'to_verify');
    // au moins une de chaque (le board annonce 37 verified / 113 to_verify)
    expect(verified.length).toBeGreaterThan(0);
    expect(toVerify.length).toBeGreaterThan(0);
  });
});
