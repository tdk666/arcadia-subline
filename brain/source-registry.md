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

### Drive — carte des dossiers (vitrine ; le brain prime en cas de conflit)

Racine `1BhB7HttCdWGay9RVxAKjc-QInRXBz2O8` :
- `00_STRATEGIE` `13BwRC0kREwov3ml4ug46hepdRFvfWc5R` — Vision & Manifeste v1.0
  (`1p8RzDI7...MZtXo`), **Bible DA V3.0** (`1lt2b3T5...194aXs`, **personas en Partie V →
  recopiés dans `brain/personas.md`**), Audit Inspecteur (`1CwlROe...RG-_I`), Direction DA & UX.
- `01_PRODUIT_UX` (vide) · `02_TECH_DATA` · `03_GTM_BRANDING` · `05_FINANCE_LEGAL` ·
  `04_ARCHIVES_2020` (legacy).
- `06_MINI_JEUX` `1vqOb44...EoxS` — RESERVOIR « un jeu par âme de station » (canon
  8 archétypes + bosses), APPROFONDISSEMENT louvre/bastille (polish contenu, post-build),
  et sous-dossier **`LOUVRE RIVOLI`** `1FpeRsAFIBzLlSItxOzvli_dPsbHdhLfC` (banque 150
  `louvre-rivoli.json` + `louvre-rivoli_IMAGE_LOG.md`). **Recopié dans `brain/mini-jeux.md`.**
- `07_STRESS_TESTS` `1cEhyH...eFsA8` — **playtest Agathe 20/06** (vérité terrain).
- `08_VISUELS` · `09_MARC` `1i-71p...y6muM` (réfs Marc).
- Docs racine : BOARD_HANDOFF 2026-06-20, BRIEF_CLAUDE_CODE_SPRINT_PREUVE, État du Projet.

**Réconciliation (juin 2026) : le brain SUPERSÈDE ces docs sur 2 points.**
1. Docs (19-20/06) disent « merge PR #3 » → **DÉJÀ fait** (session-log : PR #3 dans `main`).
2. Docs recommandent « jouable de partout / canapé » → **REVERSÉ par le fondateur** :
   l'âme = **reconquête du TRAJET** (jouer depuis la station), géoloc = bonus. (DEC, CLAUDE.md.)
**Encore vrais & utiles :** pains Agathe (« trop long », « je joue en cliquant ou en y
étant ? » ×3, « à quoi sert le compte ? ») ; directive board « définir+enseigner la
boucle 30 s + rituel station du jour + résultat partageable » (→ lot Défi du Jour +
partage) ; DA actuelle = **claire/Belle Époque** (le « cyberpunk sombre » est futur,
NE PAS rebasculer le thème) ; ⚑ mismatch `bastille.json` targetPct 30/40 vs answer_key
35/50 (à aligner, touche le score → sprint dédié).

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
