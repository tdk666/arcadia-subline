# Arcadia SubLine — La Carte : modèle d'UX mondial (vision 15 ans)

> La carte n'est pas un écran de l'app. **La carte EST l'app.** C'est le plateau
> vivant où l'on conquiert Paris, où l'on se voit avancer, où l'Histoire affleure
> sous nos pieds. Ce document fixe le cap « niveau jeu premium mondial » : UX,
> cinématique, DA. Posture : vision ×10, on s'inspire du meilleur de la planète.

---

## 0. Thèse (projection 10–15 ans)
Le réseau de transport devient un **monde de jeu persistant**. À terme : 300
stations à Paris, puis Londres/Tokyo/NYC. La carte doit donc être une **surface
unique, fluide, iconique** — une marque visuelle reconnaissable entre toutes (le
« Métro Clair » d'Arcadia comme Pokémon GO a son monde stylisé). Tout vit ici :
explorer, jouer, collectionner, rivaliser, se géolocaliser.

## 1. Références mondiales → ce qu'on prend
- **Pokémon GO** : la carte = l'accueil ; monde OSM **stylisé/abstrait** (jamais
  la rue brute) ; avatar 3D à ta position ; lieux qui « appellent ». → notre socle.
- **Citymapper** : clarté absolue (loi de Tesler) ; on ne montre que l'utile.
- **Monopoly GO / Royal Match** : la carte se **transforme** (événements, saisons,
  zones restaurées) → raison de revenir.
- **Alto's Odyssey / Monument Valley** : DA atmosphérique (lumière, brume,
  heure du jour) = émotion. → notre signature sensorielle.
- **Genshin / cartes AAA** : caméra cinématique, transitions tenues, jamais de coupe sèche.

## 2. Les 4 couches de la carte
1. **Le socle (DA iconique)** — fond papier chaud stylisé « Métro Clair », eau
   bleu plaque, parcs vert tendre, bâtiments crème extrudés, routes effacées. Le
   monde s'efface pour que **le métro et la culture priment**.
2. **Le territoire (le jeu)** — lignes = rubans colorés (officiels IDFM) ; ta
   ligne en héros ; stations = lieux tappables ; **conquête visible** (territoire
   gagné illuminé, à conquérir en scommeil — « fog of war » doux).
3. **L'avatar (toi)** — un **vrai 3D** à ta position (glTF + Three.js), qui
   marche, **pivote vers ton cap**, scale au zoom, customisable en boutique.
4. **L'atmosphère (l'âme)** — ciel/brume à l'horizon, **heure du jour réelle**
   (aube/jour/crépuscule/nuit), **météo de saison**, lumière chaude de réverbère.

## 3. Lois UX de la carte (non négociables)
- **Tout au même endroit** : jouer, voir une station, sa fiche, son archive →
  en **bottom-sheet sur la carte**, jamais un changement d'écran. *(fait)*
- **Une meilleure action suivante** toujours évidente (CTA héros « ta ligne »).
- **Jamais de coupe sèche** : toute navigation = un mouvement de caméra tenu
  (flyTo/easeTo), le cerveau garde le fil spatial.
- **Le pouce d'abord** : actions dans les 40 % bas ; cibles ≥ 56 px.
- **Lisible plein soleil sur un quai** (contraste, gros, sobre).

## 4. Cinématique (le « film » de l'expérience)
- **Arrivée** : au lancement, la caméra **descend du ciel** et se pose, inclinée,
  sur ta ligne (fly-in ~2,6 s, une fois par session). *(fait)*
- **Sélection de station** : easeTo qui recentre + incline légèrement + la fiche
  monte du bas. *(prochain)*
- **Conquête** : à la victoire, retour carte → la station **s'illumine**, halo
  tricolore, le territoire gagné s'étend sur la ligne (animation de « prise »).
- **Heure du jour** : le ciel et la lumière suivent l'heure réelle de Paris.
- **Saison** : la carte se rethématise (Révolution, JO, Haussmann, Noël) —
  neige, lumières, couleurs — sans recoder le jeu.

## 5. L'avatar 3D (spec technique)
- **Rendu** : custom layer **Three.js** sur MapLibre (ou deck.gl `ScenegraphLayer`),
  modèle **glTF** riggé de la mascotte (le poinçonneur). S'incline avec la caméra.
- **Comportement** : position = GPS ; **orientation = cap** (heading device ou
  bearing de déplacement) → il regarde où tu vas ; **anim de marche** quand tu
  bouges, idle sinon ; **scale** constant à l'écran selon le zoom.
- **Évolution** : skins/tenues achetées en jetons (boutique) ; rang/niveau visible
  (aura, accessoires) ; à terme, expressions selon le contexte (près d'une station
  jouable → il pointe ; victoire → il saute).
- **Repli** sans glTF : sprite 2.5D (sprite-sheet de marche + rotation cap + ombre).

## 6. DA — le style iconique (spec)
- **Palette** : papier `#efe6d3`, eau `#aecde8`, parcs `#d6e4c4`, bâti crème
  extrudé `#e7ddc7`, routes effacées `#e3d8bf`. Accents : lignes officielles IDFM ;
  **tricolore réservé** à la conquête.
- **Abstraction** : retirer POI, n° de rue, labels parasites ; simplifier les
  routes ; **garder l'eau, les parcs, les grands repères** (Seine, bois).
- **Profondeur** : pitch 50–55°, bâtiments 3D, **ciel/brume chaud** à l'horizon. *(fait)*
- **Cible perf** : tuiles vectorielles (léger), lazy-load, budget Chromebook /
  Android d'entrée de gamme. Offline = **Protomaps PMTiles** (pilier « jeu du métro »).
- **Cap** : passer du style tiers recoloré à un **style MapLibre 100 % bespoke**
  (notre JSON) pour un rendu signature, non générique.

## 7. État & feuille de route
**Fait** : carte WebGL plein écran (la carte = l'app) ; recolor « Métro Clair » +
ciel/atmosphère ; anti-densité (ruban jaune, dégressif au zoom) ; **fiche station
en bottom-sheet** (tout au même endroit) ; cinématique d'arrivée ; avatar (sprite,
halo cosmétique).

**Prochain (ordre d'impact)** :
1. **Style MapLibre bespoke** (JSON maison) — le saut « iconique » final.
2. **Avatar 3D** (Three.js + glTF) — marche/cap/scale *(glTF en cours côté Théo)*.
3. **Cinématiques de jeu** : sélection station (easeTo), **conquête illuminée** au retour.
4. **Heure du jour réelle** (ciel/lumière) + **fog-of-war** de conquête.
5. **Saisons** thématiques de la carte (rethématisation).
6. **Offline PMTiles** (jouer dans le tunnel).
