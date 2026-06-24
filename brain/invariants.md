# 🔒 Invariants — décisions VERROUILLÉES (ne jamais régresser)

Toute violation = régression. On ne les rouvre qu'avec une entrée explicite dans
`decision-log.md`.

## Sécurité du score (zone rouge)

- `fn_submit_attempt` est **l'unique porte d'entrée du score**. Aucun calcul de
  score côté client, jamais (le client ne fait que de l'aperçu sans autorité).
- `answer_key` est **serveur-only**, jamais exposé au client (RLS + vue
  `quest_steps_public` qui exclut `answer_key`).
- Toute fonction touchant au score est `security definer` + `set search_path =
  public, pg_temp` verrouillé.
- RLS **owner-scoped** : un joueur ne lit/écrit que ses propres lignes. Les tables
  de progression ne s'écrivent que depuis `fn_submit_attempt` (security definer).
- **Anti-farming par marge** : seule la marge au-delà du meilleur score (ou les
  items de banque non encore réussis) rapporte de l'XP.
- **Gating des paliers côté serveur** : silver/gold exigent le palier précédent
  (succès demolition, ou seuil de points atteint en banque v2). Le client ne peut
  pas forcer un palier verrouillé.
- **Présence requise pour COMPTER (DEC-015, supersède l'« async-first »)** : toute
  quête rattachée à une station n'est **comptabilisée** (points / XP / maîtrise /
  lignes / classements) qu'avec un **check-in actif**. Sans présence, la partie reste
  **jouable en entraînement** (journalisée `scored=false`, jamais créditée). Gate DOUX
  côté serveur (`fn_submit_attempt` ne bloque plus, il ne crédite pas) + côté client
  (flag `scored`). Décision fondateur (option « présence requise / géo-gate »).

## Source de vérité des données de jeu

- **Le seed SQL (`supabase/seed.sql` + `migrations/**`) est la source de vérité des
  paramètres de jeu. `content/*.json` en est le MIROIR.** En cas d'écart, le JSON
  s'aligne sur le seed (cf. DEC-001), jamais l'inverse sans migration.

## Produit / stratégie

- **Rétention = revenu.** Pas de scale (volume de stations, Manus, breadth) avant
  d'avoir lu la rétention J+1 sur la tranche jouable.
- **Drive = vitrine / sas de contenu, jamais l'état de vérité.** L'état vit dans
  `/brain` (git).

## Source de vérité du code (une seule par sujet)

- **DA = un seul endroit : le bloc `@theme` de `app/src/index.css`** (couleurs de
  marque + Acier sombre + typos). Les composants référencent les **tokens**
  (classes Tailwind `bg-email`/`text-pierre`… ou `var(--color-*)` en style inline).
  **Aucun hex de marque en dur** dans le TSX. Exception tolérée : couleurs
  d'illustration one-off (dégradés/ombres SVG d'un dessin précis) — pas des
  couleurs de marque.
- **FTUE = un seul composant : `components/ftue/Emergence.tsx`** (clé partagée
  `lib/ftue.ts → ONBOARDING_KEY`). L'ancien `Onboarding.tsx` est supprimé.
- **Marc (mascotte 2D) = Rive** via `components/ftue/MarcGuide.tsx` + contrat
  d'inputs (`brain/marc-rive-agent-prompt.md`). Le `marc.glb`/`avatar3d.ts` est
  l'**avatar 3D du joueur sur la carte** (rôle distinct), pas la mascotte.

## Direction artistique / UX (ne pas trancher seul)

- Carte : **tilt 52°** conservé (désorientation signalée au playtest = décision DA
  réservée au board ; affordance possible, retrait non).
- Orientation : **portrait par défaut** ; Bastille (démolition) en **paysage**,
  positionné comme « boss » qu'on choisit, pas premier contact imposé.
- DA « Paris Souterrain » (craie / papier chaud, plaques émaillées) conservée.

## Snapshot de la zone interdite du sprint « Cerveau Augmenté » (2026-06-20)

INTERDIT ce sprint : `supabase/migrations/**`, `supabase/seed.sql`,
`app/src/lib/scoring*`, toute logique score/RLS, toute nouvelle migration, merge
de PR #3, ajout de station. (Conservé ici comme rappel ; les invariants ci-dessus
sont permanents.)
