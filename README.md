# Arcadia SubLine

> Le métro parisien comme plateau de jeu culturel — chaque station porte une
> histoire et un mini-jeu lié à son nom. Conquiers ta ligne.

**Tranche verticale livrée** : Ligne 1 · station **Bastille** · archétype
**démolition** (« La Prise de la Bastille »), jouable en 3 paliers
Bronze → Argent → Or, guest-first, score serveur-autoritatif, check-in manuel,
PWA installable.

## Architecture

```
/app        PWA mobile-first — Vite · React · TS · Tailwind 4 · zustand · PWA
/games      Framework de mini-jeux pluggable (@arcadia/games)
            contrat GameProps/GameResult · registre d'archétypes · démolition (Matter.js)
/content    Donnée éditoriale (lignes, stations, récits, paramètres de paliers)
/supabase   11 migrations + micro-migration 0012 (paliers) + seed + Edge Function GTFS
```

Principes structurants :

- **Score serveur-autoritatif** — l'app n'évalue jamais une partie : elle envoie
  la télémétrie brute à la RPC `fn_submit_attempt(p_quest_id, p_answers,
  p_duration_ms)` qui note, journalise, propage XP/maîtrise/classement et
  renvoie `{ score, success, xp_gained, mastery, flagged }`. Jamais le corrigé.
- **Paliers = quêtes distinctes** — `quests.difficulty` (migration 0012), même
  terrain, paramètres durcis ; seuils autoritatifs dans `quest_steps.answer_key`
  (invisible client), gating bronze→argent→or vérifié côté serveur.
- **Localisation = sur-couche** — interface `PresenceProvider` pluggable ;
  MVP : check-in manuel (`check_ins`, confiance/TTL/cooldown imposés serveur).
  Le jeu reste 100 % jouable sans. Emplacements prêts : photo/IA, inertiel, QR.
- **Guest-first** — on joue sans compte ; à la 1ʳᵉ victoire, « Sauve ta
  conquête » ; les tentatives invitées sont rejouées via `fn_submit_attempt`
  après inscription (file `pending`).
- **Mode démo** — sans clés Supabase, l'app simule tout localement (bandeau
  visible) : idéal pour tester l'UX sans backend.

## Démarrer en local (léger — Chromebook ok)

```bash
git clone <repo> && cd arcadia-subline
corepack enable && pnpm install      # ~200 Mo de node_modules, rien de natif
pnpm dev                             # http://localhost:5173 (mode démo)
```

## Brancher Supabase

1. Dans ton projet Supabase : SQL Editor → exécuter les migrations de
   `supabase/migrations/` dans l'ordre (0001 → 0012), puis `supabase/seed.sql`.
   (Ou : `supabase db push` + `supabase db seed` avec le CLI.)
2. `cp app/.env.example app/.env` puis renseigner :
   ```
   VITE_SUPABASE_URL=https://<projet>.supabase.co
   VITE_SUPABASE_ANON_KEY=<clé anon publique>
   ```
3. `pnpm dev` — auth réelle, scores via `fn_submit_attempt`, classement de ligne.
4. (Optionnel) Ingestion du référentiel GTFS IDFM :
   `supabase functions deploy gtfs-ingest --no-verify-jwt` puis
   `POST {"network_id":"11111111-1111-4111-8111-111111111111"}` avec la clé
   service_role.

## Déployer (build cloud)

Netlify lit `netlify.toml` à la racine : connecter le repo → chaque push sur la
branche déclenche `pnpm install && pnpm build` côté Netlify et publie
`app/dist`. Renseigner `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` dans
*Site settings → Environment variables* pour passer du mode démo au mode réel,
puis *Trigger deploy*.

## Ajouter un mini-jeu (contrat exact)

1. Créer `games/src/<archetype>/MonJeu.tsx` exportant **default** un composant
   `GameProps` :
   ```ts
   { ctx: GameContext, onFinish(r: GameResult), onQuit() }
   // GameContext : { questId, stationId, stationSlug, difficulty,
   //                 params, locale, reducedMotion }
   // GameResult  : { completed, clientWin, durationMs,
   //                 answers: GameAnswers }   ← télémétrie BRUTE, jamais un score
   ```
2. L'enregistrer dans `games/src/registry.ts` :
   `registerGame({ archetype: 'quiz', load: () => import('./quiz/QuizGame') })`
   (chargé en lazy, code-splitté automatiquement).
3. Côté données : une quête par palier avec `quest_steps.payload`
   (`kind:'minigame'`, paramètres client) et `answer_key` (seuils serveur), et
   l'entrée `/content/stations/<slug>.json` qui pointe l'archétype.
4. Côté serveur : ajouter la branche de validation de télémétrie dans
   `fn_submit_attempt` si l'archétype a des règles spécifiques (modèle :
   migration 0012, branche `demolition`).

Prochains archétypes prévus : `quiz`, `maze` (labyrinthe), `match`
(association), `defense`, `words` (mots), `rhythm` (rythme), `build`
(construction — Tour Eiffel).

## Licences & données

Données transport : Île-de-France Mobilités (PRIM / transport.data.gouv.fr),
Licence Mobilités — ingérées par l'Edge Function `gtfs-ingest`.
