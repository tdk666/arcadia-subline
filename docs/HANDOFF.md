# Arcadia SubLine — HANDOFF (passation de session)

> But : permettre à **une nouvelle conversation Claude Code** de reprendre le
> travail sans aucune perte de contexte. Lis ce fichier en entier d'abord.
> Dernière mise à jour : 20 juin 2026.

---

## 0ter. Sprint « Moteur V2 » — banque tiérée + seuils + images (20 juin 2026)

Passage du quiz « N questions fixes » au modèle **banque large → tirage → seuil
de points cumulés → image/explication en reveal**. 100 % ADDITIF : démolition et
branche `kind:'minigame'` strictement inchangées.

### Contrat de schéma v2 (content/stations/<slug>.json, `schemaVersion: 2`)
- `progression: { model:'points_threshold', thresholds:{ bronzeToSilver, silverToGold, goldMastery } }`.
- `quests.{bronze,silver,gold}.params`: `{ bankTarget, draw, lives, timerS, questions[] }`.
  - banque Louvre **30/30/90** ; tirage **5/6/8** ; vies **3/2/1** ; chrono **0/12/8 s** ; seuils **30/36/56**.
- item (= 1 quest_step) : `{ stepId(slug, ex. "louvre-b-01"), points, answer, question{fr,en},
  choices[{id,text{fr,en}}], explain{fr,en}, image{url,source,license,attribution,status} }`.
  - `image.status`: `verified` (sourcée+licence) ou `to_verify` (pas d'URL jouable → fallback client).

### Côté serveur (migrations 0016 + 0017, ÉCRITES — à appliquer quand le connecteur Supabase revient)
- **0016** `moteur_v2_banque.sql` :
  - `quests.points_threshold` (NULL = quête non-banque → comportement 0012 inchangé).
  - table **`player_quest_progress`** (player_id, quest_id, points_total, passed_step_ids text[]) ;
    RLS **select-own uniquement**, AUCUNE policy write → écrite seulement par fn_submit_attempt (security definer).
  - **`fn_submit_attempt` v3** (même signature, même autorité) : branche banque
    additive — ne note QUE les items tirés/soumis (`coalesce(payload->>'stepId', id::text)`
    comme clé d'appariement), ne re-crédite jamais un item déjà réussi, cumule vers
    le seuil, gating par seuil du palier précédent. **Démolition byte-identique**
    (payload sans `stepId` → clé = id ; `v_banked` faux → tout le code 0012 s'exécute).
  - **`fn_get_quest_progress(uuid[])`** security definer, owner-only : points cumulés,
    items réussis, seuils, déblocage (calculés SERVEUR — le client affiche, ne décide pas).
  - bucket Storage **`station-images`** public en lecture (write service_role).
- **0017** `louvre_rivoli_bank_seed.sql` : 150 quest_steps GÉNÉRÉS par
  `supabase/scripts/gen-bank-seed.mjs` (station_id résolu par requête, answer_key
  `{"answer"}`, pas de `kind`). Régénérer le fichier après toute édition du JSON.
- ⚠️ **Connecteur Supabase MCP déconnecté pendant ce sprint** → 0016/0017 NON
  encore appliqués en base. À appliquer (`apply_migration`) + vérifier (`execute_sql`)
  dès reconnexion. La **démo tourne sans base** : 100 % jouable, scoring/seuils simulés
  localement (mirroir de 0016 dans `lib/scoring.ts` + `backend/demo.ts`).

### Côté client
- `games/src/quiz/QuizGame.tsx` v2 : carte de **reveal post-réponse** (image si
  `verified` + URL jouable, sinon fallback propre ; **attribution visible** sous
  l'image = obligation de licence ; `explain` ; feedback). Image **jamais avant**
  la réponse (décision board, §2 du brief).
- `GameScreen` tire `draw` items via `drawBank()` en excluant les déjà réussis
  (récupérés par `backend.getQuestProgress`). `StationScreen` affiche les points/seuil
  et le déblocage par palier.
- **Pipeline images** : `supabase/scripts/ingest-station-images.mjs` (Commons → bucket
  Storage, réécrit `payload.image.url`). Clés service_role par ENV, jamais commitées.
  Les 37 images « verified » pointent encore des pages `/wiki/File:` → le client
  fallback (pas d'`<img>`) tant que le rapatriement n'a pas tourné. Hors-périmètre : sourcer les 113 restantes.

### Suivi / dette
- `content.ts` importe les JSON de station en statique → le bundle initial a grossi
  (~+130 Ko avec la banque Louvre). À terme : **lazy-load du contenu de station**
  (import dynamique par slug) quand le nombre de stations augmente.
- Tension answer_key/quiz visible client (cf. 0bis) inchangée : standing rule board
  (pas d'enjeu compétitif tant que non verrouillé serveur).

---

## 0bis. Sprint « Preuve du cœur » — ✅ FAIT (20 juin 2026)

Objectif : prouver la **rétention J1** sur la tranche jouable avant d'élargir.
Trois lots livrés sur `claude/happy-sagan-16ktg4` (PR #3), CI verte.

- **Lot A — Instrumentation réelle.** Table `public.events` (migration
  **0014**, appliquée) : insert-only RLS pour `anon`+`authenticated`, **aucune
  policy SELECT/UPDATE/DELETE** (analyse = service_role), index `(name,server_ts)`
  et `(player_id,server_ts)`. `backend.logEvents(batch)` (Supabase batché non
  bloquant ; démo no-op). `analytics.ts` : `track()` inchangé côté call-sites +
  outbox vidé toutes les 10 s et sur `visibilitychange`/`pagehide` ; `anon_id`
  persistant (`lib/anonId.ts`). Call-sites posés : `first_play`, `session_start`,
  `brief_view`, `drop_off`, `checkin`, `signup_from_guest`, `daily_reward_claim`,
  + existants (`game_start/result/quit`, `station_open`). **Requête rétention J1**
  documentée en commentaire dans `0014_events.sql`.
- **Lot B — 2ᵉ archétype (quiz) + 2ᵉ station (Louvre-Rivoli).**
  `games/src/quiz/QuizGame.tsx` : portrait, full DOM, télémétrie-only, juteux
  (cœurs, série, chrono, révélation verte/rouge), i18n FR/EN, `reducedMotion`.
  Enregistré `orientation:'portrait'` (lazy-load → chunk `QuizGame` ~5 kB).
  Contenu `content/stations/louvre-rivoli.json` (« Le Cabinet des Merveilles »,
  Q1–Q8, paliers durcis **bronze 5q/3 vies/0 s · silver 6q/2 vies/12 s · gold
  8q/1 vie/8 s**). Migration **0015** (appliquée) : `station_id` **résolu par
  requête** (jamais fabriqué), `quest_steps` quiz (`payload`=énoncé/choix/points,
  `answer_key`={"answer":"<id>"}, **PAS** de `kind:'minigame'`) → scorés par
  `fn_submit_attempt` **sans la modifier**. Parité client↔serveur vérifiée en
  base : sans-faute = 50/60/80 pts, succès aux 3 paliers.
- **Lot C — Garde-fous.** Tests : parité scoring quiz (`quiz-scoring.test.ts`),
  parité corrigé contenu↔answer_key + invariants (`quiz-content.test.ts`), RLS
  events (`events-rls.test.ts`). Total **32 tests verts**. Mode démo joue le quiz
  en local (`demo.submitAttempt` branche `previewQuizScore`). i18n FR/EN complété.

### ⚠️ TENSION D'INVARIANT À ARBITRER (fondateur)
Le quiz a besoin de connaître la **bonne réponse côté client** pour le ressenti
immédiat (feedback, vies, série). Donc `content/stations/louvre-rivoli.json` (et
le `payload` des `quest_steps`) **portent le champ `answer`**. L'autorité de
notation reste **exclusivement** `fn_submit_attempt` via `answer_key` (le score,
l'XP, la maîtrise et le classement n'en dépendent jamais) — mais le « corrigé »
est, de fait, **devinable** par un joueur qui inspecte le bundle/contenu.
C'est acceptable pour un quiz culturel grand public (la triche ne lèse que le
tricheur), mais à **trancher** si on veut un mode « compétitif blind » : il
faudrait alors servir les questions **sans** `answer` côté client et faire valider
chaque réponse par un RPC (latence + refonte du ressenti). Décision laissée au
fondateur ; rien n'est verrouillé côté serveur.

---

## 0. TL;DR — où on en est

- **Branche de travail** : `claude/happy-sagan-16ktg4` (TOUT pousser ici).
- **PR ouverte** : **#3** (draft) vers `main` — CI `verify` (typecheck + tests +
  build) **verte**, preview Netlify OK. Repo : `tdk666/arcadia-subline`.
- **App** : PWA React/TS/Vite/Tailwind/zustand, monorepo pnpm (`app/`, `games/`,
  `content/`, `supabase/`). Build : `pnpm typecheck && pnpm test && pnpm build`
  (doit rester vert — c'est le gate de la PR).
- **Déploiement** : Netlify `arcadia-subline-paris`. Clés Supabase
  (`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`, scope builds) **re-posées le
  15 juin (session d'audit)** — elles étaient **absentes** de Netlify lors de
  l'audit (l'API renvoyait 0 variable), donc la prod tournait ENCORE en démo
  malgré la note précédente. ⚠️ Confirmation finale = bandeau « mode démo » qui
  disparaît sur le preview après rebuild (l'outil Netlify de relecture des env
  vars est non fiable ; vérifier de visu).

### ✅ FAIT (15 juin 2026) : SUPABASE EST MONTÉ
Le blocage produit est levé. Réalisé dans la session de reprise :
- **Projet Supabase** créé : `arcadia-subline`, ref **`pwavyfvxskrsytmqgcvt`**,
  région eu-west-3 (Paris), org `hlkdelwxbvwrryhpwehb`. URL :
  `https://pwavyfvxskrsytmqgcvt.supabase.co`.
- **12 migrations** appliquées dans l'ordre (apply_migration, historisées) +
  **seed** (réseau IDFM + Ligne 1 complète (25 stations) + Bastille + 3 quêtes-paliers).
- **Vérifs** : RLS active (18 tables), `fn_submit_attempt` présente, contenu
  Bastille publié. Boucle serveur testée en réel (tx + rollback, zéro résidu) :
  victoire Bronze → score 460 + propagation XP/ligne/streak/mastery ; gating
  Gold-sans-Silver = `TIER_LOCKED` ; télémétrie impossible = `flagged`/score 0.
- **Clés Netlify** (siteId `a259ca2d-073b-4538-a44d-c773a168d38f`, scope builds) :
  `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`. **Constat d'audit (15 juin, 19h)** :
  ces variables étaient **absentes** de Netlify (jamais persistées par la session
  précédente) → re-posées dans la session d'audit. Les clés ne sont **jamais
  commitées** (anon publique, protégée par RLS ; service_role JAMAIS côté client).

➡️ **Reste à faire** : confirmer de visu que le bandeau « mode démo » a disparu
sur le preview PR #3 après rebuild, puis enchaîner sur le **réseau complet** (§3).

---

## 1. Pourquoi cette passation existe

Le connecteur MCP **Supabase** a été activé côté utilisateur mais **n'était pas
attaché à la session en cours** (les connecteurs MCP se chargent au DÉMARRAGE de
la session). La session actuelle n'a donc pas les outils Supabase
(`list_projects`, `apply_migration`, `execute_sql`, `get_anon_key`,
`get_project_url`…). 

**➜ Action : démarrer une NOUVELLE session Claude Code** (le connecteur Supabase
sera alors chargé) et reprendre à partir de la §2.

---

## 2. PROCÉDURE DE REPRISE — monter Supabase (à faire dans la nouvelle session)

Tout le SQL est **déjà écrit** dans le repo. Il ne reste qu'à l'appliquer.

### 2.1 Cibler / créer le projet
1. `list_projects` (outil Supabase MCP) → repérer un projet « arcadia » existant.
   - S'il n'existe pas : `create_project` (org de l'utilisateur, région **eu-west-3 / Paris**, nom `arcadia-subline`). Demander confirmation à l'utilisateur avant de créer (action facturable).
2. Noter le `project_ref`.

### 2.2 Appliquer les migrations (DANS L'ORDRE) + le seed
Fichiers dans `supabase/migrations/` (ordre = ordre alphanumérique des noms) :
```
20260610000001_extensions_enums.sql      -- extensions (postgis, etc.) + enums
20260610000002_referentiel_reseau.sql    -- networks · lines · stations · line_stations · source_refs
20260610000003_contenu_quetes.sql        -- station_content · quests · quest_steps
20260610000004_boucle_de_jeu.sql         -- profils · tentatives · check-ins
20260610000005_monetisation.sql          -- pass/cosmetiques (surfaces futures)
20260610000006_index.sql                 -- index perfs
20260610000007_rls.sql                   -- Row Level Security (CRUCIAL)
20260610000008_leaderboards.sql          -- vues classement
20260610000009_gtfs_staging.sql          -- staging d'ingestion GTFS
20260611000010_score_serveur.sql         -- fn_submit_attempt (score 100% serveur, anti-triche)
20260611000011_audit.sql                 -- journal d'audit
20260611000012_paliers_minijeu.sql       -- paliers bronze/argent/or, gating, mastery
```
Puis `supabase/seed.sql` (réseau IDFM + Ligne 1 + Bastille + quêtes, aligné sur
`content/lines/ligne-1.json` et `content/stations/bastille.json`).

- Méthode recommandée : `apply_migration` (un appel par fichier, nom = nom du
  fichier) pour que Supabase historise. Sinon `execute_sql` avec le contenu.
- **Vérifs post-migration** : tables `networks/lines/stations/quests/quest_attempts`
  présentes ; RLS activée ; fonction `fn_submit_attempt` existe ; le seed a bien
  inséré le réseau + la Ligne 1 + Bastille.

### 2.3 Câbler les clés sur Netlify (le connecteur Netlify EST dispo)
- `get_project_url` + `get_anon_key` (outils Supabase) → récupérer URL + clé anon.
- Poser les variables sur Netlify via
  `mcp__Netlify__netlify-project-services-updater` op `manage-env-vars` :
  - `siteId` = **`a259ca2d-073b-4538-a44d-c773a168d38f`** (projet `arcadia-subline-paris`, team `69272d75aec06c440e19afae`)
  - `VITE_SUPABASE_URL` = <project url>
  - `VITE_SUPABASE_ANON_KEY` = <anon key>  (scope builds ; `upsertEnvVar: true`)
- Redéclencher un déploiement (`mcp__Netlify__netlify-deploy-services-updater`
  op `deploy-site`, même siteId) OU pousser un commit.

**Comment l'app bascule** (réf `app/src/lib/backend/index.ts`) : si
`VITE_SUPABASE_URL` **et** `VITE_SUPABASE_ANON_KEY` sont présentes au build →
`SupabaseBackend`, sinon `DemoBackend`. Donc dès que les deux clés sont sur
Netlify et qu'un build tourne, le bandeau « mode démo » disparaît.

### 2.4 Vérifier la boucle réelle
- Sur la preview/prod : jouer Bastille Bronze → gagner → le score doit passer par
  `fn_submit_attempt` (pas d'aperçu local), apparaître au classement.
- Tester la file invité : gagner en invité → créer un compte → la tentative est
  rejouée via `fn_submit_attempt` (cf. `store/index.ts` `flushPending`).

---

## 3. Réseau métro — ✅ STATIONS PEUPLÉES (15 juin 2026)

**Les 321 stations de métro sont en base, avec leurs vraies coordonnées IDFM.**

- **Source retenue** : référentiel LÉGER IDFM open data, dataset ODS
  **`arrets-lignes`** (arrêt ↔ ligne ↔ mode + lat/lon). PAS le GTFS-horaires
  complet : bufferisé en mémoire il déclenche `WORKER_RESOURCE_LIMIT` (Edge
  Functions plafonnées à **256 Mo sur tous les plans**). `arrets-lignes` filtré
  côté serveur (`where=mode = "Metro"`) tient large en mémoire.
- **Edge Function** : `supabase/functions/idfm-gares/index.ts` (déployée,
  `verify_jwt=false`). Modes `inspect` (sonde le schéma) et `ingest`
  (filtre métro → staging → RPC `fn_gtfs_match_and_upsert`). Pilotée par body.
- **Invocation** : depuis Postgres via `pg_net` (`net.http_post`) — le conteneur
  Claude Code ne peut pas joindre `*.supabase.co/functions` (egress allowlist).
- **Résultat** : 805 lignes métro source → 315 créées + 490 reliées →
  **321 stations distinctes, 100 % géolocalisées**, 0 doublon. 16 lignes vues
  (1,2,3,3bis,4,5,6,7,7bis,8,9,10,11,12,13,14). 3 collisions de nommage
  (La Défense/Palais Royal/Saint-Paul) fusionnées sur les stations seedées.
- `gtfs-ingest` (GTFS-horaires complet) reste au repo mais **inutilisable sur
  free tier** (OOM). À réserver à un runtime hors-Edge ou egress conteneur ouvert.

### ✅ AUSSI FAIT (même session) : 16 lignes + topologie
- **16 lignes en base** avec **couleurs officielles IDFM** (`referentiel-des-lignes`,
  `colourweb_hexa`) : M1–M14 + M3B (3bis) + M7B (7bis). 15/18 (Grand Paris Express)
  écartées (pas encore ouvertes, aucune station en service).
- **Topologie `line_stations` reconstruite pour les 16 lignes** (405 entrées) par
  **projection des stations sur le tracé officiel** (`traces-des-lignes...`,
  `route_type=Subway`) via PostGIS `ST_LineLocatePoint`. Validée EXACTE sur la
  Ligne 1 (reproduit l'ordre seed). **Termini corrects et à jour** (extensions
  récentes incluses : M4→Bagneux, M11→Rosny, M12→Aubervilliers, M14→Pleyel↔Orly).
- Runbook reproductible : `supabase/scripts/build_metro_network.sql`.

### Reste à faire sur le réseau
- **Ordre EXACT aux embranchements** : la projection est exacte pour les lignes
  linéaires, mais **approximative aux fourches** (M7, M10, M13 : branches/boucle).
  Pour l'ordre exact de branche → `stop_times` GTFS (cf. `gtfs-ingest`, extension
  point n°1) sur un runtime hors-Edge (le GTFS-horaires complet OOM en Edge 256 Mo).
- **Noms de lignes** : M2–M14/M3B/M7B portent un libellé générique « Ligne N » ;
  M1 garde son nom terminus seedé. Enrichir avec les termini officiels si voulu.
- **NE JAMAIS** transcrire des stations de mémoire (« n'invente rien ») —
  données réelles IDFM uniquement.

### ✅ AUSSI FAIT : carte géographique (front)
- **`NetworkScreen` affiche désormais le réseau RÉEL** : carte SVG projetée
  (équirectangulaire + correction cos(lat)) depuis les vraies coordonnées, tracés
  dans l'ordre officiel, correspondances en pastilles. Offline-first, zéro tuile
  externe. La Ligne 1 est mise en avant et tactile (1-tap → conquête).
- Données bundlées : **`content/network-geo.json`** (321 stations + 16 lignes,
  export Supabase). Lib `app/src/lib/geo.ts` + composant `components/NetworkMap.tsx`.
- `content/network.json` : couleurs alignées sur l'officiel IDFM.
- Gate vert localement : `pnpm typecheck && pnpm test (12) && pnpm build`.
- Suite possible : pan/zoom tactile, plan d'une ligne (`LineMapScreen`) nourri par
  `network-geo.json` au lieu du tracé schématique M1 en dur.

---

## 4. Carte du repo (où est quoi)

```
app/src/
  lib/backend/{index,demo,supabase,types}.ts  -- abstraction backend (démo/supabase)
  lib/content.ts                              -- NETWORK (16 lignes) + LINE (M1) + stations
  lib/feedback.ts                             -- haptique + clack WebAudio (juice UI)
  lib/analytics.ts                            -- events privacy-first (track)
  lib/scoring.ts (+ .test.ts)                 -- miroir client de la formule de score
  components/Button.tsx                        -- bouton « physique » (DA Royal Match)
  screens/NetworkScreen.tsx                    -- NOUVELLE home : le réseau (16 lignes)
  screens/LineMapScreen.tsx                    -- plan d'une ligne (route /line/:code)
  screens/{Station,Game,Leaderboard,Profile,Collection}Screen.tsx
games/src/demolition/                          -- archétype démolition (engine.ts = moteur Matter+canvas)
content/network.json                           -- registre des 16 lignes
content/lines/ligne-1.json, stations/bastille.json
supabase/migrations/*.sql, seed.sql, functions/gtfs-ingest/
docs/{AUDIT,DA_UX_DIRECTION,HANDOFF}.md
```
Drive (contexte stratégique, via connecteur Google Drive) : « Document de Vision
& Manifeste (v1.0) », « Direction DA & UX », « Audit Inspecteur », ERD mermaid,
business model, `app-map`/`app-map-v2` (HTML), zip des migrations.

---

## 5. Ce qui a été livré sur cette branche (PR #3)

1. **P0 instrumentation** (`lib/analytics.ts`) + **CI** (`.github/workflows/ci.yml`,
   job `verify`) + **tests** (`scoring.test.ts`, 12 tests).
2. **Session DA (P1 #4)** : composant `Button` physique, `lib/feedback` (haptique
   + clack), 1-tap-to-play, correctifs **anti-crop/scroll** (viewport `100dvh`,
   briefing & onboarding défilables).
3. **Juice de combat** : cris de récompense + combos in-game dans `engine.ts`
   (ÉTENDARD!/DOUBLE!/TRIPLE!/LIBERTÉ!), défaite encourageante.
4. **Structure réseau-first** : `content/network.json` (16 lignes), `NetworkScreen`
   (home façon carte-monde Pokémon GO + signalétique métro), routes `/` (réseau)
   et `/line/:code`.

---

## 6. Décisions stratégiques verrouillées (sourcées)

- **8 archétypes de jeu suffisent.** Preuve : Subway Surfers = 1 seule mécanique,
  150 M joueurs/mois, fraîcheur via reskins thématiques mensuels. La variété vient
  du **skin culturel par station + paramètres + saisons + méta**, pas du nombre de
  mécaniques. La « personnalisation » = MA ligne / mon trajet / mes rivaux.
- **Arbitrage des références** : Pokémon GO → la carte/territoire (home) ;
  Subway Surfers → modèle de contenu (peu de mécaniques + reskins + saisons) &
  parcours sans friction ; Candy Crush → progression + éloge ; Royal Match →
  boutons physiques/juice (déjà appliqué).
- **Doctrine localisation** (vision §5) : jouable sans géoloc, mieux avec check-in,
  magique avec capteurs. Plancher d'abord (line-pack offline), magie ensuite.
- **Données** = IDFM/PRIM (ouvertes), PAS « RATP ». Marque : ne PAS copier
  l'identité RATP.

---

## 7. Roadmap (séquence d'audit, après Supabase)

1. ✅ Instrumenter — 2. ✅ CI + tests — 3. **Supabase réel** (cette passation) —
   4. ✅ Session DA — puis :
5. ✅ **2ᵉ archétype non-physique (quiz) + 2ᵉ station (Louvre)** — livré sprint
   « Preuve du cœur » (cf. §0bis). Plateforme prouvée : 2 archétypes, 2 stations.
6. **Lire la rétention J1** dès qu'il y a des joueurs (requête dans `0014`), puis
   décider de l'élargissement (3ᵉ archétype / 3ᵉ station / pipeline contenu).
7. **Line-pack offline** (jouer dans le tunnel) — le vrai pari « jeu du métro ».
8. **Pipeline de contenu** assisté (génération + curation historienne).

---

## 8. Conventions

- Développer/pousser sur `claude/happy-sagan-16ktg4` ; `git push -u origin <branche>`.
- PR en **draft** ; garder la CI verte (`pnpm typecheck && pnpm test && pnpm build`).
- Messages de commit en français, descriptifs.
- Surveiller la PR #3 via les webhooks (subscribe_pr_activity) ; ne commenter que
  si nécessaire.
- Ne JAMAIS inventer de données réseau/culturelles — sources réelles uniquement.
