# CLAUDE.md — point d'entrée des agents

> Tu lis ce fichier en premier, à chaque session. Puis `/brain/`.

## Le projet en 5 lignes

**Arcadia SubLine** transforme le métro de Paris en plateau de jeu culturel :
chaque station porte une histoire et un mini-jeu (quiz, démolition…). Tu joues
en **touchant une station sur la carte — de n'importe où, pas de géoloc requise**.
Tu gagnes des points, débloques l'histoire du lieu, conquiers ta ligne, grimpes
au classement. Monorepo pnpm : `app/` (PWA React/TS/Vite/Tailwind/zustand),
`games/` (archétypes de jeu), `content/` (JSON éditorial), `supabase/` (SQL).

## Le cerveau vit dans `/brain/` (source de vérité unique, versionnée git)

- [`/brain/README.md`](brain/README.md) — carte du vault, comment naviguer.
- [`/brain/session-log.md`](brain/session-log.md) — **où on en est** (toujours à jour).
- [`/brain/decision-log.md`](brain/decision-log.md) — décisions (ADR léger, append-only).
- [`/brain/invariants.md`](brain/invariants.md) — règles VERROUILLÉES, jamais régresser.
- [`/brain/source-registry.md`](brain/source-registry.md) — carte de tout (chemins, ids, agents).

Le vault Obsidian s'ouvre sur **la racine du repo** (`.obsidian/` est à la racine) ;
les notes vivent dans `/brain`.

## Règle cardinale : LIS LE CODE RÉEL

Ne te fie à aucun compte-rendu (ni Drive, ni résumé, ni ce fichier pour les
détails techniques). Avant d'écrire : ouvre les fichiers réels cités
(`supabase/seed.sql`, `migrations/**`, `games/src/**`, `content/**`). Le diff git
est l'arbitre, pas la prose.

## Orbite des agents (détail : `/brain/source-registry.md`)

Board (stratégie/audit) · **Claude Code = build (toi)** · Atelier Culturel (contenu) ·
Manus (volume, post-rétention) · Gemini/Codex (revue 2ᵉ œil) · Théophile (curate/merge).
Anti-clobber : **1 writer par fichier, 1 branche par tâche, merge arbitré par git.**

## Cadence (obligatoire à chaque PR)

Toute PR qui touche le code met à jour, **dans le même commit/PR** :
`/brain/session-log.md` (l'état) et, si une décision est prise,
`/brain/decision-log.md` (nouvelle entrée DEC-NNN). Pas de mise à jour du cerveau
hors-git (le Drive est une vitrine, jamais l'état de vérité).
