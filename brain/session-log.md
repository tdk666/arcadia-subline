# 🧭 Session log — où on en est

> LE fichier unique de reprise. Remplace les sources divergentes (Drive, résumés).
> Mets-le à jour à la fin de CHAQUE PR.

## ÉTAT (2026-06-20)

- **Branche de travail** : `claude/happy-sagan-16ktg4` → **PR #3** (draft, ouverte,
  CI `verify` verte). Tête : sprint « Cerveau Augmenté » au-dessus de `419017e`.
- **`main` = `8866f93`** → la **prod** (Netlify `arcadia-subline-paris`) tourne donc
  un build **antérieur au Moteur V2 et au sprint Première Minute** (PR #3 NON mergée).
  C'est ce build ancien qu'Agathe a testé le 20/06.
- **Empilé sur PR #3, non mergé** :
  - Sprint « Preuve du cœur » : 2ᵉ archétype (quiz) + station Louvre-Rivoli v1.
  - Sprint « Moteur V2 » : banque tiérée 30/30/90, seuils de points, images en
    reveal (migrations 0016/0017 **écrites**).
  - Sprint « Première Minute » : onboarding → carte (Louvre mis en avant, plus de
    Bastille forcé), quiz thème clair lisible, feedback couleur corrigé, résultat
    sans « maîtrise 0 », jauge cible Bastille.
  - Sprint « Cerveau Augmenté » : ce vault `/brain` + DEC-001 (Bastille réaligné).
- **Rétention J+1 : NON lue** (aucun joueur réel sur un build à jour tant que PR #3
  n'est pas mergée).

## EN COURS

- Transaction #001 (Bastille mirror) + matérialisation du cerveau — cette PR.

## PROCHAIN GESTE

1. **Merger PR #3** (décision Théophile/board) → la prod passe enfin au Moteur V2 +
   Première Minute.
2. **Re-test 3–5 humains neufs** sur le parcours Louvre (quiz portrait, première
   minute) — pas Bastille en premier.
3. **Lire la rétention J+1** (requête documentée dans `migrations/...0014_events.sql`).
   Pas de scale (Manus / nouvelles stations) avant cette lecture.

## BLOQUEURS / À VÉRIFIER

- **Supabase MCP intermittent** : les migrations **0016/0017 (Moteur V2)** ont été
  ÉCRITES mais leur application live n'a **pas pu être vérifiée** par Claude Code
  (connecteur down lors des sprints concernés). **À confirmer** avant/au merge :
  si elles ne sont pas appliquées, la prod quiz tournera l'ancien moteur.
  Ref projet : `pwavyfvxskrsytmqgcvt` (eu-west-3).
- Flags board ouverts (cf. `decision-log.md` + `docs/HANDOFF.md`) : option A Bastille
  (étendards seule condition de victoire — touche `answer_key`, donc futur sprint
  scoring) ; copie « quatre boulets » Gold à corriger ; tilt 52° (décision DA).
