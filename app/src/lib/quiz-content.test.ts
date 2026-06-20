import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import type { QuizQuestion } from '@arcadia/games';

/**
 * PARITÉ CLIENT ↔ SERVEUR (sans base) + invariants du quiz.
 * Le « corrigé » jouable côté client (content/*.json → champ `answer`) DOIT
 * coïncider avec l'autorité serveur (migration seed → answer_key->'answer').
 * fn_submit_attempt reste seul juge en prod ; ce test garantit qu'aucune dérive
 * de contenu ne rend la prévisualisation menteuse.
 */

const content = JSON.parse(
  readFileSync(new URL('../../../content/stations/louvre-rivoli.json', import.meta.url), 'utf8'),
) as {
  game: { archetype: string };
  quests: Record<'bronze' | 'silver' | 'gold', { questId: string; params: { lives: number; timerS: number; questions: QuizQuestion[] } }>;
};

const seedSql = readFileSync(
  new URL('../../../supabase/migrations/20260620000015_louvre_seed.sql', import.meta.url),
  'utf8',
);

/** corrigé serveur : stepId → answer, lu depuis les tuples de la migration. */
function serverAnswerKey(): Record<string, string> {
  const stepIds = [...seedSql.matchAll(/'(77777777-7777-4777-8777-[0-9a-f]{12})'/g)].map((m) => m[1]);
  const answers = [...seedSql.matchAll(/'\{"answer":"([a-d])"\}'/g)].map((m) => m[1]);
  expect(stepIds.length).toBe(answers.length);
  const out: Record<string, string> = {};
  stepIds.forEach((id, i) => { out[id] = answers[i]; });
  return out;
}

describe('quiz Louvre — parité corrigé client ↔ answer_key serveur', () => {
  const key = serverAnswerKey();

  it('chaque step du contenu a le même bon choix côté serveur', () => {
    let checked = 0;
    for (const tier of ['bronze', 'silver', 'gold'] as const) {
      for (const q of content.quests[tier].params.questions) {
        expect(key[q.stepId], `stepId ${q.stepId} absent du seed`).toBeDefined();
        expect(q.answer).toBe(key[q.stepId]);
        checked += 1;
      }
    }
    expect(checked).toBe(5 + 6 + 8); // bronze + silver + gold
  });

  it('le serveur note le quiz par answer_key, JAMAIS comme un mini-jeu', () => {
    // invariant d'autorité : aucune étape quiz ne doit déclencher la branche
    // télémétrie (kind:'minigame'), sinon le score serait calculé sur des faits
    // de jeu inexistants.
    expect(seedSql).not.toContain('"kind":"minigame"');
    expect(seedSql).toContain('"answer"');
  });
});

describe('quiz Louvre — invariants de contenu', () => {
  it('archétype quiz, paliers durcis 5/6/8 questions', () => {
    expect(content.game.archetype).toBe('quiz');
    expect(content.quests.bronze.params.questions).toHaveLength(5);
    expect(content.quests.silver.params.questions).toHaveLength(6);
    expect(content.quests.gold.params.questions).toHaveLength(8);
  });

  it('vies/chrono durcis par palier (bronze 3·0 → silver 2·12 → gold 1·8)', () => {
    expect(content.quests.bronze.params.lives).toBe(3);
    expect(content.quests.bronze.params.timerS).toBe(0);
    expect(content.quests.silver.params.lives).toBe(2);
    expect(content.quests.silver.params.timerS).toBe(12);
    expect(content.quests.gold.params.lives).toBe(1);
    expect(content.quests.gold.params.timerS).toBe(8);
  });

  it('chaque bonne réponse pointe un choix existant, et les stepId sont uniques', () => {
    const seen = new Set<string>();
    for (const tier of ['bronze', 'silver', 'gold'] as const) {
      for (const q of content.quests[tier].params.questions) {
        expect(q.choices.map((c) => c.id)).toContain(q.answer);
        expect(seen.has(q.stepId)).toBe(false);
        seen.add(q.stepId);
      }
    }
  });
});
