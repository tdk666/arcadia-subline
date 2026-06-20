# 🧠 Brain — vault Obsidian d'Arcadia SubLine

Home du cerveau. **La version git de ce dossier est la source de vérité unique.**
Le vault Obsidian s'ouvre sur la racine du repo (`.obsidian/` y est) ; les notes
de pilotage vivent ici, dans `/brain`.

## Carte du cerveau

| Note | Rôle | Quand l'ouvrir |
|------|------|----------------|
| [`session-log.md`](session-log.md) | **Où on en est** (état / en cours / prochain geste / bloqueurs) | au début de CHAQUE session |
| [`decision-log.md`](decision-log.md) | Décisions verrouillées (ADR léger, append-only) | avant de (re)débattre un choix |
| [`invariants.md`](invariants.md) | Règles sacrées à ne jamais régresser | avant de toucher scoring / RLS / DA |
| [`source-registry.md`](source-registry.md) | Carte de tout : chemins, ids infra, orbite des agents | quand tu cherches « où est X » |

Le point d'entrée des agents reste [`../CLAUDE.md`](../CLAUDE.md) (racine).

## Comment naviguer

1. `session-log.md` → reprendre le fil.
2. `source-registry.md` → localiser le code/ressource concerné.
3. `invariants.md` + `decision-log.md` → vérifier ce qui est déjà tranché.
4. Ouvrir les **fichiers réels** du repo (règle cardinale : lis le code, pas le résumé).
5. Travailler, puis **mettre à jour `session-log.md`** (+ `decision-log.md` si décision)
   dans la même PR.

## Discipline

- 1 writer par fichier, 1 branche par tâche, merge arbitré par git (anti-clobber).
- Pas d'état de vérité sur le Drive : il sert de vitrine / sas de contenu.
- Historique long ailleurs : [`../docs/HANDOFF.md`](../docs/HANDOFF.md) garde le récit
  détaillé des sprints ; `/brain` garde l'état vivant et les décisions.
