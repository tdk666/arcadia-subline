# 🏅 Le Standard Or — la barre de la première minute

> Écrit après la passe « prix d'or » sur la surface exemplaire (cold-open
> « L'Émergence » → carte → Louvre-Rivoli / Bastille), chaque principe VÉRIFIÉ
> à l'écran (captures multi-viewports, FR+EN) avant d'être écrit ici. Ce n'est
> pas une liste de goûts : c'est la barre que toute station future, toute passe
> de build ET toute production de l'Atelier Culturel doivent franchir. On ne
> redescend plus sous cette ligne.

## 0. La règle des règles : VOIR avant de croire

« Ça compile » ne prouve rien ; « ça a l'air bien dans le code » non plus.
Toute passe visuelle se termine par des CAPTURES du rendu réel — petit viewport
(375×667), grand (430×932), FR ET EN — comparées à la Bible v3.0. Trois bugs de
cette passe étaient invisibles au code et évidents à l'écran (carte vide, flash
en collision, sujet hors-champ). Un agent qui ne regarde pas son rendu travaille
à l'aveugle ; il défère au fondateur ce qu'il pouvait fermer lui-même.

## 1. Le plancher avant la magie (offline est un CONTEXTE, pas un edge-case)

L'app se joue dans un métro : le réseau y est un luxe. Toute surface du cœur
doit avoir un PLANCHER local qui tient debout seul :
- La carte a un style de secours embarqué — sans le tiers distant, la Ligne 1 et
  ses stations dessinent toujours le plan de métro jouable (jamais d'écran vide).
- Les polices et le style de carte sont en cache PWA après la première visite.
- Toute dépendance tierce du chemin critique doit répondre à : « et dans le
  tunnel ? ». Si la réponse est « écran cassé », ce n'est pas expédiable.

## 2. Chaque transition est CONTINUE (la coupe est un échec)

- Le flip sombre→clair du cold-open est un mouvement de lumière, pas un swap.
- T2b→T3 : le MÊME plateau persiste, seule la caméra bouge (gros plan du drapeau
  → pull-out vers la ligne). Quand deux écrans partagent un monde, on déplace la
  caméra, on ne remplace pas le décor.
- Un insert plein cadre (flash tradition) coupe au noir Acier au-dessus de TOUT
  (chrome compris) et masque le contenu dessous — jamais deux couches de texte
  simultanées.

## 3. Un seul chrome par écran

Quand un composant embarqué a déjà son HUD (le vrai jeu Bastille dans la FTUE),
le conteneur s'efface : pas deux barres, pas deux boutons son, pas un « Passer »
qui chevauche un compteur. L'échappatoire reste garanti (croix du jeu +
« continuer › »), mais UNE seule main tient le cadre à la fois.

## 4. Le sujet du plan est DANS le champ — sur tous les formats

Toute scène composée (SVG, canvas, carte) se conçoit portrait-first avec une
zone sûre explicite (ici : x ∈ [60, 240] d'un viewBox 300×400 tient de 4:3 à
19,5:9). Le sujet du plan (la Bastille tricolore, la couronne, le drapeau) ne
peut JAMAIS sortir du cadre ni passer sous un dégradé de lisibilité. Un texte
d'UI ne wrappe pas sauvagement : les CTA composites sont des empilements voulus
(verbe héros / destination), pas des retours à la ligne subis.

## 5. Zéro emoji, zéro fleur-de-lys d'interface — pictogramme métro partout

Le système d'icônes (app/icons.tsx + games/icons.tsx) est le SEUL vocabulaire :
géométrique, mono-sens, currentColor, lisible à bout de bras. Un emoji système
dans un écran signature est une régression (il casse le premium, il rend
différemment sur chaque OS, il échappe à la palette). NUANCE actée : la fleur de
lys DIÉGÉTIQUE (sur les étendards royaux qu'on abat dans le canvas Bastille) est
du contenu historique, pas un motif de marque — elle vit. Toute fleur-de-lys
d'UI est morte ; le sceau d'archive (IconSeal) marque la culture.

## 6. La récompense est MÉRITÉE et HONNÊTE

- « LIBÉRÉE » = une conquête réellement accomplie (toujours vrai).
- « EMPEREUR DE PARIS » = verrouillé-rayonnant : un but qui se mérite, jamais un
  rang décerné. Aucun faux score, aucun faux rang, zéro score serveur en FTUE.
- Le tricolore reste le Saint-Graal (conquête uniquement). La présence est un
  bonus futur, jamais un mur.

## 7. Chaque geste a un retour PHYSIQUE — et chaque état, une sortie

Tap = haptique + son + mouvement (boutons qui s'enfoncent de 3 px, ombre
écrasée). Compteurs en tabular-nums. Et symétriquement : aucun état ne piège —
skip toujours visible, IntroBoundary qui dépose sur la carte, CTA sticky des
reveals, reduced-motion en repli sur TOUTES les animations (y compris les
nouvelles : board-cam, flag-plant, apex-letter).

## 8. La marque se dit UNE fois, dans le noir

Le châssis Acier EST la marque mère : le wordmark ARCADIA SUBLINE + cartouche
PARIS vivent dans l'obscurité du T0 et s'effacent dans la lumière. La Couche
Ville n'affiche pas la marque — elle affiche Paris. (Une app qui ne dit jamais
son nom n'a pas de première impression ; une app qui le répète partout non plus.)

## 9. Barre pour l'Atelier Culturel (contenu)

- Chaque reveal passe le test du « coup au ventre » : le joueur le répétera-t-il
  demain ? (< 3/3 → réécrire, cf. APPROFONDISSEMENT).
- Chaque mécanique passe le « mariage inévitable » : impensable ailleurs qu'ICI.
- L'exactitude est sacrée : tout fait flaggé « à vérifier » (50/50 Étoile,
  ascenseur Montparnasse, altitude Télégraphe, comptage Concorde, main-à-la-pomme,
  affluence Joconde) est SOURCÉ avant ship, ou n'embarque pas.
- Palette : Bible v3.0 deux couches UNIQUEMENT (brain/da-brief-atelier.md).
  « Cyberpunk Parisien Souterrain » et « Paris Souterrain » sont morts.

## 10. Filet technique (leçons payées, à ne pas repayer)

- Tailwind v4 ne scanne PAS les packages workspace résolus via node_modules :
  `@source '../../games/src'` dans index.css est VITAL. Toute classe utilisée
  uniquement dans games/ sans ce scan disparaît silencieusement du CSS de prod.
- La feuille maplibre-gl.css charge en lazy APRÈS index.css : une surcharge de
  ses classes doit gagner la cascade (!important documenté).
- Un composant canvas qui « contain-fit » un monde paysage dans un portrait doit
  choisir son ancrage (ici : sol aux 2/3 bas, ciel au-dessus) et faire suivre
  ses dégradés atmosphériques à la VRAIE ligne d'horizon du monde.

---

*Un juré qui regarde la première minute doit pouvoir dire : rien ne casse, rien
ne ment, rien ne dépasse du cadre, tout répond au doigt, et j'ai compris — où je
suis, ce que je fais, pourquoi revenir. C'est ça, la barre.*
