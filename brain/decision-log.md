# 📓 Decision log — ADR léger (append-only)

Une entrée par décision. On n'édite pas le passé ; on ajoute une entrée qui
supersède si besoin. Format : DEC-NNN — titre / cause / décision / statut.

---

## DEC-001 — Bastille : `content/stations/bastille.json` réaligné sur le seed serveur

**Cause.** Les params client étaient périmés. Au palier **Gold**, le client donnait
**4 boulets** alors que le serveur en plafonne **3** (`answer_key.max_shots = 3`).
Dans `fn_submit_attempt`, `v_shots > v_max_shots` ⇒ `flagged`, score 0 → un joueur
honnête (utilisant son 4ᵉ boulet « offert » par le client) était marqué tricheur.
Écarts annexes : `hpMultiplier`, `targetPct` (silver 30 vs 35, gold 40 vs 50),
`timeLimitS` (gold 80 vs 75), `maxShots` (bronze 6 vs 5).

**Décision (board).** Le seed serveur est autoritatif ; le JSON le reflète à
l'identique. La difficulté n'est PAS redébattue ici (réservée à un futur sprint
scoring). Miroir appliqué :

| palier | maxShots | hpMultiplier | targetPct | timeLimitS | reinforced |
|--------|----------|--------------|-----------|------------|-----------|
| bronze | 5 | 1.0  | 0  | 0  | false |
| silver | 4 | 1.45 | 35 | 0  | false |
| gold   | 3 | 1.8  | 50 | 75 | true  |

Self-check : `maxShots(client) == max_shots(seed)` et `targetPct ==
min_destruction_pct(seed)` pour chaque palier — OK.

**Statut.** Appliqué (sprint « Cerveau Augmenté », transaction #001).

**Reste à flaguer (non traité, hors périmètre params-only).** La prose du brief
Gold dans `bastille.json` dit encore « quatre boulets comptés » alors que Gold =
3 boulets ; le `prompt` seed dit « trois boulets ». Copie à corriger dans un sprint
contenu (ne touche pas le scoring). → **Corrigé en DEC-002 (sprint Mise en orbite).**

---

## DEC-002 — PR #3 mergée dans `main` ; la prod passe au Moteur V2

**Cause.** Tout le travail (Preuve du cœur, Moteur V2, Première Minute, Cerveau)
vivait sur `claude/happy-sagan-16ktg4` (PR #3), non mergé → la prod tournait encore
`main = 8866f93` (build antérieur, celui testé par Agathe). Board : Moteur V2
confirmé LIVE en base le 20/06 (player_quest_progress + RLS, points_threshold,
fn_get_quest_progress, bucket public, Louvre 150 items / 3 quêtes banque).

**Décision.** Merge **merge-commit** (pas squash) pour garder la traçabilité des
sprints. Inclut la correction de copie Gold (« quatre/four » → « trois/three »
boulets, cf. dette ouverte par DEC-001). Zéro changement de scoring/migration.

**Statut.** Appliqué (sprint « Mise en orbite »).

---

## DEC-003 — DETTE : registre `supabase_migrations` désynchronisé

**Cause.** Les migrations **0016** (Moteur V2 : `player_quest_progress`,
`points_threshold`, `fn_get_quest_progress`, bucket) et **0017** (banque Louvre,
150 items) ont été appliquées **manuellement via le SQL Editor** (le connecteur MCP
`apply_migration` était down lors du sprint Moteur V2). Les objets sont **vérifiés
live** par le board, MAIS le registre `supabase_migrations` ne les enregistre pas.

**Risque.** Un `db reset` ou une branche Supabase **ne rejouerait pas** 0016/0017
→ schéma incomplet hors prod.

**Décision (à traiter au PROCHAIN sprint touchant la DB, pas maintenant).**
Ré-appliquer 0016/0017 **via le mécanisme de migration** (idempotent) pour
réconcilier le registre. Garde-fou : le seed 0017 ne doit PAS **dupliquer** les
150 items → vérifier le compte `quest_steps` avant/après (upsert par
`(quest_id, position)`, donc normalement neutre). **Règle désormais : toute
migration passe par le mécanisme enregistré, fini le SQL Editor non tracé.**

**Statut.** Ouvert.

---

## DEC-005 — FTUE « L'Émergence » : cinématique d'accueil + Marc = Rive (doublure drop-in)

**Cause.** 1er playtest humain (Agathe) : accueil pas premium, concept mal compris.
Board : viser **la meilleure cinématique d'accueil possible** (niveau studio primé),
avec un **Marc vivant**. Reco outillage : **Rive** (2D vectoriel interactif), pas le
vieux `marc.glb` 3D (lourd, moins expressif).

**Décision.**
- L'intro devient **« L'Émergence »** — séquence-titre jouable (5 actes) qui enacte
  le mythe Ligne 6 ET la **dualité de DA** : Châssis SOMBRE (#111115) → Couche Ville
  CLAIRE (#f6f1e6). Tunnel → émergence → beat de quiz → reveal Malraux → conquête
  (tricolore, ici SEULEMENT) → épilogue guest-first.
- **Marc = Rive** via un **CONTRAT D'INPUTS figé** (`entree, salut, pointe, acquiesce,
  reconforte, celebre`, bool `parle`, number `humeur`). `<MarcGuide>` joue une
  **doublure animée** (poinçonneur PNG + pose CSS/état) tant que `marc.riv` est
  absent ; dès dépôt dans `app/public/mascotte/marc.riv`, **bascule Rive en drop-in**
  sans changer l'API. Le code n'attend pas l'animateur.
- **Long-pole = animation du `.riv`** (humain / freelance, via l'agent Rive de
  l'éditeur). Prompt « god-tier » versionné : `brain/marc-rive-agent-prompt.md`.
- Garde-fous FTUE : **zéro score serveur** (points = décor local), portrait,
  guest-first, tricolore = écran conquête only, reduced-motion = repli, skippable → carte.
- Dette DA mineure : wordmark en **Outfit ExtraBold** (placeholder) — la Bible veut
  **Space Grotesk Black** ; police à charger dans un sprint DA dédié.

**Statut.** Appliqué (cinématique sur doublure, code-splittée, CI verte). En attente
de `marc.riv` (drop-in) + planche de réf Marc (génération image, MCP image down ce tour).
