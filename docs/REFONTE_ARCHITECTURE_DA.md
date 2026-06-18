# Arcadia SubLine — Refonte Architecture & DA (les 10 meilleurs du monde)

> Posture : inspecteur intransigeant, « vision ×10 / QI 200 ». Méthode : on
> n'invente rien — on étudie ce que font réellement les meilleurs jeux du monde
> (sources ci-dessous), on en distille les lois, on s'auto-évalue sans
> complaisance, on propose. Objectif : une architecture (UX + game experience)
> ET une DA dont on soit FIER avant d'ajouter du contenu. Date : 15 juin 2026.

---

## 1. LES 10 RÉFÉRENCES — ce qu'ils font de mieux → ce qu'on vole

1. **Pokémon GO** — *la carte EST l'app.* Monde vivant, lieux colorés tappables,
   territoires d'équipe, exploration. → **Vol** : la carte du réseau comme écran
   d'accueil vivant ; stations = lieux à capturer ; « ta prochaine conquête »
   mise en avant. ([Pokémon GO Wiki — Map View](https://pokemongo.fandom.com/wiki/Map_View))
2. **Monopoly GO** (#1 mondial, 6 Md$ record) — *plateau thématique + événements
   en cadence + social léger.* Cinq landmarks à améliorer par plateau-ville ;
   événements limités (heists, treasure hunt) qui donnent une raison de revenir ;
   gifting/trading. → **Vol** : **événements/saisons limités** sur la carte,
   landmarks de ligne à « restaurer », social par cadeaux. ([mobilegamer.biz](https://mobilegamer.biz/the-top-grossing-mobile-games-of-2024/), [Scopely](https://www.scopely.com/en/news/sensor-tower-scopelys-monopoly-go-hit-6-billion-revenue-milestone-in-2025-in-record-time))
3. **Duolingo** (churn 47 %→28 %, 40 M DAU) — *apprentissage gamifié + rétention
   en couches.* Une mécanique par étape de vie : succès jour-1, **streak** (aversion
   à la perte, flamme qui s'anime, freeze monétisé), **ligues** hebdo
   (promotion/relégation), badges rares + **friend streaks** au long cours ;
   200+ A/B tests/an. → **Vol** : c'est **NOTRE modèle de rétention** (on apprend
   la culture en jouant). Streak quotidien, ligue de ligne, objectif du jour,
   guide-mascotte. ([trophy.so case study](https://trophy.so/blog/duolingo-gamification-case-study), [StriveCloud](https://www.strivecloud.io/blog/gamification-examples-boost-user-retention-duolingo))
4. **Candy Crush Saga** — *carte de niveaux (saga) + boucle de session courte +
   praise escaladant.* → **Vol** : la ligne = une « saga » de stations ; éloge
   verbal (déjà amorcé in-game) ; « presque ! » sur échec.
5. **Royal Match** (top-grossing) — *juice + art lisible + agency + méta-déco.*
   Pièces grosses et distinctes, animations COURTES et fluides, input concurrent
   (le joueur garde la main), méta « rénover le château » qui donne un sens
   émotionnel aux victoires. → **Vol** : boutons physiques (fait), animations
   courtes, **méta « réenchanter Paris »** (la Collection comme rénovation).
   ([ironSource deep dive](https://medium.com/ironsource-levelup/design-deep-dive-02-royal-match-948f7af96f04), [Cubix](https://www.cubix.co/blog/the-design-decisions-that-made-royal-match-a-top-grossing-game/))
6. **Brawl Stars** (Supercell) — *hub + Pass de saison mensuel + rotation
   d'événements.* Saison le 1er jeudi du mois, Pass free+premium par XP, modes en
   rotation, **hub d'événement** narratif. → **Vol** : **Pass de saison** (la
   monétisation de la vision), rotation de défis, hub de saison thématique
   (Révolution, JO…). ([Supercell support](https://support.supercell.com/brawl-stars/en/articles/brawl-pass-quests-7.html))
7. **Subway Surfers** (1 mécanique, 150 M MAU) — *friction zéro + reskins
   thématiques mensuels.* → **Vol** : 1-tap-to-play, rejoue instantané, fraîcheur
   par habillage/saison (pas par 50 mécaniques). ([PocketGamer.biz](https://www.pocketgamer.biz/seven-years-on-sybo-games-subway-surfers-2-5-billion-downloads/))
8. **Trivia Crack** — *roue de catégories + mascotte (Willy) + personnages
   collectionnables (les Trivies).* Le guide parle, on « joue avec des amis ». →
   **Vol** : **mascotte-guide parisienne** + **personnages/archives à
   collectionner** (une par ligne/époque). ([Trivia Bliss — personnages](https://triviabliss.com/trivia-crack-character-names/))
9. **Clash Royale / Clash of Clans** (Supercell) — *UX premium, social propre,
   art léger.* Anti-toxicité (pas de chat global, emotes prédéfinies), sprites
   pré-rendus = look riche sans coût GPU, UI simple malgré la profondeur, saison
   mensuelle. → **Vol** : **social sûr by design** (emotes, pas de chat libre),
   **art performant** (canvas/vecteur, cible Chromebook/Android d'entrée), saison
   mensuelle. ([The Rookies — UX Clash Royale](https://discover.therookies.co/2020/02/24/game-design-ux-best-practices-detailed-breakdown-of-clash-royale/))
10. **Citymapper** (réf hors-jeu, transport) — *clarté absolue (loi de Tesler :
    la complexité côté système, pas côté joueur).* L'accueil montre seulement : où
    tu es, où tu vas, la meilleure action suivante ; orientation pas-à-pas. →
    **Vol** : notre carte métro doit être **Citymapper-claire**, pas une pelote ;
    toujours une « meilleure action suivante » évidente. ([Econsultancy](https://econsultancy.com/six-features-to-appreciate-about-citymappers-ux/), [Medium — UX challenge](https://medium.com/@simkhoff/ux-design-challenge-simplifying-city-travel-with-citymapper-132a58e0b200))

**FTUE (synthèse des meilleures pratiques 2025)** : jouable en invité, pseudo
plus tard, on apprend EN JOUANT (une mécanique à la fois), mini-objectifs +
barre de progression, histoire tissée, skippable, zéro pub au démarrage.
([Adrian Crook](https://adriancrook.com/best-practices-for-mobile-game-onboarding/), [Keewano](https://keewano.com/blog/first-time-user-experience-ftue-mobile-games/))

---

## 2. LES 8 LOIS (distillées des 10)

1. **La carte est l'accueil** (PGo, Monopoly GO) — vivante, claire (Citymapper).
2. **Le streak est roi** (Duolingo) — l'habitude quotidienne avant tout le reste.
3. **Rétention en couches** (Duolingo) — une accroche par étape de vie du joueur.
4. **Cadence > mécaniques** (Subway, Brawl, Monopoly GO) — saisons/événements
   mensuels réenchantent sans recoder.
5. **Un seul CTA évident** (Royal Match, Citymapper) — la meilleure action suivante.
6. **Juice court + art lisible** (Royal Match) — feedback immédiat, animations brèves.
7. **Méta émotionnelle** (Royal Match, Monopoly GO) — restaurer/collectionner un monde.
8. **Social sûr by design** (Clash) — emotes, pas de chat libre ; performance d'abord.

---

## 3. AUTO-ÉVALUATION DE L'ARCHITECTURE ACTUELLE (sans complaisance)

| Dimension | Note /5 | Constat |
|---|---|---|
| 1-tap-to-play | 3.5 | Carte-héros → jeu OK ; pas encore « défi du jour » imposé. |
| **Habitude quotidienne (streak/daily)** | **1** | Streak affiché en Profil, **jamais** mis en scène, pas de récompense quotidienne, pas d'objectif du jour. **Le plus gros trou.** |
| Profondeur de progression | 2.5 | XP + rangs + maîtrise + collection ; pas de ligue, pas de saison, pas de Pass. |
| Carte / territoire | 3 | Géographique réelle + zoom (neuf) ; mais pas de station tappable, pas de « tu es ici », labels absents. |
| Social | 1 | Classement seul ; pas de clan/rival vivant/emotes. |
| **DA — cohérence premium** | **2.5** | « Métro Clair » lisible et juste, mais pas de mascotte, iconographie hétérogène (emojis ◉❖♛◈), pas de style-guide, motion non systématisé. |
| FTUE | 2.5 | 3 tableaux (améliorés) puis on tombe sur la carte ; pas « apprendre en jouant → 1re partie guidée ». |
| Juice | 4 | Mini-jeu très juteux + cris de récompense ; UI encore en retrait. |
| Performance | 4 | Stack légère, canvas, PWA — cohérent cible bas de gamme. |
| Surface de monétisation | 1 | Aucune (normal, mais à câbler : Pass de saison). |

**Verdict** : socle sain, mais l'app **ne crée pas l'habitude** (loi #2/#3) et la
**DA n'a pas encore d'âme de marque** (mascotte, système). Ce sont les deux
chantiers qui séparent « joli prototype » de « produit dont on est fier ».

---

## 4. REFONTE PROPOSÉE — ARCHITECTURE / IA

### 4.1 Le squelette (5 onglets, la carte au centre)
`Carte (accueil) · Saison · Collection · Ligue · Profil`
- **Carte** : le réseau vivant (Citymapper-clair). Barre de statut persistante en
  haut : **flamme de streak**, XP/rang, et **l'objectif du jour**. La « meilleure
  action suivante » est toujours un bouton héros (défi du jour sur ta ligne).
- **Saison** (NOUVEAU) : le **Pass de saison** thématique (Révolution → JO →
  Haussmann), free + premium ; défis quotidiens/hebdo ; hub narratif (Brawl/Monopoly GO).
- **Collection** : les « mémoires de Paris » = méta émotionnelle (Royal Match) +
  personnages/archives collectionnables (Trivia Crack).
- **Ligue** (évolution du Classement) : ligue hebdo avec promotion/relégation
  (Duolingo) — la rivalité « la cible juste au-dessus de toi » existe déjà.
- **Profil** : identité, rangs, réglages.

### 4.2 La boucle cœur (≈ 60–90 s)
`Ouvre → objectif du jour + nudge streak → 1-tap défi du jour → partie juteuse →
victoire (archive + XP + streak++ + progression Pass) → suivant/rejouer`.

### 4.3 Rétention en couches (Duolingo, déployée par étapes)
- **Jour 1** : 1re victoire = archive + éclat d'or (déjà là) + 1er point de streak.
- **Jour 2+** : **streak** mis en scène (flamme animée, rappel, freeze).
- **Semaine 1** : **ligue** hebdo gagnable.
- **Mois 1+** : **saison + Pass** ; badges rares ; (plus tard) friend streaks.

### 4.4 Le guide-mascotte (NOUVEAU, à trancher en DA)
Une figure parisienne qui personnifie la culture et porte FTUE + notifications
(leçon Duo/Trivia Crack). Pistes : **le poinçonneur** (clin d'œil Gainsbourg
« Le Poinçonneur des Lilas »), un **chat de gouttière parisien**, ou une
**chouette/figure Art Nouveau Guimard**. Décision DA §5.

### 4.5 Carte vivante (Citymapper + PGo) — incréments
Stations tappables (fiche station), « tu es ici » (check-in/géoloc en sur-couche),
labels au zoom, la ligne du jour qui pulse (fait), focus initial sur ta ligne.

---

## 5. REFONTE PROPOSÉE — DA

**Garder** la base **« Métro Clair »** (clair, parisien, lisible plein soleil sur
un quai — c'est un choix juste pour le cas d'usage) MAIS la hisser en **système
premium cohérent** :

- **Composant signature** = la **plaque émaillée** bleu RATP/blanc, systématisée
  (en-têtes, cartes-défi, héros, victoire).
- **Mascotte** (§4.4) : présence dans FTUE, vide, victoires, notifications.
- **Iconographie unifiée** : remplacer les emojis hétérogènes (◉❖♛◈🔒) par un set
  d'**icônes pleines mono-sens** façon pictogramme métro (cohérence Subway/Clash).
- **Pièces lisibles & volumétriques** (Royal Match) : boutons (fait), médailles,
  pavé, pastilles de ligne — relief net, ombres courtes.
- **Langage de motion** : animations COURTES (Royal Match) ; **tricolore =
  célébration rare** (conquête) ; count-ups ; flamme de streak ; swoosh d'écran.
- **Typo** : display « signalétique » assumée (réévaluer Marcellus vs une
  géométrique plus « jeu » — cf. doc DA). Chiffres tabulaires animés.
- **Performance** (Clash) : vecteur/canvas, zéro 3D lourd — cible Chromebook.
- **Livrable** : un **style-guide une page** + tokens (déjà amorcés dans `index.css`).

---

## 6. AUTO-ÉVALUATION DE LA PROPOSITION (cibles)

| Dimension | Actuel | Cible post-refonte | Levier principal |
|---|---|---|---|
| Habitude quotidienne | 1 | 4.5 | streak mis en scène + objectif du jour + daily |
| Progression | 2.5 | 4 | ligue hebdo + Pass de saison |
| Carte/territoire | 3 | 4.5 | stations tappables + « tu es ici » + clarté Citymapper |
| Social | 1 | 3 | ligue + emotes (chat libre banni) |
| DA cohérence | 2.5 | 4.5 | mascotte + set d'icônes + style-guide |
| FTUE | 2.5 | 4.5 | apprendre en jouant → 1re partie guidée |
| Monétisation | 1 | 3.5 | Pass de saison (free+premium) |

**Risques** : (a) ne pas tout faire d'un coup — séquencer ; (b) le streak/daily
ne doit jamais rendre le jeu anxiogène (garder « la culture jamais imposée ») ;
(c) la mascotte mal faite = ringard → la traiter en session DA dédiée.

---

## 7. PLAN D'EXÉCUTION (proposé, après validation)

1. **Système d'icônes + barre de statut (streak/XP/objectif du jour)** — pose le
   socle DA + l'habitude. *Le plus gros levier.*
2. **Streak + récompense quotidienne + objectif du jour** (Duolingo) — câblage
   logique (serveur déjà prêt : streak existe en base).
3. **FTUE « apprendre en jouant »** → 1re partie guidée Bastille.
4. **Ligue hebdo** (évolution du classement).
5. **Mascotte + style-guide** (session DA dédiée).
6. **Pass de saison** (squelette ; monétisation).
7. **Carte vivante** : stations tappables, labels au zoom, « tu es ici ».

> On ne code rien de tout ça tant que §4–§5 ne sont pas validés. Quand on en sera
> fier, on exécute le §7 dans l'ordre.

---

## 8. DÉCISIONS VALIDÉES (15 juin 2026)

- **DA** : **« Métro Clair » premium** (on garde la base claire/parisienne et on la
  hisse en système cohérent).
- **Mascotte** : **le poinçonneur** revisité avec **un côté mignon-animal façon
  Ratatouille** (un petit rongeur/animal parisien en tenue de poinçonneur RATP).
  Porte FTUE, vides, victoires, rappels de streak.
- **Méthode** : **entonnoir** — on pose d'abord ce qui détermine le reste (les
  fondations du palais), puis on monte la pyramide.

### Exécution — état (funnel)
1. ✅ **Fondation DA + habitude** : système d'icônes cohérent (`components/icons.tsx`,
   fini les emojis système) + **barre de statut persistante** (`StatusBar` :
   flamme de streak, rang, XP) + logique de rang partagée (`lib/rank.ts`).
2. ✅ **Streak + objectif du jour + récompense quotidienne** : couche d'habitude
   locale (`lib/daily.ts`, testée), `DailyObjective` sur l'accueil, `DailyReward`
   global, la flamme de la `StatusBar` reflète la série vivante (aversion à la
   perte). Marche en démo comme en Supabase.
3. ⏭️ **Mascotte poinçonneur-souris** (SVG) + style-guide une page.
4. ⏭️ FTUE « apprendre en jouant » · Ligue hebdo · Pass de saison · Carte vivante.
