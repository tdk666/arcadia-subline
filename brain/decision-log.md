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

---

## DEC-006 — Personas verrouillés dans le brain + « Victory Moment » (persona Collégiens)

**Cause.** Le fondateur pointe un doc Drive « plein de personas ». Localisé : **Bible
DA V3.0, Partie V** (7 parcours commuters). Le brain devant être la source de vérité
versionnée, les personas sont recopiés dans `brain/personas.md` (+ 5 lois UX + état
code par persona + backlog priorisé).

**Décision.**
- **`brain/personas.md`** devient la référence UX : toute décision produit se justifie
  par rapport aux 7 personas + 5 lois UX + audit Inspecteur.
- **Premier lot livré = « Victory Moment »** (persona 7 « Collégiens » + juice
  transverse, 100 % frontend, zéro asset/backend) :
  - `components/Confetti.tsx` : confettis tricolores (GPU pur, reduced-motion safe).
    **Invariant respecté : tricolore = victoire/conquête only.**
  - `lib/feedback.ts ▸ victory()` : fanfare (arpège majeur) + haptique.
  - `lib/share.ts` + bouton ResultView : **Web Share API** (vecteur d'acquisition
    organique #1 « vanité ») → repli presse-papier → no-op. Instrumenté. 5 tests.
  - `Button.tsx` : **verrou anti ghost-touch (350 ms)** — le retour sensoriel répond à
    chaque tap, mais l'action ne part qu'une fois → protège `fn_submit_attempt` des
    doubles soumissions (règle Royal Match de la Bible).
- **Personas 4 (Clan) & 6 (Guide)** explicitement **hors scope frontend** : chantiers
  backend/realtime (zone scoring sacré) à arbitrer en sprint dédié. Modèle solo by design.

**Statut.** Appliqué (typecheck + 43 tests + build verts).

---

## DEC-007 — Défi du Jour (rituel quotidien + 1-tap-to-play express) + Drive réconcilié

**Cause.** Exploration Drive demandée (« une seule source de vérité »). Personas
localisés (Bible DA V3.0, DEC-006). En plus : **board** réclame « définir + enseigner
la boucle 30 s + rituel station du jour + résultat partageable » ; **playtest Agathe**
juge le parcours « trop long, trop d'objectifs ». Audit P1 #7 + loi UX #2 = 1-tap-to-play.

**Décision.**
- **Défi du Jour** = le rituel quotidien + porte de la boucle cœur :
  - `lib/challenge.ts` (pur, 8 tests) : choisit UN défi/jour = prochain palier sensé,
    rotation déterministe par jour, priorité progression puis rejeu.
  - `NetworkScreen` : le CTA bas (thumb-zone) devient « Défi du jour » (station + palier
    + flamme/série) → **1-tap** vers `/play/<slug>/<tier>?x=1`.
  - `GameScreen` : **mode express** (`?x=1`) saute le briefing **uniquement** si la
    station est déjà connue (≥ 1 palier gagné) → on enseigne une fois (1er contact =
    brief), puis 1-tap pour toujours. Gate `progressReady` (ne pas tirer avant la
    progression de banque). Invariant intact : `fn_submit_attempt` reste l'unique porte.
- **Réconciliation Drive ↔ brain** (consignée dans `source-registry.md`) : le brain
  prime ; PR #3 déjà mergée ; géoloc « canapé » reversée → trajet ; DA reste claire
  (ne pas rebasculer en sombre) ; ⚑ mismatch Bastille targetPct/answer_key à aligner
  en sprint scoring dédié.

**Statut.** Appliqué (typecheck + 51 tests + build verts). Personas 4/6 toujours backend.

---

## DEC-008 — Hauts faits (méta-progression « trophées ») + hygiène i18n Touriste

**Cause.** Cap « Game Awards » : profondeur qui récompense le retour (persona Stratège).
+ Touriste : ne jamais piéger un visiteur dans une langue, et purger les pièges de
source de vérité.

**Décision.**
- **Hauts faits** : `lib/achievements.ts` (pur, testable) = catalogue de 7 trophées
  (prédicats sur un instantané de l'état LOCAL — aucune autorité de score). Toast
  global `AchievementToast` avec **anti-spam par ligne de base figée au 1er rendu**
  (les trophées déjà acquis ne re-célèbrent pas ; pas de changement de schéma store).
  Grille « Hauts faits » au Profil. Son fort réservé à la victoire de jeu (toast = haptique seul).
- **Touriste / i18n** : bascule FR/EN dès le 1er écran (FTUE) ; `<html lang>` au 1er
  rendu ; **suppression du bloc `onboarding.*`** (mort + cadrage « canapé » reversé).

**Statut.** Appliqué (typecheck + 57 tests + build verts). Tout sur PR #6 (empilée sur #5).

---

## DEC-009 — Mini-jeux : retours fondateur (HUD, chrono, musique, images) + miroir Atelier

**Cause.** Test fondateur : Bastille = pas de % / temps « en live » perçus ; Louvre = pas
d'images d'œuvres, pas de chrono visible, pas de musique, boutons qui débordent. Directive :
mirrorer tout le Drive mini-jeux dans le brain.

**Décision (frontend, scoring intact).**
- **Drive → brain** : `brain/mini-jeux.md` recopie l'intel Atelier (8 archétypes, 10 boss,
  banque/images Louvre + IMAGE_LOG, spec Bastille, exigences UX). Source-registry pointe dessus.
- **Quiz** : chrono **chiffré** (⏱ Ns) à côté de la barre ; **musique** ambiante
  « Cabinet des Merveilles » (`games/src/quiz/audio.ts`, WebAudio, mute, dispose) ;
  **anti-débordement** (zone question `min-h-0`+scroll → les choix restent visibles).
- **Images** : le contenu a déjà des `verified` mais rares ; le tirage **biaise vers les
  items illustrés** (`drawBank(prefer=isUsableQuizImage)`, 2 tests) → le joueur voit l'art.
  (Compléter les URLs verified = TODO Atelier.)
- **Bastille** : HUD **% chiffré proéminent** (gros chiffre + barre + cible) ; chrono gold
  inchangé (bronze/silver sans timer = voulu). **Correctif factuel** brief argent : les
  invalides DÉFENDAIENT (Gardes françaises = assaillants).

**Statut.** Appliqué (typecheck app+games + 59 tests + build verts). ⚑ targetPct↔answer_key
(sprint scoring) et complétion images verified = ouverts.

---

## DEC-010 — Alerte sécurité Supabase « rls_disabled_in_public » → durcissement RLS

**Cause.** Mail Supabase (22/06/2026) : une table de `public` est exposée via l'API
SANS RLS (« publicly accessible »). Or le dépôt active la RLS sur **toutes** ses
tables (0007 boucle + events 0014 + player_quest_progress 0016 + gtfs_stops_staging
0009). ⇒ la table fautive a été créée **hors migrations** (SQL Editor à la main —
lié à la dette DEC-003), OU c'est la **matview `leaderboard_entries`** exposée à anon.

**Décision.**
- **Migration `0018_rls_hardening.sql`** (idempotente) : active la RLS (deny-by-default)
  sur TOUTE table de base de `public` qui ne l'a pas. Sûr : service_role bypasse la RLS
  (ingestion/Edge/fn_submit_attempt) ; les tables à lecture client ont déjà leurs
  policies ; fermer une table inconnue par défaut = choix sûr, jamais une fuite.
- **Matview `leaderboard_entries`** : ne supporte pas la RLS. Données non sensibles
  (display_name + scores). Si l'Advisor la signale, correctif propre = la sortir de
  l'API (RPC security definer + REVOKE anon) — changement applicatif, traité à part.
- **Application PROD** : le connecteur Supabase MCP est indisponible ce tour → la
  migration est **versionnée** mais **pas encore appliquée en prod**. À appliquer via
  `get_advisors`+`apply_migration` (MCP rétabli) OU par le fondateur (SQL Editor).
- **DEC-003 ESCALADÉ** : la dette de registre (0016/0017 hand-applied) a maintenant une
  conséquence sécurité. Réconcilier le registre + n'appliquer QUE par le mécanisme.

**MISE À JOUR (23/06) — RÉSOLU (faux positif).** Diagnostic exécuté par le fondateur :
la SEULE table sans RLS est `public.spatial_ref_sys` (table système PostGIS, données EPSG
de référence publiques) ; **les 20 tables Arcadia ont toutes la RLS = true**. `spatial_ref_sys`
appartient à l'extension/`supabase_admin` → impossible (et inutile) d'y activer la RLS
(ERROR 42501). **Aucune donnée exposée, aucune vulnérabilité réelle.** Migration 0018
corrigée : exclut les tables d'extension + avale `insufficient_privilege` → no-op propre
(filet pour de futures tables créées à la main). Action restante : **dismiss/acknowledge**
l'alerte dans le dashboard Supabase (Advisors). DEC-003 (registre) reste à réconcilier.

**Statut.** RÉSOLU (faux positif PostGIS). Migration 0018 corrigée & committée.

---

## DEC-011 — Images du quiz Louvre : URLs de page wiki → URLs directes (bug d'affichage)

**Cause.** Retour fondateur répété « on ne voit pas les images des œuvres ». Diagnostic :
les 37 items `verified` portaient des URLs de **page** Wikimedia (`commons.wikimedia.org/
wiki/File:…`), or `isUsableQuizImage` exige une URL d'image directe et **rejette tout
`/wiki/`**. Résultat : 0 image affichable malgré `status:'verified'`, et le biais de
tirage (DEC-009) sans effet.

**Décision.**
- Conversion des 37 URLs en **URLs directes** `upload.wikimedia.org/wikipedia/commons/
  <h>/<hh>/<fichier>` (chemin MD5 canonique de Wikimedia, calculé localement — proxy
  bloque l'API Commons). Mappings question→image inchangés (remplacement texte brut).
- **Test anti-régression** (`quiz-content.test.ts`) : toute image `verified` doit
  satisfaire `isUsableQuizImage` (sinon CI rouge). Aurait attrapé le bug.
- Reste **TODO Atelier** : compléter les 113 `to_verify` (license + URL directe). Ajouter
  de nouvelles œuvres = travail Atelier (ne pas inventer la culture / risque 404 d'URL).

**Statut.** Appliqué (typecheck + 60 tests + build verts). 37/37 verified désormais affichables.
