// Rapatriement des images « verified » vers Supabase Storage (bucket public
// station-images/<slug>/...), puis réécriture de payload.image.url côté contenu.
// Réutilisable pour chaque station. Process de SOURCING séparé (hors-périmètre du
// sprint moteur) : ce script ne fait QUE le transfert Commons → Storage.
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     node supabase/scripts/ingest-station-images.mjs louvre-rivoli
//
// SÉCURITÉ : la clé service_role vient de l'ENV, JAMAIS du repo. Ne jamais la
// committer. Le script s'exécute hors prod (poste mainteneur / CI protégée).
// Après exécution : régénérer le seed (gen-bank-seed.mjs) puis appliquer la
// migration pour que la base porte les URLs Storage.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, extname } from 'node:path';

const slug = process.argv[2] ?? 'louvre-rivoli';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'station-images';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans l\'environnement.');
  process.exit(1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const jsonPath = resolve(root, `content/stations/${slug}.json`);
const data = JSON.parse(readFileSync(jsonPath, 'utf8'));

/** Résout l'URL fichier réelle d'une page Commons « File:... » via l'API. */
async function resolveCommonsUrl(pageUrl) {
  const title = decodeURIComponent(pageUrl.split('/wiki/')[1] ?? '');
  if (!title.startsWith('File:')) return null;
  const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url&titles=${encodeURIComponent(title)}`;
  const res = await fetch(api, { headers: { 'User-Agent': 'ArcadiaSubLine/1.0 (image ingest)' } });
  if (!res.ok) return null;
  const j = await res.json();
  const pages = j?.query?.pages ?? {};
  const first = Object.values(pages)[0];
  return first?.imageinfo?.[0]?.url ?? null;
}

/** Upload binaire vers Storage (REST). Public en lecture (policy 0016). */
async function uploadToStorage(path, bytes, contentType) {
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: bytes,
  });
  if (!res.ok) throw new Error(`upload ${path}: ${res.status} ${await res.text()}`);
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

let migrated = 0;
let skipped = 0;
for (const tier of ['bronze', 'silver', 'gold']) {
  for (const item of data.quests[tier]?.params?.questions ?? []) {
    const img = item.image;
    if (!img || img.status !== 'verified' || !img.url) { skipped++; continue; }
    if (!img.url.includes('/wiki/')) { skipped++; continue; } // déjà rapatriée

    try {
      const fileUrl = await resolveCommonsUrl(img.url);
      if (!fileUrl) { console.warn(`  ⚠ ${item.stepId} : URL Commons non résolue`); skipped++; continue; }
      const bin = await fetch(fileUrl, { headers: { 'User-Agent': 'ArcadiaSubLine/1.0' } });
      const buf = Buffer.from(await bin.arrayBuffer());
      const ext = (extname(new URL(fileUrl).pathname) || '.jpg').toLowerCase();
      const path = `${slug}/${item.stepId}${ext}`;
      const publicUrl = await uploadToStorage(path, buf, bin.headers.get('content-type') ?? 'image/jpeg');
      img.url = publicUrl; // hotlink Commons remplacé par l'URL Storage
      migrated++;
      console.log(`  ✓ ${item.stepId} → ${path}`);
    } catch (e) {
      console.warn(`  ✗ ${item.stepId} : ${e.message}`);
      skipped++;
    }
  }
}

writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n');
console.log(`Terminé : ${migrated} rapatriées, ${skipped} ignorées. Régénère le seed (gen-bank-seed.mjs) puis applique la migration.`);
