# Arcadia SubLine — HANDOFF (passation de session)

> But : permettre à **une nouvelle conversation Claude Code** de reprendre le
> travail sans aucune perte de contexte. Lis ce fichier en entier d'abord.
> Dernière mise à jour : 15 juin 2026.

---

## 0. TL;DR — où on en est

- **Branche de travail** : `claude/happy-sagan-16ktg4` (TOUT pousser ici).
- **PR ouverte** : **#3** (draft) vers `main` — CI `verify` (typecheck + tests +
  build) **verte**, preview Netlify OK. Repo : `tdk666/arcadia-subline`.
- **App** : PWA React/TS/Vite/Tailwind/zustand, monorepo pnpm (`app/`, `games/`,
  `content/`, `supabase/`). Build : `pnpm typecheck && pnpm test && pnpm build`
  (doit rester vert — c'est le gate de la PR).
- **Déploiement** : Netlify `arcadia-subline-paris`. ~~Mode DÉMO~~ → **SUPABASE
  BRANCHÉ** (clés posées sur Netlify, scope builds) : le branch-deploy de
  `claude/happy-sagan-16ktg4` sort du mode démo au prochain build.

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
  `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (clé anon legacy ; **pas commitée**,
  elle ne vit que sur Netlify).

➡️ **Reste à faire** : confirmer sur le branch-deploy que le bandeau « mode démo »
a disparu après rebuild, puis enchaîner sur le **réseau complet** (§3, GTFS).

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

## 3. APRÈS Supabase — le réseau complet (vraies stations)

Le front affiche déjà **les 16 lignes** (cf. §5) mais seule la Ligne 1 a ses
stations. Les vraies stations + coordonnées + couleurs officielles viennent du
**GTFS IDFM** (données ouvertes, Licence Mobilités — aucune autorisation requise).

- Pipeline prévu : `supabase/functions/gtfs-ingest/index.ts` +
  `supabase/migrations/...0009_gtfs_staging.sql`.
- Source : Île-de-France Mobilités / plateforme PRIM (`route_color`, `stops` avec
  lat/long, ordre des stations).
- **⚠️ Contrainte environnement** : l'egress réseau du conteneur Claude Code est
  sur **allowlist** — `data.iledefrance-mobilites.fr`, `wikidata`, etc. renvoient
  `403 Host not in allowlist`. Le `curl` direct ne marche pas d'ici.
  - Option A (propre) : faire tourner l'ingestion **côté Supabase** (Edge
    Function `gtfs-ingest`, déployée sur Supabase, qui a accès au net).
  - Option B : demander à l'utilisateur d'ajouter `data.iledefrance-mobilites.fr`
    à l'allowlist d'egress (réglages env Claude Code web), puis générer les JSON.
- **NE JAMAIS** transcrire les 320 stations de mémoire (consigne utilisateur
  ferme : « n'invente rien »). Données réelles uniquement, via GTFS.
- Une fois les stations peuplées : upgrader `NetworkScreen` (schéma actuel) vers
  une **vraie carte géographique** (façon Pokémon GO) à partir des coordonnées.

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
5. **2ᵉ archétype non-physique** (quiz/association) + 2ᵉ station → prouver la
   plateforme (le contrat `games/src/contract.ts` + `registry.ts` est prêt).
6. **Line-pack offline** (jouer dans le tunnel) — le vrai pari « jeu du métro ».
7. **Pipeline de contenu** assisté (génération + curation historienne).
8. Trancher en session DA : **orientation portrait** du mini-jeu (vs paysage).

---

## 8. Conventions

- Développer/pousser sur `claude/happy-sagan-16ktg4` ; `git push -u origin <branche>`.
- PR en **draft** ; garder la CI verte (`pnpm typecheck && pnpm test && pnpm build`).
- Messages de commit en français, descriptifs.
- Surveiller la PR #3 via les webhooks (subscribe_pr_activity) ; ne commenter que
  si nécessaire.
- Ne JAMAIS inventer de données réseau/culturelles — sources réelles uniquement.
