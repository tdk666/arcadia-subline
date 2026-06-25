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

---

# 🏆 LE SYSTÈME DE TITRES (validé fondateur — vision x400)

> Validé. Hiérarchie géographique de **couronnes contestables**. Contrainte fondateur :
> « on joue dans la rame ou sur le quai » → la **présence vérifiée** est le cœur des
> titres (multiplicateur + couronne « Vérifiée » qui prime), SANS bloquer le jeu async
> (plancher Manifeste §5). Réf. meilleurs jeux : segments/KOM Strava, arènes Pokémon GO,
> ladder Clash Royale, Elo échecs, territoires Travian.

## La hiérarchie des titres (du plus atomique à l'apex)
Gradient ASCENDANT, qui traverse TOUTE l'histoire de Paris (pas que la monarchie —
on est en République : Antiquité → Révolution/République → Monarchie → Empire). Validé.
| # | Titre | Époque évoquée | Périmètre | Détenteur = meilleur sur… |
|---|------|----------------|-----------|---------------------------|
| 1 | **Chef de Station** | intemporel | 1 station | son meilleur score sur CETTE station |
| 2 | **Maître de la Ligne** (« Maître de la 4 ») | corporations/métiers | 1 ligne | Σ de ses meilleurs scores sur la ligne |
| 3 | **Baron du Quartier** | féodal/médiéval (le fondateur aime ✓) | quartier (Le Marais, Quartier latin…) | Σ sur les stations du quartier |
| 4 | **Maire de l'Arrondissement** (1–20) | République | 1 arrondissement | Σ sur les stations de l'arrondissement |
| 5 | **Roi de la Rive** (gauche / droite) | Monarchie | 1 rive (2 titres) | Σ sur les stations de la rive |
| 6 | **Empereur de Paris** | Empire | tout Paris | Σ sur toutes les stations |

Gradient : Chef → Maître → Baron → Maire → Roi → Empereur. Spectre historique assumé
(« Baron du Quartier » conservé — choix fondateur). Libellés =
i18n, donc faciles à ajuster. Alternatives possibles par saison (ex. saison Révolution →
« Sans-culotte », « Citoyen », « Conventionnel » ; saison Commune → « Fédéré »…).

### Idées créatives (VALIDÉES fondateur « je prends tout ») — best-in-class
- **LE SACRE** : micro-cérémonie de couronnement (sceau + Marseillaise feutrée + tricolore)
  quand on prend un titre — le « money shot » à partager (acquisition).
- **PRIME DE DÉTRÔNEMENT** : prendre une couronne = bonus de points one-shot ; le détrôné reçoit
  une **revanche** (notif « reprends ta couronne »). Boucle de rivalité (Clash/Strava).
- **DYNASTIE** : tenir un titre N jours d'affilée = badge « Dynastie » + bonus de prestige récurrent
  (récompense la défense, pas que la prise).
- **NOBLESSE (méta-rang)** : nombre de couronnes tenues SIMULTANÉMENT → rang méta (« tu tiens 5
  couronnes ») — un objectif transverse au-dessus des titres.
- **BLASON** : chaque titre porte un écusson collectionnable (Hall des Titres = galerie d'armoiries).
- **TITRES ÉTERNELS vs SAISONNIERS** : couronnes live (always-on) + un classement saisonnier qui
  reset (renouvellement §4 SAISONS) → double terrain de jeu.

## Le principe d'architecture clé : UNE source de vérité
**`station_best` = (joueur × station → meilleur score)**. **TOUS** les titres supérieurs sont
des **agrégations** de `station_best` filtrées par l'appartenance géographique de la station.
⇒ on implémente le score de station UNE fois ; ligne/quartier/arrondissement/rive/empereur
en découlent par `GROUP BY` sur des tables d'appartenance statiques. Élégant, pas de double compte.

- **Appartenance** (métadonnée statique) : `station → {lignes[], arrondissement, rive, quartier?}`.
  Dérivée des coordonnées IDFM (`network-geo.json`) : arrondissement (point-dans-polygone),
  rive (polygone Seine), quartier (listes curatées Atelier). Table/JSON de mapping versionné.
- **Agrégat de scope** = joueur au **plus haut Σ de ses `station_best`** sur les stations du scope.
  (Σ récompense largeur ET profondeur ; le Chef de plusieurs stations d'une ligne → Roi de la ligne.)

## Mécaniques best-in-class (chaque titre : défendable · rapporte des points · public)
- **Couronne contestable** (Strava KOM / arènes PGo) : on garde le titre tant que personne ne bat
  le score/Σ. Dépassé → **notif « ta couronne tombe »** → on rejoue pour reprendre. Boucle SANS FIN.
- **Présence = âme** (Manifeste §5) : run async = éligible (plancher) ; run **avec check-in vérifié**
  = **× multiplicateur** + éligible à la couronne **« Vérifié »** qui **prime** sur l'async.
  Le vrai Maître est celui qui joue SUR PLACE. Géoloc jamais bloquante.
- **Prestige/points** : détenir un titre rapporte des **points de prestige** (récurrents + bonus de
  prise) → alimentent l'XP global et la course à l'Empereur. (Plus on tient haut/longtemps, plus ça paie.)
- **Public** : « Hall des Titres » + classement par scope, consultable de tous (sur StationScreen,
  LineMap, et un onglet dédié). Chaque couronne affiche son détenteur (pseudo + avatar).
- **Anti-triche** : titres calculés UNIQUEMENT depuis `station_best` (scores serveur `fn_submit_attempt`).
  Jamais de calcul client. Saisons : reset périodique d'un classement parallèle (renouvellement).

## Implémentation phasée (zone scoring sacré → migrations soignées, additives)
- **Phase A — FONDATION** : `station_best` (best/joueur/station, alimenté par `fn_submit_attempt`)
  + **classement par station** + couronne **Chef de Station** sur StationScreen. Démolition =
  score-chase prêt (score déjà continu). ⇒ la boucle atomique ; tout en découle.
- **Phase B — LIGNE** : Roi de la Ligne (Σ station_best sur la ligne) + vue + UI LineMap.
- **Phase C — GÉO** : mapping station→arrondissement/rive (depuis IDFM geo) + Maire / Élu de la Rive /
  Empereur ; quartiers curatés → Boss de Quartier. + « Hall des Titres ».
- **Phase D — PRÉSENCE** : multiplicateur check-in + couronnes « Vérifiées » (sur-couche localisation).
- **Phase E — PRESTIGE & DÉFENSE** : points de prestige récurrents + notifs « couronne tombée ».
- **Clans** : APRÈS (sécurité/modération by design, Manifeste §11) — idée fondateur, à concevoir ensuite.

## Quiz : rendre le score continu (sinon pas de score-chase)
Le quiz plafonne au seuil de banque. Pour la maîtrise : `station_best` du quiz = score-chase
(vitesse + série sans-faute + précision), additif dans `fn_submit_attempt`. Démolition déjà OK.

