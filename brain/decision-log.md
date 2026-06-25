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

---

## DEC-012 — Architecture de jeu : maîtrise sans fin + hiérarchie de titres géographiques

**Cause.** Fondateur : « compétition SANS FIN pour être Maître d'une station » + hiérarchie
de titres (Chef de Station → Roi de Ligne → Boss de Quartier → Maire d'Arrondissement →
Élu de la Rive → Empereur de Paris). Contrainte : « on joue dans la rame / sur le quai ».

**Décision (validée).**
- Maîtrise = **score-chase + classement, façon Geometry Dash** (PAS niveaux Candy Crush ; les
  paliers restent la rampe d'apprentissage finie, l'Or ouvre le mode Maître sans fin).
- **Hiérarchie de titres = couronnes contestables** dérivées d'**UNE source de vérité** :
  `station_best` (joueur × station → meilleur score). Tous les titres supérieurs = agrégation
  (Σ) de `station_best` filtrée par appartenance géo (ligne / quartier / arrondissement / rive / empire).
- **Présence = âme des titres** (Manifeste §5) : async jouable (plancher), mais check-in vérifié
  = multiplicateur + couronne « Vérifiée » qui prime. Géoloc jamais bloquante.
- Chaque titre : défendable (notif « couronne tombée »), rapporte des points de prestige, public.
- Détail complet + phases A→E dans **`brain/architecture-jeu.md`**. Clans = après (Manifeste §11).

**Statut.** Architecture validée & documentée. Cœur algorithmique pur (`lib/titles.ts`) implémenté
& testé (DB-agnostique). Reste : wiring serveur (station_best + classements) = migrations additives
soignées (`fn_submit_attempt` signature intacte, `answer_key` jamais exposé) — prochain sprint DB.

---

## DEC-013 — Carte : direction visuelle « claque » (phare héros pulsant + halo des stations)

**Cause.** Reprise du plan de bataille initial (#7 « beautification carte »). Objectif
fondateur : échelle humaine type Pokémon GO, un point focal « tape-moi », la ligne jouable
qui « respire ». Contrainte : travail à l'aveugle (le sandbox ne rend pas la WebGL) → additif,
défensif, jugé en preview.

**Décision.**
- **Phare héros pulsant** sur la station d'entrée (`HERO_SLUG = louvre-rivoli`, alignée FTUE +
  contenu) : `StyleImageInterface` canonique MapLibre (canvas, zéro asset) — cœur laiton (#c9a227)
  cerclé d'ivoire + onde qui se propage en boucle. Couche `hero-beacon` au-dessus de tout,
  tappable (ouvre la fiche station). `icon-size` dégressif au zoom.
- **Halo chaud sous les stations jouables** (`stations-halo`, sous `stations`) : disque laiton flou,
  opacité/rayon croissants au zoom → la ligne paraît « allumée », sans masquer les pastilles.
- Tout en try/catch additif : aucune couche existante retirée, base `curate()` + lignes + pastilles
  intactes. Si une couche manque dans le style tiers → no-op silencieux.

**Statut.** Appliqué (typecheck + 71 tests + build verts). À valider visuellement en preview (PR #5).
Suite possible : pulse sur la « prochaine station à conquérir » (état joueur), transitions de sélection.

---

## DEC-014 — IA des classements + carte « jouable maintenant » (retours fondateur live)

**Cause.** Test live fondateur : (1) le podium ne convient pas → veut un **tableau vertical**.
(2) La page « Classement » du menu montrait « Maître de la Ligne 1 » — incohérent : on n'est pas
forcément sur la Ligne 1, une page de menu doit être **générale**. Le classement station se voit
À LA station, ses positions dans le **Profil**. (3) Carte : pourquoi Louvre-Rivoli en or et pas
Bastille ? Confusion = le phare unique semblait arbitraire. (4) Message d'attribution OpenFreeMap relou.

**Recherche (best-in-class, méthodo « voir ce que font les meilleurs »).** Foursquare **Swarm** :
le **Leaderboard** (général/amis) est une surface DISTINCTE des **Mayorships** (couronne par lieu,
contre tout le monde). Confirme l'intuition fondateur : général ≠ par-lieu, deux surfaces.

**Décision.**
- **Tableau vertical** partout (composant `Leaderboard` réécrit) : 1 rang/ligne, top-3 accentué
  (or/argent/bronze), couronne sur le 1er, ligne « TOI » + cible « +N pts pour dépasser ». Fini le podium.
- **Page « Classement » = GÉNÉRALE** (`getGlobalLeaderboard`) : tout Paris, tous joueurs, lecture de
  la matview `leaderboard_entries` scope `global` (XP total — **aucun SQL nouveau**, matview 0008).
  Apex narratif = « Empereur de Paris ». Le classement par station reste à la station (Chef de Station) ;
  les positions perso iront au Profil (prochaine passe).
- **Carte** : le phare pulsant marque les **stations au contenu prêt** (`playableStations()` =
  Louvre-Rivoli + Bastille), pas une station dorée arbitraire → réponse claire au « pourquoi celle-ci ».
  **Halo large retiré** (carte volontairement minimale, retour fondateur).
- **Attribution** réduite : `attributionControl` custom compact « © OpenStreetMap » replié en bas.
  NB : l'attribution OSM est **légalement obligatoire** (licence ODbL) — non supprimable, seulement
  minimisable (un « ⓘ » sur mobile). Suppression totale = changer de tuiles / auto-héberger.

**Statut.** Appliqué (typecheck + 71 tests + build verts). À valider en preview.
**Ouvert (décision fondateur requise).** Logique « on joue quand on est sur la ligne » : voir proposition
d'archi (réconciliation séquentielle + maîtrise async) — contredit un invariant verrouillé (async jouable),
donc à trancher AVANT toute reconstruction. Profil « tes couronnes/positions » = passe suivante.

---

## DEC-015 — Présence requise pour conquérir (gate de présence généralisé)

**Cause.** Fondateur (test live) : « il faut vraiment reconstruire l'app : on est censé la
jouer quand on est SUR la ligne ; on ne peut pas jouer la station suivante si on n'y est pas. »
Question d'archi posée (3 options) ; choix = **« Présence requise (géo-gate) »** : on ne marque
des points / ne conquiert QUE physiquement présent ; en async = entraînement, sans points.

**Recherche (best-in-class).** Foursquare **Swarm** : la **Mayorship** (couronne d'un lieu) se
gagne par la présence répétée — la présence EST le cœur de la couronne. Conforte le choix.

**Décision.**
- **Gate de présence DOUX et généralisé** : toute quête rattachée à une station n'est
  **comptabilisée** (points/XP/maîtrise/lignes/classements) qu'avec un **check-in actif**.
  Sans présence, la partie reste **jouable en ENTRAÎNEMENT** (non créditée, hors classement).
- **Supersède** l'invariant « knowledge async-first » (les quiz comptaient sans présence).
  L'app reste découvrable/jouable (entraînement, FTUE, démo) — on ne bloque jamais le JEU,
  on conditionne le SCORE. Le check-in (déclaratif aujourd'hui, photo/trajet demain) est la porte.
- **Serveur** : `fn_submit_attempt` passe du blocage dur `exploration ⇒ CHECKIN_REQUIRED` à un
  gate doux (`scored` calculé par présence ; journalise toujours, ne crédite que si présent).
  Colonne `quest_attempts.scored` (default true ⇒ historique intact) ; classements station/ligne
  filtrent `scored`. Migration **0021_presence_gate.sql** (versionnée, à appliquer après revue —
  PAS de paste à l'aveugle sur la porte de score sacrée).
- **Client/démo** : flag `AttemptResult.scored` ; le store ne crédite/débloque que si `scored`.
  Bannière « Entraînement · non comptabilisé » au résultat + bannière de présence à la station.

**Statut.** Tranche client+démo LIVE (typecheck + 71 tests + build verts) : démontre le modèle
tout de suite (en démo le check-in est libre → preview 100 % jouable). Serveur = migration 0021
prête, à appliquer délibérément (connecteur ou paste validé). NB préview live : tant que 0021 n'est
pas appliquée, le scoring live reste inchangé (tout compté) — seule la démo montre le gate complet.

---

## DEC-016 — Correctifs jeu (Bastille physique/équilibre, quiz aléatoire, classement station) + note stratégie

**Cause.** Retours fondateur (test live) : glissement Bastille NON résolu ; OR gagné en un coup
(explosif tout devant) ; quiz « toujours les mêmes questions » ; classement station absent ; demande
d'une note d'intention pour la conversation stratégie (connecteur Supabase).

**Décisions.**
- **Glissement Bastille — cause racine** : blocs créés dynamiques puis seulement `Sleeping.set` (avec
  `enableSleeping:false`) → ils résolvaient les chevauchements et dérivaient. Correctif définitif :
  **`Body.setStatic(true)` pendant la visée**, `setStatic(false)` (blocs + étendards uniquement, jamais
  sol/murs) au 1er tir. + courtines dé-chevauchées (Ouest-Donjon 635→709, Donjon-Est 794→866).
- **OR jouable mais pas trivial** : 2 barils « tout devant » → **1 baril dans le renfoncement derrière
  le pont-levis** (à mériter) ; souffle **R 140→105**. ⚑ À PLAYTESTER (peut devenir trop dur).
- **Quiz vraiment aléatoire** : le biais « illustrées d'abord » figeait le sous-ensemble. Tirage
  **aléatoire pur + garantie d'≥1 illustrée**. Tests `drawBank` réécrits (variété + garantie).
- **Classement station toujours visible** (même vide → « sois le premier ») ; la donnée/fonction
  marchaient (Bastille/Louvre renvoient des rangs) — c'était l'affichage conditionnel qui masquait.
- **Attribution OSM** rendue discrète (CSS) ; rappel : non supprimable (ODbL).
- **Note d'intention stratégie** : `brain/note-intention-strategie.md` (handoff complet).

**Reporté (noté pour la stratégie/boutique)** : titres géo intermédiaires (manque data quartier/
arrondissement/rive), social (clic profil d'un joueur), titres→cosmétiques (skins boutique),
déverrouillage séquentiel de la ligne, positions/couronnes au Profil.

**Statut.** Appliqué (typecheck games+app + 71 tests + build verts). Migration 0021 confirmée en base.

---

## DEC-017 — DA = système DEUX COUCHES, Bible v3.0 source unique

**Cause.** Labels DA flottants/périmés (« Paris Souterrain », « Cyberpunk ») vs la vérité de la
Bible (`docs/BRAND_BOOK_V3.md`, v3.0). Le code et le brain devaient dire la même chose qu'elle.

**Décision.**
- **`docs/BRAND_BOOK_V3.md` = source unique de la DA.** `index.css @theme` = les tokens LIVE qui
  la reflètent (en cas d'écart, index.css s'aligne sur la Bible).
- **Deux couches** : (1) **Châssis** SOMBRE premium (Acier Obscur `#111115` + Laiton `#c9a227`) —
  marque / métagame / nuit ; (2) **Couche Ville « Métro Clair »** CLAIRE (Craie `#f6f1e6` + Bleu
  Émail `#0a5a9e` + Vert Guimard `#3f6b4d`) — carte / jeu / jour.
- Tokens sombres (`--color-acier`, `-2`, `-hi`) **déjà présents** dans `index.css` (vérifié) :
  rien à ajouter, l'Acte 0 de la FTUE les a. Labels « Paris Souterrain »/« Cyberpunk » périmés.

**Statut.** Acté. invariants.md + note-intention §6 alignés sur la Bible.

---

## DEC-018 — Présence = flag runtime (multiplicateur futur), JAMAIS un gate (supersède DEC-015)

**Cause.** DEC-015 avait fait de la présence un gate (check-in requis pour compter). Arbitrage
board : c'est trop dur pour le test J+1 (play-from-anywhere doit compter) et philosophiquement
la présence doit être un **bonus**, pas une barrière (cohérent avec le pitch d'origine).

**Décision.**
- `fn_submit_attempt` lit un réglage runtime **`arcadia.presence_required`** (défaut **false**) :
  flag absent/false ⇒ `scored=true` toujours ⇒ **tout compte, partout**. Migration **0022**
  (redéfinit la fonction à l'identique de 0021 SAUF le bloc présence, désormais conditionné).
- Miroir client **`app/src/lib/flags.ts → PRESENCE_REQUIRED` (false)** : éteint la surface UI de
  présence (bannière station, logique « entraînement ») tant que le gate est off — sinon elle
  mentirait. Démo respecte le flag (tout compte). Code de présence conservé, dormant.
- La présence reviendra comme **multiplicateur / couronne « Vérifiée »**, jamais un mur.
- **Réactivation in-situ** (sans redeploy) : `ALTER DATABASE postgres SET arcadia.presence_required='true';`
  + passer `PRESENCE_REQUIRED=true` dans `flags.ts`.

**Statut.** Client LIVE (flag off, surface éteinte). Serveur : **migration 0022 prête** ; à appliquer
via `apply_migration` quand le connecteur Supabase revient (déconnecté en fin de sprint) — PAS de
SQL Editor. Tant que 0022 n'est pas appliquée, le live reste sur 0021 (présence requise) : **le test
J+1 n'est pas lisible sans 0022**. Priorité fondateur.

---

## DEC-019 — 0022 appliquée en prod + registre réconcilié (board, 2026-06-24)

**Fait (par le board, connecteur vérifié).**
- **Migration 0022 APPLIQUÉE en prod.** `fn_submit_attempt` live = version flag (DEC-018). Vérifié :
  `arcadia.presence_required` absent ⇒ **défaut OFF ⇒ `scored=true` partout** (test J+1 lisible).
  Zone rouge intacte (auth requise, `answer_key` jamais renvoyé, advisory lock, anti-farming sur
  `scored`, DEFINER + search_path) ; **anon ne peut PAS exécuter** ; `quest_steps=153` inchangé.
- **Registre réconcilié** : 0016, 0017, 0018, 0019, 0021 enregistrés **en MÉTADONNÉE** (corps NON
  rejoués → pas de régression de fonction). `db push` les saute désormais (landmine désarmé).

**Conséquence.** L'état LIVE = présence OFF (play-from-anywhere compte). Le client (flag off) est
cohérent. La réactivation future reste : `ALTER DATABASE postgres SET arcadia.presence_required='true'`
+ `PRESENCE_REQUIRED=true` (flags.ts).

**Statut.** Acté. note-intention §3 + session-log + invariants (interdit `db push`) mis à jour.

---

## DEC-023 — Art-direction de l'intro portée de Claude Design (film 3-transitions)

**Cause.** Le board a livré le film « L'Émergence » (cold-open) via Claude Design ; on le PORTE
dans le vrai stack (pas de DOM mock collé). Le connecteur Design est inaccessible en remote
(auth interactive) → bundle fourni en local (artefact compilé 3,6 Mo, frame apex SVG = Acier +
halo laiton + « EMPEREUR » craie) ; l'art-direction vient du brief + de cette frame.

**Décision.**
- **Easings nommés en tokens CSS** : `--ease-emergence` (0.16,1,0.3,1), `--ease-conquest`
  (0.34,1.56,0.64,1), `--ease-authority` (0.22,1,0.36,1). Reveals sur grille ~200 ms.
- **Grain filmique CONSTANT** (`.film-grain`, feTurbulence SVG, opacité ~0.06, overlay) sur les
  4 temps. **Gloss** (`.plaque-gloss`) UNIQUEMENT sur les plaques émail.
- **Une clé chaude** (Craie/Laiton) qui reconquiert le noir ; Châssis Acier = son absence.
- **3 transitions CONTINUES** (caméra tenue, board persistant qui morphe) : T0→T1 light-wipe ·
  T1→T2 push-in (scale dans Bastille) · T2→T3 pull-out. Apex kinétique lettre-par-lettre
  (`.apex-letter`), drapeau overshoot (`.flag-plant`), couronne `.crown-radiate`, flamme `.flame-flicker`.
- **Slots réels câblés** : pose Marc « pointe »/« celebre »/« salut » (contrat réel), sfx WebAudio
  (rumble→whoosh→chime, sparkle). **Embeds live MapLibre/Matter.js = 2e passe visuelle** (rendu non
  vérifiable à l'aveugle sur l'écran le plus critique ; choix fondateur « film fiable d'abord »).

**Statut.** Appliqué — `Emergence.tsx` réécrit en 4 temps, REMPLACE la cinématique 7-actes. Verts.
À valider visuellement en preview (fidélité frames Design + on-device).

---

## DEC-024 — Couche de COMPRÉHENSION diégétique de l'intro (correctif fondateur)

**Cause.** L'ancienne intro n'enseignait pas « où je suis / ce que je fais / pourquoi revenir ».
Exigence : le texte écran SEUL doit le dire, sans mur de texte.

**Décision (les 3 réponses, en mots, une fois).**
- **OÙ / QUOI** : carte T1 lisiblement métro (ligne 1 en or, **noms réels** LOUVRE-RIVOLI/BASTILLE/
  GARE DE LYON en petites-capitales espacées, **icônes-âmes** distinctes par nœud = « un jeu différent
  par station ») + une ligne d'orientation : « Paris. Le métro est ton terrain. Chaque station, un jeu. »
- **JE FAIS QUOI** : T2 enseigne le verbe « conquérir » EN LE FAISANT (démolition imperdable) ; à la
  chute, **drapeau LIBÉRÉE** (conquête, JAMAIS un rang faux) + repère COMPTABLE « 1 station prise. La
  ligne t'attend. » + flash tradition « C'est une révolte ? — Non, Sire… · 14 JUILLET 1789 ».
- **POURQUOI REVENIR** : T3 échelle lisible « De Chef de Station à Empereur de Paris », apex kinétique,
  **couronne VERROUILLÉE-rayonnante** (but à mériter), flamme « Jour 1 », **balise est Gare de Lyon** =
  un « prochain » = reviens demain. PAS de bouton « Commencer » : le seul CTA = la balise.

**Honnêteté (intacte)** : « ta conquête » pas « ta ligne » ; firstStation = PARAMÈTRE (défaut Bastille) ;
géo = bonus futur, jamais un gate. i18n FR+EN. Test de compréhension à valider sur un inconnu en preview.

**Statut.** Appliqué. Verts. Tué : 7-actes, « métro boulot dodo », faux quiz/rang, « Mémoire n°002 »,
fleur-de-lys ⚜ (sauf marqueur archive culturel), « Commencer sans compte » en gate.

---

## DEC-025 — Intro « colle au jeu » : vrais composants embarqués (MapLibre T1 + Bastille T2)

**Cause.** Décision fondateur après l'audit board (qui recommandait de garder le WebGL hors du film) :
« on prend le vrai jeu de Bastille + utilise MapLibre aussi, je veux que l'intro colle au jeu. »
Risque assumé (rendu non vérifiable à l'aveugle) ; mitigé par fallbacks.

**Décision.**
- **T1 = vraie carte MapLibre** (`MapView`, lazy + Suspense) plein écran ; copie de compréhension +
  CTA « Prends Bastille » par-dessus ; tap sur la station Bastille → assaut.
- **T2 = vrai jeu Bastille** (`DemolitionGame` / Matter.js, lazy + Suspense) avec **ctx INDULGENT**
  (maxShots 30, targetPct 0, hpMultiplier 0.5) → non-bloquant ; `onFinish`/`onQuit` → conquête
  décernée (drapeau LIBÉRÉE + flash tradition). **onFinish N'EST PAS soumis au serveur** (zéro score
  FTUE — invariant intact). NB : la fronde reste moins « tap-imperdable » que la version scriptée ;
  filet « passer › » + ✕ du jeu = jamais coincé.
- **Robustesse** : `IntroBoundary` (AppLayout) rattrape tout crash → dépose sur la carte + marqué vu ;
  Suspense sur chaque embed ; « Passer » toujours visible. Un échec d'embed ne peut pas piéger un testeur.
- T0/T3 restent SVG/CSS (apex = plateau Bastille conquise). « ta conquête » ; firstStation = copy.

**Statut.** Appliqué. typecheck (games+app) + 71 tests + build verts. **Validation device obligatoire**
(le board l'avait posée comme condition) : framing portrait du jeu, feel caméra MapLibre, rythme.
