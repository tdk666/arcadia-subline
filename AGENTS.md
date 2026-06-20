# AGENTS.md — Système multi-agent

Ce repo est conçu pour la collaboration entre agents IA (Claude Code, Copilot, Codex)
et un curateur humain (Théophile). La mémoire partagée (« le cerveau ») vit
**dans le repo, versionnée git** — pas sur le Drive.

## Lire d'abord

**→ [`CLAUDE.md`](CLAUDE.md)** (racine) = point d'entrée des agents.

Il pointe vers le cerveau dans [`/brain/`](brain/README.md) :
- [`brain/session-log.md`](brain/session-log.md) — où on en est
- [`brain/decision-log.md`](brain/decision-log.md) — décisions verrouillées (ADR léger)
- [`brain/invariants.md`](brain/invariants.md) — règles sacrées à ne jamais régresser
- [`brain/source-registry.md`](brain/source-registry.md) — carte de tout (chemins, infra, agents)

## Flux standard

```
1. CLAUDE.md (orientation)
   ↓
2. brain/README.md (carte du cerveau)
   ↓
3. brain/session-log.md (où on en était)
   ↓
4. brain/decision-log.md + brain/invariants.md + brain/source-registry.md (contexte validé)
   ↓
5. LIRE LE CODE RÉEL, travailler, puis mettre à jour le cerveau (même PR)
```

## Règles

- **Lis le code réel**, jamais un compte-rendu. Le diff git est l'arbitre.
- **1 writer par fichier, 1 branche par tâche**, merge arbitré par git (anti-clobber).
- Toute PR qui touche le code met à jour `brain/session-log.md` (+ `decision-log.md`
  si décision) **dans le même commit/PR**.
- Aucune dépendance ni configuration à ajouter. Templates Obsidian dispo dans
  `.obsidian/templates/` (le vault s'ouvre sur la racine du repo).

---

**Démarrer maintenant** : [`CLAUDE.md`](CLAUDE.md) → [`brain/README.md`](brain/README.md)
