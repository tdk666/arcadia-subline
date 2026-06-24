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
- **Présence = MULTIPLICATEUR derrière un FLAG, JAMAIS un gate (DEC-018, supersède DEC-015)** :
  arbitrage board. Le jeu compte **partout** (play-from-anywhere) ; la présence ne bloque
  jamais le score. Réglage runtime serveur `arcadia.presence_required` (**défaut false**) +
  miroir client `lib/flags.ts → PRESENCE_REQUIRED` (défaut false). `fn_submit_attempt` lit le
  flag : absent/false ⇒ `scored=true` toujours. La présence redeviendra un multiplicateur /
  couronne « Vérifiée » plus tard, jamais un mur. (La colonne `quest_attempts.scored` + la
  mécanique restent en place, dormantes.)

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

- **DA : le SYSTÈME = la Bible v3.0 (`docs/BRAND_BOOK_V3.md`), source unique de la
  direction artistique. Les TOKENS LIVE = le bloc `@theme` de `app/src/index.css`**
  (qui doit refléter la Bible). Les composants référencent les **tokens** (classes
  Tailwind `bg-email`/`text-pierre`… ou `var(--color-*)`), **aucun hex de marque en dur**
  dans le TSX (exception : couleurs d'illustration one-off). En cas d'écart Bible↔index.css,
  index.css s'aligne sur la Bible.
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
- **DA = système DEUX COUCHES (Bible v3.0)** : (1) **Châssis** SOMBRE & premium —
  Acier Obscur `#111115` + Laiton `#c9a227` — pour la marque / le métagame / la nuit
  (menus profonds, boutique, classements, Acte 0 FTUE) ; (2) **Couche Ville « Métro
  Clair »** CLAIRE — Craie `#f6f1e6` + Bleu Émail `#0a5a9e` + Vert Guimard `#3f6b4d` —
  pour la carte / le jeu / le jour. Les labels « Paris Souterrain » et « Cyberpunk »
  sont **PÉRIMÉS**. Tokens : `--color-acier*` (sombre) + `--color-craie/email/...` (clair)
  déjà présents dans `index.css`.

## Snapshot de la zone interdite du sprint « Cerveau Augmenté » (2026-06-20)

INTERDIT ce sprint : `supabase/migrations/**`, `supabase/seed.sql`,
`app/src/lib/scoring*`, toute logique score/RLS, toute nouvelle migration, merge
de PR #3, ajout de station. (Conservé ici comme rappel ; les invariants ci-dessus
sont permanents.)
