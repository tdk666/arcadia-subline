# 🧭 Session log — où on en est

> LE fichier unique de reprise. Remplace les sources divergentes (Drive, résumés).
> Mets-le à jour à la fin de CHAQUE PR.

## ÉTAT (2026-06-20)

- **PR #3 MERGÉE dans `main`** (merge-commit, sprint « Mise en orbite »). La
  **prod** (Netlify `arcadia-subline-paris`, build de `main`) passe enfin au
  **Moteur V2 + Première Minute** (avant : `main = 8866f93`, build qu'Agathe avait
  testé). Branche de travail `claude/happy-sagan-16ktg4` désormais fusionnée.
- **Moteur V2 confirmé LIVE en base** (board, 20/06) : `player_quest_progress`
  (RLS + 1 policy select-own), `points_threshold`, `fn_get_quest_progress`, bucket
  `station-images` public, Louvre-Rivoli 150 items / 3 quêtes banque.
- Contenu prod : Bastille (démolition, paysage, boss) aligné sur le seed (DEC-001)
  + copie Gold corrigée (3 boulets) ; Louvre-Rivoli (quiz portrait, banque).
- **Rétention J+1 : NON lue** (la prod vient seulement de passer à jour).

## EN COURS

- **FTUE « L'Émergence »** (DEC-005) sur `claude/ftue-emergence` : cinématique
  d'accueil premium construite sur la **doublure Marc** (drop-in Rive). Reste : que
  Théophile produise `marc.riv` via l'agent Rive (prompt : `brain/marc-rive-agent-prompt.md`)
  → dépôt dans `app/public/mascotte/` = bascule auto. + planche de réf Marc (image).
- PR #4 (discipline déploiement Netlify, DEC-004) : ouverte, non mergée.

## PROCHAIN GESTE

1. **Re-test 3–5 humains NEUFS** sur le parcours Louvre (première minute → carte →
   quiz portrait), build de prod à jour. Observer, ne pas guider.
2. **Lire la rétention J+1** (requête dans `migrations/...0014_events.sql`).
   Pas de scale (Manus / nouvelles stations) avant cette lecture.

## BLOQUEURS / À VÉRIFIER

- **DETTE DB (DEC-003)** : registre `supabase_migrations` désync — 0016/0017
  appliqués à la main (SQL Editor), non enregistrés. Objets OK en prod, mais un
  `db reset` ne les rejouerait pas. À réconcilier au prochain sprint touchant la DB
  (réappliquer via le mécanisme, idempotent, sans dupliquer les 150 items).
- Flags board ouverts : option A Bastille (étendards seule condition de victoire —
  touche `answer_key`, futur sprint scoring) ; tilt 52° de la carte (décision DA).
- Ref infra : Supabase `pwavyfvxskrsytmqgcvt` (eu-west-3) ; voir
  `source-registry.md`.
