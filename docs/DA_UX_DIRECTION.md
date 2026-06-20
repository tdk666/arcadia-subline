# Arcadia SubLine — Direction DA & UX (référence)

> Statut : **document de réflexion** (juin 2026). À approfondir en session DA dédiée.
> Objectif : marier l'**identité métro parisien / RATP** avec les **codes du jeu mobile
> grand public** (Subway Surfers, Royal Match, Candy Crush) — gros boutons, parcours
> évident, « juice » partout — pour quelqu'un qui a **60 secondes sur un quai**.
> Ne pas bricoler au coup par coup : ce doc fixe le cap avant d'exécuter.

---

## 0. La tension à résoudre

Arcadia est à la fois **profond** (culture, conquête, rétention) et doit être **immédiat**
(jouable en aveugle, une main, une minute). Le risque identifié (retour testeuse) :
« trop sombre, trop dense, trop compliqué pour juste attendre son métro ». La DA doit
donc trancher en faveur de l'**accessibilité joyeuse** sans renier la culture.

**Principe directeur** : *La culture se mérite par le jeu, jamais imposée. Le premier
contact doit être aussi évident qu'un tourniquet de métro : tu vois, tu pousses, ça marche.*

---

## 1. Les 5 lois UX (non négociables)

1. **Pouce d'abord.** Toute action primaire vit dans les **40 % bas** de l'écran, zone
   d'atteinte naturelle du pouce. Cibles tactiles **≥ 56 px** (min absolu 48 dp) avec
   **≥ 8 px** d'espacement. Le haut de l'écran = info, jamais d'action critique.
2. **1 tap pour jouer.** Depuis la carte, on doit lancer une partie en **1–2 taps max**.
   Tout écran intermédiaire (briefing, sélection) doit être *sautable* ou fusionné.
3. **On apprend en jouant.** Onboarding **progressif**, par le geste, **zéro mur de
   texte**. Tutoriel découpé en micro-étapes contextuelles, toujours « Passer ».
4. **Tout est juteux.** Chaque interaction renvoie un retour multi-sensoriel : squash &
   stretch, particules, **son en couches (≥ 3 sons, pas 1)**, haptique, compteurs qui
   montent. Le juice ne change pas les règles, il change le *plaisir*.
5. **Un seul CTA évident par écran.** Hiérarchie brutale : un bouton héros, le reste en
   retrait. Pas de choix paralysant pour un joueur pressé.

---

## 2. Système visuel

### 2.1 Couleur — le métro parisien comme grammaire
- **Base claire** : papier/carrelage chaud (déjà adopté « Métro Clair ») — lumineux,
  accueillant, lisible en plein jour sur un quai.
- **Héros = plaque émaillée** : **bleu RATP `#0a5a9e` + blanc**. C'est LA signature
  parisienne reconnue mondialement → boutons primaires, cartes-défi, en-têtes.
- **Couleurs de ligne = codage de contenu** (pas identité de marque) : chaque ligne
  porte sa couleur officielle (ligne 1 jaune, etc.). Sert à *coder*, pas à décorer.
- **Tricolore = célébration** : bleu-blanc-rouge réservé aux moments de victoire /
  conquête / fierté (confettis, drapeau planté). Rare = puissant.
- **Or/laiton `#c9a227`** : récompense, médailles, premium. **Vermillon** : rival,
  danger, urgence. **Vert guimard** : culture débloquée, succès.
- *Règle de contraste* : texte sombre sur clair, accents saturés pour les actions.
  Bannir le gris délavé sur clair (illisible au soleil).

### 2.2 Typographie
- **Display** : une grande typo à caractère « signalétique métro » (esprit *Parisine* /
  géométrique humaniste, graisse forte) pour les titres et chiffres. Aujourd'hui
  Marcellus (élégant mais peu « jeu ») → **à réévaluer** vers plus rond/affirmé.
- **UI** : Work Sans (ok). Gros, gras, lisible à bout de bras.
- Chiffres tabulaires pour scores/compteurs (animation count-up).

### 2.3 Boutons — « physiques », façon Royal Match
- **Volume** : coin très arrondi, ombre portée nette + liseré clair en haut → bouton
  qui « dépasse » de l'écran et **invite à être pressé**.
- **Réaction** : enfoncement (translateY + ombre qui se réduit) + son *clack* + léger
  haptique à chaque appui. Jamais de bouton « plat mort ».
- **Hiérarchie** : primaire = plein bleu plaque/or, grand ; secondaire = contour ;
  tertiaire = texte. Un seul primaire visible à la fois.

### 2.4 Iconographie & illustration
- Icônes **pleines, simples, mono-sens** (le pictogramme métro est notre modèle :
  universel, instantané). Chaque élément interactif a une forme mémorable et distincte
  (leçon Subway Surfers : « on se souvient de ce qu'on peut faire »).
- Illustrations vectorielles chaleureuses, zéro photo, cohérentes avec le canvas du jeu.

### 2.5 Mouvement & juice (catalogue)
- **Squash & stretch** sur le pavé, les boutons, les médailles.
- **Particules** à chaque impact / déblocage / level-up (déjà en place dans le jeu →
  à étendre à l'UI : confettis tricolores sur conquête, étincelles d'or sur récompense).
- **Son en couches** : un événement = plusieurs sons (impact + débris + grave). Déjà
  amorcé (WebAudio synthèse). À généraliser à l'UI (clack de bouton, swoosh d'écran).
- **Haptique** sur tous les jalons (déjà câblé `navigator.vibrate`).
- **Compteurs animés** (score/XP qui défilent), **anneaux de progression** qui se
  remplissent — la progression doit se *voir* monter.

---

## 3. Le parcours (FTUE + boucle cœur)

### 3.1 Première fois (FTUE)
- **Guest-first** (déjà acquis) : jouer AVANT tout compte.
- Onboarding **émotion → fantasme → mission** (déjà en place), mais **plus visuel,
  moins de texte**, et qui **enchaîne directement sur une 1re partie guidée** (apprendre
  en jouant), pas sur un menu.
- **Récompense Jour 1** : une 1re victoire = une archive culturelle + un éclat d'or →
  sentiment de progression immédiat (best practice rétention).

### 3.2 Boucle cœur (session = 1 station, ~60–90 s)
`Carte → (1 tap sur le défi du jour) → Partie → Victoire juteuse → Archive → Rejouer/Suivant`
- **Réduire les étapes actuelles** (carte → station → palier → briefing → rotation →
  intro → jeu) : fusionner sélection de palier + lancement ; briefing condensé en
  bandeau ; **mode « partie express »** calé sur la durée d'un arrêt.
- **Orientation** : repenser la contrainte paysage (friction debout, une main). Étudier
  un cadrage portrait pour le mini-jeu, ou une bascule plus douce.

### 3.3 Rétention (cibles)
Benchmarks casual : **J1 ≥ 35 %, J7 ≥ 12 %** (top quartile). Leviers : récompense
quotidienne, rivalité de ligne (le classement « la cible juste au-dessus de toi » existe
déjà), saisons, et la **collection d'archives** comme méta-objectif.

---

## 4. Le motif récurrent : la plaque émaillée
La **plaque de station bleue/blanche** est notre composant signature, déclinable partout :
en-tête d'écran, carte-défi, badge de ligne, bouton héros, titre de victoire. Elle ancre
l'identité parisienne dans chaque vue sans effort. *Un seul motif fort > dix gadgets.*

---

## 5. Backlog priorisé (à exécuter en session DA dédiée)
1. **Système de boutons « physiques »** (composant unique, juice intégré) → remplace tous
   les boutons actuels. *Le plus gros levier « jeu mobile ».*
2. **Simplification du parcours** : 1-tap-to-play depuis la carte, palier+lancement
   fusionnés, briefing condensé, intro plus courte.
3. **Typo display** plus « jeu » + chiffres animés partout.
4. **Catalogue de juice UI** : clack boutons, swoosh transitions, confettis tricolores
   de victoire, count-ups, anneaux de progression.
5. **Onboarding → 1re partie guidée** (apprendre en jouant) + récompense Jour 1.
6. **Étude orientation portrait** du mini-jeu (ergonomie une main).
7. **Pass de revue contraste plein soleil** (lisibilité quai).

---

## 6. Sources (état de l'art, juin 2026)
- FTUE / onboarding & rétention casual — Keewano, Adrian Crook, Red Apple (UX trends 2025).
- Thumb zone / cibles tactiles — Material 48 dp, Apple 44 pt, Steven Hoober (thumb maps).
- Game juice / game feel — GameAnalytics, « Designing Game Feel: A Survey » (arXiv).
- Études UI Subway Surfers / Candy Crush — Game UI Database, études de cas design.

*(Liens complets fournis dans le fil de conversation associé.)*
