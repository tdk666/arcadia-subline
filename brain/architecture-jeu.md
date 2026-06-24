# 🏛️ Architecture de jeu — la boucle de maîtrise (PROPOSITION à valider)

> Réponse à : « je veux une **compétition sans fin pour être le Maître d'une station** »
> (améliorer continuellement son score sur UNE station). Ancré dans le Manifeste v1.0
> (§3 « rejouabilité façon Geometry Dash », §4 « Maître de la station », §6 « rétention=revenu »).
> Statut : **proposition** — à valider avant migration DB (zone scoring sacré).

## Le diagnostic (lentille Epic)
Deux axes de rejouabilité, à NE PAS confondre :
- **Candy Crush = largeur horizontale** : beaucoup de niveaux FINIS qu'on nettoie une fois.
  Sert la PROGRESSION de contenu (300 stations × paliers), PAS la compétition sans fin sur 1 station.
- **Geometry Dash / arcade high-score = profondeur verticale** : UN défi rejoué à l'infini
  pour battre son meilleur score / grimper un classement. **C'est ÇA, « Maître de la station ».**

Le Manifeste tranche déjà : « rejouabilité façon **Geometry Dash** ». ⇒ Pour la maîtrise,
ce n'est PAS « plus de niveaux Candy Crush », c'est un **score-chase + classement PAR STATION**.

## État actuel vs cible
- **Actuel** : paliers bronze/silver/gold à **seuil de points** (banque V2) → **FINI** (seuil
  atteint = maîtrise 100, la station est « finie »). Classement global/ligne/saison, **pas par
  station**. « Maître » = maîtrise≥80 + check-in (binaire, non compétitif).
- **Manque** pour la maîtrise sans fin : un **score qui a toujours de la marge**, un
  **classement par station**, une **couronne contestable**.

## Architecture définitive — 4 strates de compétition (alignées Manifeste)
1. **MAÎTRISE DE STATION (la couronne sans fin — NOUVEAU)**
   - Paliers bronze→silver→gold = **rampe d'apprentissage FINIE** (Candy-Crush-like : on
     apprend la mécanique + on débloque l'archive culturelle). Inchangé.
   - Une fois l'or atteint : la station entre en **mode « Défi du Maître »** = **score-chase**
     rejouable à l'infini (skill : vitesse + combo + précision + sans-faute / pavés économisés
     + temps restant). Score serveur via `fn_submit_attempt` (jamais le client).
   - **Classement PAR STATION** (meilleur score par joueur). « **Maître de la station** » = rang #1,
     **perdable** : quelqu'un te dépasse → tu perds la couronne → notif → tu rejoues pour la reprendre.
     C'est la boucle sans fin + le moteur de rivalité (§6) + la profondeur Geometry Dash (§3).
   - **Deux couronnes** (fidèle §4/§5) : « Maître » (meilleur score async) et **« Maître Vérifié »**
     (meilleur score AVEC check-in en station) = la prestige, car « la maîtrise physique exige une
     présence vérifiée ». La géoloc reste sur-couche (jamais bloquante).
2. **CONQUÊTE DE LIGNE (boss)** — classement de ligne (existe : `line_score`), « conquiers ta ligne ».
3. **SAISONS** — reset saisonnier (existe : scope season) = renouvellement sans fin.
4. **RÉSEAU/GLOBAL** — rang XP global (existe).

## Implications techniques (zone scoring SACRÉ — migration à valider)
- **Meilleur score par (joueur, station)** : déjà dérivable de `quest_attempts` (max score). Ajouter
  un **classement par station** (vue/matview, nouveau scope `station` dans `leaderboard_entries`).
- **Statut « Maître »** = tête de ce classement (remplace/augmente le binaire maîtrise≥80).
- **Score-chase quiz** : aujourd'hui plafonné au seuil. Ajouter un score continu pour le mode
  Maître (temps + série + sans-faute), TOUJOURS noté serveur (extension additive de `fn_submit_attempt`,
  jamais de calcul client ; `answer_key` jamais exposé ; nouvelle migration numérotée).
- **Démolition** : le score est DÉJÀ continu (pct + pavés économisés + temps) → prêt pour le score-chase.
- UI : **classement par station** sur `StationScreen`, couronne « Maître », boucle « reprends ta couronne ».

## Recommandation (1 ligne)
Garder les paliers comme **rampe d'apprentissage finie** ; faire de l'**or le seuil d'entrée**
dans un **mode Maître score-chase + classement par station**, couronne contestable (async) et
**Vérifiée** (check-in) — c'est la compétition sans fin demandée, et c'est exactement le Geometry-Dash
+ Maître de la station + rivalité du Manifeste. Pas besoin de « plus de niveaux Candy Crush » pour ça
(les niveaux servent la largeur de contenu / l'onboarding, pas la maîtrise).

## Séquence d'implémentation proposée (après validation)
1. DB : matview/vue `leaderboard` scope `station` (meilleur score/joueur/station) + lecture publique.
2. `fn_submit_attempt` : score-chase additif (mode Maître) — migration dédiée, signature intacte.
3. Statut « Maître » + « Maître Vérifié » (check-in) sur StationScreen + classement par station.
4. Boucle de reprise (notif « ta couronne est tombée ») — couche notif, plus tard.
5. Quiz : variante score-chase (vitesse/série) au-delà du seuil.
