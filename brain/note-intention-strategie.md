# 🎯 Note d'intention — pour la conversation Stratégie (Opus 4.8, connecteur Supabase)

> Destinataire : l'agent stratège qui dispose du connecteur Supabase et va tout examiner.
> Auteur : Claude Code (build). Source de vérité = `/brain` (git) + le code réel.
> Projet Supabase : `pwavyfvxskrsytmqgcvt`. Branche de travail : `claude/ftue-emergence` (PR #5, preview Netlify).

## 1. En une phrase
Arcadia SubLine transforme le métro de Paris en plateau de jeu culturel ; on vient de basculer
le modèle vers **« on conquiert quand on est physiquement sur la ligne »** (présence requise),
et de refondre l'IA des classements. La tranche jouable = **Ligne 1**, 2 stations au contenu prêt
(**Louvre-Rivoli** quiz banque, **Bastille** démolition).

## 2. Décisions structurantes (détail : `decision-log.md`)
- **DEC-012** — Maîtrise SANS FIN (score-chase façon Geometry Dash, pas niveaux Candy Crush) +
  hiérarchie de **titres géographiques contestables**, dérivés d'UNE source de vérité `station_best`
  (meilleur score joueur×station). Ladder : Chef de Station → Maître de la Ligne → Baron du Quartier →
  Maire de l'Arrondissement → Roi de la Rive → Empereur de Paris.
- **DEC-013/014** — Carte épurée (phares pulsants sur stations jouables) ; classements en **tableau
  vertical** ; page « Classement » du menu = **générale** (tout Paris), pas une ligne précise.
- **DEC-015** — **PRÉSENCE REQUISE** (choix fondateur). Gate DOUX : on joue toujours, mais sans
  check-in actif = **entraînement** (non comptabilisé). Supersède l'invariant « knowledge async ».

## 3. État LIVE (vérifiable au connecteur)
- **Migration 0021 appliquée** ✓ (colonne `quest_attempts.scored` présente ; `fn_submit_attempt`
  en gate doux ; `fn_station_leaderboard`/`fn_line_leaderboard` filtrent `scored`).
- Données actuelles : 2 joueurs (TDK666, Agathelabest), 29 tentatives (toutes `scored=true`, antérieures
  au gate), 3 check-ins. `fn_station_leaderboard` renvoie bien : Bastille (TDK666 1184, Agathe 351),
  Louvre (TDK666 40). Classement général = matview `leaderboard_entries` scope `global` (XP).
- **Rétention J+1 : toujours pas lue** (invariant produit : pas de scale avant rétention).

## 4. Traité ce tour (bugs concrets)
- **Bastille — glissement des blocs** : cause RÉELLE trouvée = blocs créés dynamiques puis seulement
  « endormis » (`Sleeping.set`) avec `enableSleeping:false` → ils résolvaient les chevauchements et
  dérivaient. Fix = **statiques pendant la visée**, dynamiques au 1er tir (capture `_original`).
  + courtines dé-chevauchées.
- **Bastille — palier OR gagné en un coup** : 2 barils « tout devant » qui s'enchaînaient. Fix =
  **un seul baril, logé dans le renfoncement derrière le pont-levis** (à mériter), souffle réduit
  (R 140→105). ⚠️ **À PLAYTESTER** : risque que l'OR devienne trop dur (donjon + tour Est blindés fer
  indestructible, chrono). Recalibrage attendu après test fondateur — le connecteur ne suffit pas, il
  faut jouer.
- **Quiz — toujours les mêmes questions** : le biais « illustrées d'abord » resélectionnait le même
  sous-ensemble. Fix = **tirage aléatoire pur + garantie d'≥1 illustrée**.
- **Classement station invisible** : il était masqué quand vide → désormais **toujours affiché**
  (état « sois le premier »). La donnée/fonction marchaient déjà.
- **Attribution OpenStreetMap** : réduite au minimum (CSS discret). ⚠️ **Non supprimable** (licence ODbL) —
  seul un changement de tuiles / auto-hébergement permettrait de l'enlever. Arbitrage produit à faire.

## 5. Chantiers OUVERTS (décision / design requis)
1. **Titres géographiques intermédiaires** (Baron du Quartier, Maire d'Arrondissement, Roi de la Rive) :
   le cœur algorithmique pur existe (`app/src/lib/titles.ts`, testé), MAIS il manque la **donnée de
   rattachement** station→quartier/arrondissement/rive. À sourcer (IDFM + référentiel administratif
   Paris). Tant qu'on a 2 stations sur 1 ligne, ces titres sont dégénérés. Apex « Empereur de Paris »
   = Σ station_best global (faisable : fn_global_leaderboard à écrire, ou réutiliser le scope global XP).
2. **Social** (début) : pouvoir **cliquer sur le profil d'un autre joueur** depuis un classement
   (voir ses titres, son histoire de conquêtes). Fondateur : « pour après », mais c'est le socle social.
3. **Titres → cosmétiques** : les titres/couronnes débloquent **outfits & skins** du perso (partie
   boutique). Fondateur a des idées, à brainstormer. Lier `titles.ts` → catalogue `cosmetics`.
4. **Déverrouillage séquentiel de la ligne** : « on ne peut pas jouer la station suivante si on n'y
   est pas encore » — facette restante de la logique trajet (présence = facette faite). À designer.
5. **Profil** : y afficher **tes positions/couronnes** (où tu es Chef de Station, ton rang global).

## 6. Garde-fous à NE PAS casser (invariants.md)
- `fn_submit_attempt` = **unique porte du score**, `answer_key` jamais côté client, RLS owner-scoped.
- Le **seed SQL/migrations** est la source de vérité des params de jeu ; `content/*.json` en est le miroir.
- DA « Paris Souterrain » ; carte tilt 52° (décision board) ; Bastille en paysage = « boss » choisi.

## 7. Ce que le stratège peut vérifier au connecteur
- `get_advisors` (sécurité/perf) après 0021 — vérifier RLS/policies, index manquants sur `scored`.
- Cohérence `leaderboard_entries` (cron 5 min) vs `fn_*_leaderboard` (temps réel) — deux véracités de
  classement coexistent (XP global vs Σ station_best) : **à trancher** quelle métrique fait foi où.
- ⚑ Dette connue : `quest_attempts(scored)` mériterait un index pour les classements à l'échelle ;
  l'alerte `spatial_ref_sys` (PostGIS) reste un faux positif à *dismiss* dans le dashboard.
