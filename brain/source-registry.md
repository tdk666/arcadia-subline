# 🗺️ Source registry — carte de tout

Où vit quoi. Quand tu cherches « où est X », commence ici, puis ouvre le fichier réel.

## Dépôt (monorepo pnpm)

| Domaine | Chemin | Notes |
|---------|--------|-------|
| App PWA | `app/src/` | React 19 / TS / Vite / Tailwind v4 / zustand |
| — backend abstrait | `app/src/lib/backend/{index,types,supabase,demo}.ts` | démo (sans clés) ↔ supabase |
| — aperçu score (SANS autorité) | `app/src/lib/scoring.ts` | miroir client ; **zone rouge, ne pas dériver du serveur** |
| — contenu typé | `app/src/lib/content.ts` | charge `content/*.json` |
| — i18n | `app/src/i18n/{fr,en}.ts` | FR/EN, clés strictement parallèles |
| Mini-jeux | `games/src/` | `contract.ts`, `registry.ts` |
| — démolition (Bastille, paysage) | `games/src/demolition/` | moteur Matter + canvas |
| — quiz (portrait, banque v2) | `games/src/quiz/` | thème clair, reveal post-réponse |
| Contenu éditorial | `content/stations/*.json`, `content/lines/`, `content/network*.json` | **miroir du seed** |
| SQL | `supabase/migrations/`, `supabase/seed.sql`, `supabase/functions/` | **zone rouge** |
| Docs récit | `docs/HANDOFF.md` | historique détaillé des sprints |
| Cerveau | `CLAUDE.md`, `brain/`, `.obsidian/` (racine) | état + décisions (source de vérité) |

## Scoring — fichiers autoritatifs (LIS-LES avant tout sujet score)

- `supabase/migrations/20260611000010_score_serveur.sql` — `fn_submit_attempt` v1.
- `supabase/migrations/20260611000012_paliers_minijeu.sql` — v2 (paliers, branche
  mini-jeu vs quiz, gating).
- `supabase/migrations/20260620000016_moteur_v2_banque.sql` — v3 (banque, seuils,
  `player_quest_progress`, `fn_get_quest_progress`). **Écrite ; application live à
  confirmer.**
- `supabase/seed.sql` — params Bastille AUTORITATIFS (≈ lignes 105-122).
- `supabase/migrations/20260620000017_louvre_rivoli_bank_seed.sql` — banque Louvre (généré).

## Infra

| Service | Identifiant | Région / détail |
|---------|-------------|-----------------|
| Supabase (projet) | ref `pwavyfvxskrsytmqgcvt` | eu-west-3 (Paris) |
| Netlify (site) | `arcadia-subline-paris` | déploie `main` (prod) + previews PR |
| GitHub | `tdk666/arcadia-subline` | branche travail `claude/happy-sagan-16ktg4`, PR #3 |
| Drive (QG, vitrine) | dossier `1BhB7HttCdWGay9RVxAKjc-QInRXBz2O8` | **jamais l'état de vérité** |

## Orbite des agents

| Agent | Rôle |
|-------|------|
| **Board** | stratégie, audit, arbitrage des décisions |
| **Claude Code** (toi) | build : code + cerveau, dans la même PR |
| **Atelier Culturel** | contenu (questions, lore curés) — alimente `content/` |
| **Manus** | volume de contenu, **post-rétention seulement** |
| **Gemini / Codex** | revue « 2ᵉ œil » |
| **Théophile** | curate / merge (décision humaine finale) |

**Règle anti-clobber : 1 writer par fichier, 1 branche par tâche, merge arbitré
par git.** Personne n'écrit l'état hors git.
