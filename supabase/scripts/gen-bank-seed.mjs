// Génère une migration de seed « banque V2 » à partir d'un content/stations/<slug>.json
// (schemaVersion 2). Réutilisable pour chaque nouvelle station-quiz.
//
//   node supabase/scripts/gen-bank-seed.mjs <slug> <migrationNumber>
//   ex. node supabase/scripts/gen-bank-seed.mjs louvre-rivoli 20260620000017
//
// Émet supabase/migrations/<number>_<slugSansTiret>_bank_seed.sql :
//   · station_id RÉSOLU par requête (jamais fabriqué) + garde-fou
//   · quests.points_threshold posés depuis progression.thresholds
//   · 1 item de banque = 1 quest_step (payload = stepId/points/question/choices/
//     image/explain ; answer_key = {answer}) ; PAS de kind:'minigame'
//   · upsert idempotent par (quest_id, position)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const slug = process.argv[2] ?? 'louvre-rivoli';
const number = process.argv[3] ?? '20260620000017';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const data = JSON.parse(readFileSync(resolve(root, `content/stations/${slug}.json`), 'utf8'));

if (data.schemaVersion !== 2) throw new Error(`schemaVersion 2 attendu, reçu ${data.schemaVersion}`);

const TIER_TO_THRESHOLD = {
  bronze: data.progression.thresholds.bronzeToSilver,
  silver: data.progression.thresholds.silverToGold,
  gold: data.progression.thresholds.goldMastery,
};

const rows = [];
for (const tier of ['bronze', 'silver', 'gold']) {
  const quest = data.quests[tier];
  quest.params.questions.forEach((item, i) => {
    rows.push({
      quest_id: quest.questId,
      position: i,
      prompt: item.question.fr,
      payload: {
        stepId: item.stepId,
        points: item.points ?? 10,
        question: item.question,
        choices: item.choices,
        image: item.image ?? null,
        explain: item.explain ?? null,
      },
      answer_key: { answer: item.answer },
    });
  });
}

const bankJson = JSON.stringify(rows).replaceAll("'", "''"); // littéral SQL single-quoted

const sql = `-- =============================================================================
-- ARCADIA SUBLINE — Migration ${number} : SEED banque V2 « ${data.name} » (${slug})
-- GÉNÉRÉ par supabase/scripts/gen-bank-seed.mjs depuis content/stations/${slug}.json
-- (schemaVersion ${data.schemaVersion}). Ne pas éditer à la main : régénérer.
--
-- ${rows.length} items (banque ${data.quests.bronze.params.questions.length}/${data.quests.silver.params.questions.length}/${data.quests.gold.params.questions.length}).
-- station_id RÉSOLU par requête (jamais fabriqué). Branche quiz (pas de
-- kind:'minigame'). answer_key = {"answer":"<lettre>"} (autorité serveur).
-- Idempotent (upsert par quest_id, position).
-- =============================================================================

-- garde-fou : la station doit exister (seed réseau appliqué)
do $$
begin
  if not exists (
    select 1 from public.stations
     where slug = '${slug}'
       and network_id = '11111111-1111-4111-8111-111111111111'
  ) then
    raise exception 'SEED_PREREQ_MISSING: station ${slug} absente (seed réseau d''abord).';
  end if;
end $$;

-- seuils de progression (autorité serveur) — depuis progression.thresholds du JSON
update public.quests set points_threshold = ${TIER_TO_THRESHOLD.bronze} where id = '${data.quests.bronze.questId}';
update public.quests set points_threshold = ${TIER_TO_THRESHOLD.silver} where id = '${data.quests.silver.questId}';
update public.quests set points_threshold = ${TIER_TO_THRESHOLD.gold}   where id = '${data.quests.gold.questId}';

-- items de banque (1 item = 1 quest_step)
insert into public.quest_steps (quest_id, position, prompt, payload, answer_key)
select (r->>'quest_id')::uuid,
       (r->>'position')::int,
       r->>'prompt',
       r->'payload',
       r->'answer_key'
  from jsonb_array_elements('${bankJson}'::jsonb) as r
on conflict (quest_id, position) do update
  set prompt     = excluded.prompt,
      payload    = excluded.payload,
      answer_key = excluded.answer_key;
`;

const outPath = resolve(root, `supabase/migrations/${number}_${slug.replaceAll('-', '_')}_bank_seed.sql`);
writeFileSync(outPath, sql);
console.log(`écrit ${outPath} — ${rows.length} items, ${(sql.length / 1024).toFixed(0)} Ko`);
