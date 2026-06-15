# Arcadia SubLine — Audit Inspecteur (rigueur « 30 ans chez Epic »)

> Date : 15 juin 2026. Posture : critique impitoyable, marché en tête, cap sur la
> vision Arcadia à 10 ans (cf. Drive 00_STRATEGIE : triptyque jeu/guide/social,
> 8 archétypes × stations, localisation en sur-couche, monétisation méta, multi-villes).
> Échelle : P0 = bloque le passage au cap supérieur · P1 = important · P2 = à terme.

---

## VERDICT EN UNE PHRASE
On a un **vertical slice qui claque** (un mini-jeu juteux, une DA en cours de bascule,
une boucle méta naissante) posé sur des **fondations d'opération absentes** : on **ne
mesure rien**, on **ne teste rien**, on **ne livre pas en sécurité**, et les **deux paris
centraux du projet** (localisation souterraine, passage à l'échelle du contenu) ne sont
**pas amorcés**. C'est joli, ce n'est pas encore un produit.

---

## P0 — CE QUI INTERDIT LE « CAP SUPÉRIEUR »

### 1. Zéro mesure. La thèse du projet est « rétention = revenu » — et rien ne mesure la rétention.
Aucun analytics, aucun funnel, aucun event (`grep` analytics → néant côté app). On pilote
à l'aveugle un produit dont TOUTE la stratégie économique repose sur des courbes (J1/J7/J30,
taux de complétion, drop-off du parcours). **Sans instrumentation, chaque décision DA/UX
est une opinion, pas une donnée.** → Poser une couche d'events (privacy-first, ex. Plausible/
PostHog self-host ou events maison vers Supabase) : `first_play`, `tier_win`, `archive_open`,
`drop_off_step`, `session_len`. Indispensable AVANT d'investir plus en contenu/DA.

### 2. Zéro test, zéro CI. Un jeu à score serveur-autoritaire qui livre sans filet.
Pas un seul test (`*.test.*` → néant), pas de `.github/workflows`. Netlify build sur push,
sans gate lint/typecheck/test. **Preuve par les faits : on a livré en prod (a) un faux positif
de scoring qui bloquait toute progression, (b) un HUD sombre-sur-sombre illisible. Deux bugs
qu'un smoke-test ou une preview vérifiée auraient arrêtés.** → CI minimale (typecheck + build
+ lint) en gate de merge, + tests unitaires sur la couche qui compte : `previewDemolitionScore`
(la formule de score, miroir serveur) et les invariants du moteur (pas de victoire avant le 1er
tir, pct ≤ 100, étendards). Plus tard, un smoke E2E (Playwright) « lance Bronze → gagne → score ».

### 3. Aucun suivi d'erreurs en prod.
Combiné au point 2 : les incidents sont invisibles jusqu'à ce que l'utilisateur les signale —
c'est littéralement notre mode de fonctionnement actuel. → Sentry (ou équivalent) sur l'app
ET la fonction Edge.

---

## P1 — IMPORTANT POUR TENIR LA VISION

### 4. Le pari CENTRAL — la localisation souterraine — est à 0 %.
La vision (§5) en fait LE différenciateur (« jouer dans la rame, les jeux suivent le trajet »)
et impose une doctrine : *plancher d'abord (line-pack offline), magie ensuite*. Or :
- **Pas de line-pack offline** (pré-téléchargement de la ligne pour jouer dans le tunnel) —
  pourtant qualifié d'« indispensable » dans le doc. Le service worker précache le shell, pas
  une logique de pack de ligne.
- **Check-in** réduit à un stub manuel ; pas d'OCR plaque, pas d'inertiel, pas de balises.
Sans au moins le line-pack, Arcadia reste « un puzzle culturel » et pas « le jeu du métro ».

### 5. La thèse plateforme n'est pas prouvée : 1 archétype, 1 station.
« 8 moteurs × habillage = 300 stations » reste une hypothèse tant qu'un **2ᵉ archétype** et une
**2ᵉ station** n'existent pas. La rejouabilité réelle ≈ 0 hors les 3 paliers de Bastille.
*(Décision produit actuelle : on maîtrise Bastille d'abord — OK, mais le risque archi reste
ouvert jusqu'à la preuve.)* Le contrat `MiniGameDefinition`/registry est sain ; il faut le
**stresser** avec un archétype non-physique (ex. quiz/association) pour valider l'abstraction.

### 6. Les scores en prod sont FAUX (mode démo).
Le déploiement tourne sans clés Supabase → backend démo, classement = rivaux scriptés + score
local. Le joyau (score serveur-autoritaire, RLS, `fn_submit_attempt`) **n'est pas exercé en
prod**. Pour un jeu compétitif, un classement simulé est un mensonge produit. → Déployer
Supabase + câbler `VITE_SUPABASE_URL/ANON_KEY` sur Netlify, valider la boucle réelle invité→
compte→rejeu des tentatives en file.

### 7. Parcours trop long pour le cas d'usage « 60 s sur un quai ».
Carte → station → palier → briefing → rotation paysage → intro → jeu. C'est le péché capital
du casual (cf. doc DA/UX). Le standard marché : **< 3 s et 1-2 taps jusqu'au premier coup**.
→ 1-tap-to-play depuis la carte (déjà listé dans le backlog DA).

### 8. L'orientation paysage forcée contredit l'usage (debout, une main).
Subway Surfers/Royal Match = portrait, une main. Notre mini-jeu impose la rotation. Tension
structurelle à trancher : cadrage portrait du jeu de démolition, ou assumer le paysage comme
parti pris (et l'expliquer mieux). À décider en session DA.

### 9. Pas de pipeline de contenu — le moat ne passe pas à l'échelle à la main.
Le fossé d'Arcadia = la culture des 300 stations. Aujourd'hui : JSON écrit à la main (1 station).
La vision (§11.4) prévoit « génération assistée + curation historienne ». Sans ce pipeline,
chaque station est un chantier éditorial → contradiction directe avec « 300 stations ».

---

## P2 — À TERME / DETTE MAÎTRISÉE

### 10. Performance non mesurée.
Matter.js + rendu canvas custom + carte SVG animée (SMIL `animateMotion` + N nœuds animés).
Probablement OK sur récent, **non profilé sur Android d'entrée de gamme** (cœur de cible
pendulaire). Bundle sain (≈ 113 KB gzip cœur + 40 KB jeu lazy). → Budget perf + test sur
appareil bas de gamme ; surveiller la carte (beaucoup d'animations simultanées).

### 11. Accessibilité partielle.
Bon : `prefers-reduced-motion` respecté, contrastes corrigés cette passe. Manque : le jeu est
un `<canvas>` (inaccessible lecteur d'écran), labels ARIA épars, pas de gestion du focus.
Acceptable pour un jeu, à documenter.

### 12. Onboarding incohérent post-reskin + trop textuel.
Les tableaux d'onboarding restent des affiches **sombres** dans une app désormais **claire**
(framing « poster » acceptable mais à assumer/harmoniser) ; et il reste textuel alors que le
marché fait « apprendre en jouant » → enchaîner sur une 1re partie guidée.

### 13. Monétisation : zéro surface.
La vision méta (Pass de saison, cosmétiques de profil, Tourist Pass, quêtes sponsorisées) n'a
**aucun point d'entrée** dans l'app. Normal à ce stade, mais à garder en tête : la collection
d'archives (livrée) en est le 1er crochet de rétention — bien.

---

## CE QUI EST DÉJÀ BON (à préserver)
- **Game-feel du mini-jeu** : hitstop, ralenti, particules, tambours génératifs + Marseillaise,
  pavé à un doigt enfin jouable. Niveau « casual premium ».
- **Architecture** : monorepo propre, contrat de mini-jeu pluggable, **modèle de données
  multi-villes** déjà en place (réseaux) — l'export ville = extension, pas reconstruction.
- **Sécurité serveur** : score 100 % serveur, RLS, télémétrie — la bonne doctrine (à activer en prod).
- **Stack légère** (6 deps app), build cloud, PWA. Cohérent avec la contrainte Chromebook.
- **Guest-first** respecté partout.

---

## SÉQUENCE RECOMMANDÉE (l'inspecteur signe ici)
1. **Instrumenter** (analytics events + Sentry) — on arrête de voler à l'aveugle. *P0*
2. **CI + tests du score & invariants moteur** — on arrête de casser la prod. *P0*
3. **Brancher le vrai Supabase en prod** — le classement devient réel. *P1*
4. **Session DA** : boutons physiques, 1-tap-to-play, portrait, juice UI (cf. doc dédié). *P1*
5. **2ᵉ archétype + 2ᵉ station** — prouver la plateforme. *P1*
6. **Line-pack offline** — amorcer le vrai pari « jeu du métro ». *P1*
7. **Pipeline de contenu** assisté — débloquer l'échelle. *P1*

> Tant que 1 et 2 ne sont pas faits, **tout le reste est construit sur du sable** : on ne saura
> pas si ça marche, et on cassera ce qui marchait. C'est le seul vrai « cap supérieur ».
