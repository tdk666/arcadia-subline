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

- **AUDIT BOARD FTUE → suivi (2026-06-24)** : le board a audité le code réel (pas le compte-rendu) — **GREEN** sur tout le statique (handoff `→/` = pas de boss, gating 1×, IntroBoundary, 31 tokens CSS présents, 0 emoji, parité i18n 20=20, poses Marc OK, péché d'Agathe corrigé). **Corrigés** : finding #1 « `firstStation` abstraction qui fuit » → branche morte `boardOrigin` retirée + commentaire honnête (cold-open **ancré Bastille par design**, `firstStation` = copy/analytics). Build complet **rejoué vert** (typecheck games+app + 71 tests + build) = dernier point non vérifié du board clos. **DA inter-agents** : `brain/da-brief-atelier.md` créé (les DEUX labels « Cyberpunk » ET « Paris Souterrain » sont MORTS → deux couches Bible v3.0, à transmettre à l'Atelier). **OUVERT** : « 2e passe » embeds live — insight technique : la VRAIE démolition exige la fronde (viser), pas le tap-spam → casserait l'« imperdable » de la FTUE ; recommandation = garder le film contrôlable (le vrai jeu est à 1 tap après l'intro). Décision fondateur demandée.
- **FTUE « L'ÉMERGENCE » = FILM 4 TEMPS (DEC-023/024)** : `Emergence.tsx` **réécrit en remplacement total** de la cinématique 7-actes. (A) art-direction portée de Claude Design : easings nommés (`--ease-emergence/conquest/authority`), grain filmique constant, gloss émail-only, 3 transitions continues (light-wipe → push-in → pull-out), apex kinétique lettre-par-lettre, drapeau overshoot. (B) **compréhension** : carte lisiblement métro (noms réels + icônes-âmes = variété), copies FR/EN « Paris, chaque station un jeu » / drapeau LIBÉRÉE (jamais un rang) / échelle « Chef de Station → Empereur » + couronne verrouillée + balise Gare de Lyon (reviens demain). Honnêteté intacte : firstStation=param (défaut Bastille), pas de gate géo, « ta conquête ». Marc réel (poses pointe/celebre/salut) + sfx réels câblés ; **embeds live MapLibre/Matter.js = 2e passe visuelle** (choix « film fiable d'abord » : rendu non vérifiable à l'aveugle). Connecteur Design inaccessible en remote (bundle fourni en local). Tué : 7-actes, « métro boulot dodo », faux quiz/rang, Mémoire n°002, fleur-de-lys, « Commencer sans compte ». typecheck games+app + 71 tests + build verts. À valider en preview (fidélité frames + test de compréhension sur un inconnu).
- **SPRINT « POST-DB » (DEC-019, 2026-06-24)** : actions DB faites **par le board** (connecteur) : **0022 APPLIQUÉE en prod** (`fn_submit_attempt` = version flag ; `arcadia.presence_required` OFF ⇒ `scored=true` partout, test J+1 lisible ; sacré intact ; anon ne peut pas exécuter ; `quest_steps=153`) + **registre réconcilié** (0016-0021 en métadonnée, corps non rejoués ; `db push` désarmé). Mon travail ce sprint : (1) **brain = vérité** — DEC-019, note §3 « 0022 LIVE », invariant **« jamais `db push` »**, ce log. (2) **Surface testeur** vérifiée propre : nav = 4 onglets (Carte/Collection/Classement/Profil) ; pas de route Pass/Saison/clan ; `/boutique` accessible seulement via bouton Profil et **fonctionnelle** (halos) → pas d'onglet mort ; titres intermédiaires jamais surfacés. (3) **FTUE affordance** renforcée : pastille « Entrer » en laiton vif sur Acier (fini le creux d'opacité 0.35 de `ftue-breathe`) + **fallback** `hint` après 2,5 s sans tap (agrandit + `animate-glow`), logique au-touché inchangée, tout l'écran tappable. typecheck games+app + 71 tests + build verts. **Merge-ready, PAS mergé** (autorité fondateur).
- **SPRINT « TEST-READY » (DEC-017/018)** : (A 🔴) **présence dé-gatée par flag** — migration **0022** prête (`fn_submit_attempt` = def 0021 à l'identique SAUF bloc présence, désormais derrière `arcadia.presence_required`, défaut false ⇒ tout compte) + miroir client `lib/flags.ts → PRESENCE_REQUIRED=false`. ⚠️ **0022 NON appliquée** (connecteur Supabase déconnecté en cours de sprint) → à poser via `apply_migration` au retour, sinon test J+1 illisible (live encore en 0021/présence requise). (B 🔴) **surface simplifiée** : la démo respecte le flag (tout compte), la bannière de présence (StationScreen) ne s'affiche que si le gate est actif (sinon elle mentirait). Titres intermédiaires (Baron/Maire/Roi) : **jamais surfacés en UI** (moteur `titles.ts` seul) → rien à masquer ; un seul classement nav (Paris/XP) + Chef de Station discret. (C 🟠) **audit registre** : 0016-0021 idempotents individuellement (0017 seed UPSERT par (quest_id,position)) MAIS **piège d'ordre** (0016 redéfinit fn_submit_attempt, 0019 classements sans `scored`) → ré-enregistrer DANS L'ORDRE en finissant par 0021 puis 0022, vérifier la def + count quest_steps=150 au connecteur. NON enregistrées (connecteur absent). (D 🟠) **brain aligné Bible v3.0** : DA deux couches (Châssis Acier #111115/Laiton + Couche Ville Craie/Émail/Guimard), tokens Acier **déjà présents** dans index.css (rien à ajouter), invariants DA + présence réécrits, DEC-017 (DA) + DEC-018 (présence=flag, supersède DEC-015), note §3/§6 màj. typecheck games+app + 71 tests + build verts. PAS de merge main.
- **CORRECTIFS JEU + NOTE STRATÉGIE (DEC-016, retours live)** : (1) **Bastille glissement** cause racine = blocs « endormis » qui dérivaient → **statiques pendant la visée**, dynamiques au 1er tir + courtines dé-chevauchées. (2) **OR** : 1 baril dans le renfoncement du pont-levis (à mériter) + souffle R 140→105 — ⚑ à playtester. (3) **Quiz aléatoire** pur + garantie d'≥1 illustrée (tests réécrits). (4) **Classement station toujours visible** (la donnée marchait, 0021 confirmée en base via connecteur). (5) **Attribution OSM** discrète (CSS ; non supprimable, ODbL). (6) **`brain/note-intention-strategie.md`** = handoff pour la conversation stratégie (connecteur Supabase). **MIGRATION 0021 APPLIQUÉE par le fondateur** ✓ (gate présence live serveur). Reporté : titres géo (manque data), social (clic profil), titres→cosmétiques, déverrouillage séquentiel, positions au Profil. typecheck games+app + 71 tests + build verts.
- **PRÉSENCE REQUISE — gate généralisé (DEC-015, choix fondateur « géo-gate »)** : reconstruction du cœur de boucle. Toute quête de station n'est **comptabilisée** (points/XP/maîtrise/classement) qu'avec **check-in actif** ; sans présence = **entraînement** jouable mais non crédité. Tranche **client+démo LIVE** : flag `AttemptResult.scored`, store ne crédite que si `scored`, bannière « Entraînement » au résultat + bannière de présence à la station (i18n FR/EN). En démo le check-in est libre → preview 100 % jouable, montre le modèle. **Serveur** : migration **0021_presence_gate.sql** prête (gate doux dans `fn_submit_attempt`, colonne `quest_attempts.scored`, classements filtrent `scored`) — **à appliquer après revue, pas en paste aveugle** (porte de score sacrée). Supersède l'invariant « knowledge async-first ». typecheck + 71 tests + build verts.
- **IA CLASSEMENTS + CARTE révisée (DEC-014, retours live fondateur)** : (1) **podium → tableau vertical** (composant `Leaderboard` réécrit, 1 rang/ligne, top-3 or/argent/bronze, couronne #1, ligne « TOI » + cible). (2) page **« Classement » du menu = GÉNÉRALE** (`getGlobalLeaderboard` → matview `leaderboard_entries` scope global, XP, **zéro SQL**), apex « Empereur de Paris » ; le classement station reste à la station. (3) **carte** : phare pulsant sur les **stations au contenu prêt** (Louvre-Rivoli + Bastille, plus arbitraire), **halo retiré** (carte minimale). (4) **attribution** réduite (custom compact « © OpenStreetMap » ; OSM = légalement obligatoire, non supprimable). typecheck + 71 tests + build verts. **OUVERT** : logique « on joue quand on est sur la ligne » → proposition d'archi à trancher (contredit l'invariant async jouable). Profil « tes positions » = passe suivante.
- **CARTE — passe « claque visuelle » #1 (DEC-013)** : reprise du plan de bataille initial. (a) **phare héros pulsant** sur Louvre-Rivoli (`StyleImageInterface` MapLibre, canvas zéro-asset : cœur laiton + onde en boucle) = point focal « tape-moi » Pokémon-GO, tappable. (b) **halo chaud** sous les stations jouables → la ligne « respire ». 100 % additif/défensif (try/catch, aucune couche retirée). typecheck + 71 tests + build verts. **À valider en preview** (travail à l'aveugle, le sandbox ne rend pas la WebGL). Suite : pulse sur la prochaine station à conquérir (état joueur). NB branche : tout le travail vit sur `claude/ftue-emergence` (PR #5, preview Netlify), PAS sur la `happy-sagan` assignée par défaut (40 commits en retard) — ne pas fragmenter le flux fondateur.
- **CONTENU mini-jeux = BLOQUÉ ATELIER** : re-scan Drive confirmé — aucune nouvelle station/image produite (37 verified / 113 to_verify inchangés). Seul correctif intégrable appliqué : Louvre g-73 date pyramide 1990 → 1989 (FR+EN). #8 attend la livraison de l'Atelier Culturel.
- **CLASSEMENTS glow-up + Maître de la Ligne (UI)** : composant podium `Leaderboard` réutilisable (top-3 sur socles, ligne « toi » + cible à dépasser) appliqué sur StationScreen (Chef de Station) ET l'écran Classement ; bannière « Le Sacre » quand tu détiens la couronne. L'écran Classement bascule sur **fn_line_leaderboard** (Σ station_best = Maître de la Ligne, décision #3 tranchée : source unique). Client-only, aucun nouveau SQL (0020 déjà en prod). 71 tests verts.
- **TITRES Phase A+B LIVE** : `0019 fn_station_leaderboard` (Chef de Station, appliqué par le fondateur) + **`0020 fn_line_leaderboard`** (Maître de la Ligne, appliqué via MCP & REGISTRÉ — réconcilie un peu DEC-003). Chef de Station câblé côté client (StationScreen, démo+live). **Bug corrigé** : barils de poudre Bastille déplacés hors-chevauchement (x470/x548) → fin du glissement des briques. Reste : UI Maître de la Ligne, puis titres géo (Baron/Maire/Roi/Empereur) + mapping station→arrondissement/rive (IDFM).
- **ARCHITECTURE DE JEU validée (DEC-012) — titres géographiques** : maîtrise sans fin = score-chase + classement (Geometry Dash), PAS niveaux Candy Crush. Hiérarchie de couronnes contestables (Chef de Station → Roi de Ligne → Boss de Quartier → Maire d'Arrondissement → Élu de Rive → Empereur), dérivées d'UNE source de vérité `station_best`. Présence vérifiée = âme des titres (multiplicateur + couronne « Vérifiée »), async jouable (plancher §5). Design complet : `brain/architecture-jeu.md`. **Cœur algorithmique pur livré** : `lib/titles.ts` (agrégation/classement par scope, 11 tests) — DB-agnostique, prêt à brancher au serveur. Reste : wiring DB (station_best + leaderboards, migrations additives) + mapping géo IDFM.
- **✅ SÉCURITÉ — alerte Supabase « rls_disabled_in_public » = FAUX POSITIF** (DEC-010) :
  diagnostic confirmé — seule `public.spatial_ref_sys` (table système PostGIS, données EPSG
  publiques) est sans RLS ; **les 20 tables Arcadia ont la RLS active**. Non modifiable
  (pas propriétaire) et inutile à sécuriser → **aucune vulnérabilité réelle**. Migration
  `0018_rls_hardening.sql` corrigée (exclut tables d'extension, avale insufficient_privilege
  → no-op propre, filet futur). Reste : **dismiss** l'alerte dans le dashboard Supabase.
- **BASTILLE — baril de poudre + aide + son** (retours fondateur, réf. Angry Birds) : (a) **barils de poudre** (`material:'powder'`) qui EXPLOSENT en chaîne (souffle + dégâts de zone via `explode()`, rendu barril cerclé + mèche) → rend le palier **OR jouable** (3 boulets) ; placés au pied de la forteresse (clé : la poudre que le peuple vint saisir). (b) **bouton « ? »** in-game → overlay objectif + commandes + astuce baril (rappelable à tout moment). (c) **hymne adouci** : lead triangle + nappe cuivrée désaccordée + sub sinus au lieu du carré « chiptune ». typecheck games+app + 60 tests + build verts. NB : score intact (les barils ↑ destructible ET destroyed ; targetPct inchangé).
- **BASTILLE HUD always-on + INTRO clarté** : (a) le HUD démolition devient une **barre haute pleine largeur TOUJOURS rendue** (ne dépend plus de l'état `hud`), compteurs en **texte** (« pavés 5/5 », « 40% / 50% ») → le compteur de pavés et le % de destruction enfin visibles (4e signalement). (b) Intro : instruction de tap en **pastille claire** (point + libellé) au lieu d'un texte minuscule, et libellé `tapStation` honnête (« touche pour entrer dans Louvre-Rivoli », sans flèche trompeuse). 60 tests verts.
- **SPRINT « failles » P0 (retours fondateur)** : (1) **PWA `orientation: any`** — `portrait` verrouillait l'app installée → la Bastille (paysage) restait coincée derrière l'écran « pivote » : c'était LA cause de « je ne vois pas le % » + « je ne peux pas passer en paysage ». (2) **Carte unifiée** : après l'intro on atterrit sur `/` (même carte que la nav), fini la double-carte. (3) **Reveal quiz** : image bornée à 26vh + pied Continuer sticky → jamais bloqué (Vénus). (4) **Intro robuste** : ErrorBoundary + SW auto-update périodique (60s) → plus d'écran noir / vieux build servi. (5) **Purge tells IA** : 345 tirets cadratins (—) retirés de l'UI + contenu (i18n, Louvre, Bastille, ligne-1). 60 tests + typecheck app+games + build verts.
- **BASTILLE HUD + BADGES cliquables** (sur PR #5, retours fondateur) : le **% de destruction** passe en **grand chiffre live AU CENTRE en haut** (impossible à rater ; avant perdu en haut-gauche) ; badge de palier redondant retiré (déclutter) ; contrôles bas-gauche z-40 (jamais masqués). **Hauts faits cliquables** : tap → détail (titre, comment l'obtenir, obtenu/à débloquer) — répond à « on ne sait pas pourquoi on gagne ça ». OrientationGate laissé tel quel (contrainte navigateur, noté). 60 tests + typecheck app+games + build verts.
- **QUIZ — déblocage + plus visuel** (sur PR #5) : **bug bloquant corrigé** — la carte de reveal (image+explication) débordait et le bouton « Continuer » devenait inatteignable ; désormais **contenu défilable + CTA Continuer STICKY** (jamais bloqué). Plus visuel : fond « Cabinet des Merveilles » (profondeur chaude galerie / ombre émail), question présentée en **cartel de musée** (carte encadrée, filet doré, filigrane ❖). 60 tests verts.
- **IMAGES LOUVRE corrigées** (DEC-011, sur PR #5) : les 37 images `verified` pointaient des URLs de PAGE wiki (rejetées par `isUsableQuizImage`) → **converties en URLs directes upload.wikimedia.org** (MD5 canonique). Test anti-régression ajouté. 60 tests verts. Reste TODO Atelier : 113 `to_verify`.
- **MINI-JEUX — retours fondateur** (DEC-009, sur PR #5) : **Quiz** = chrono chiffré
  (⏱ Ns), **musique** ambiante « Cabinet des Merveilles » (`games/src/quiz/audio.ts`),
  anti-débordement (zone question `min-h-0`+scroll), **tirage biaisé vers les œuvres
  illustrées** (`drawBank(prefer=isUsableQuizImage)`). **Bastille** = HUD **% chiffré
  proéminent** + correctif factuel brief argent (invalides = défenseurs). **Drive →
  brain** : `brain/mini-jeux.md` (8 archétypes, 10 boss, banque/images Louvre + IMAGE_LOG,
  spec Bastille). 59 tests + typecheck app+games + build verts. ⚑ ouverts : compléter les
  images `verified` (Atelier), aligner targetPct↔answer_key (sprint scoring).
- **FLÂNEUR — révélation d'archive sonore** (sur PR #6) : `lib/feedback.ts ▸ reveal()`
  = accord chaud (quinte ouverte Do-Sol-Do, filtré) + haptique, joué à l'ouverture
  de `ArchiveCard` (le pendant sonore du sceau). 57 tests verts.
- **STRATÈGE — Hauts faits (méta-progression)** (DEC-008, sur PR #6) : `lib/achievements.ts`
  (pur, 6 tests) = 7 hauts faits + `buildSnapshot`/`unlockedAchievements` ; toast global
  de déblocage `AchievementToast` (anti-spam : ligne de base figée au 1er rendu) ;
  section « Hauts faits » au Profil (grille acquis/verrouillés). 57 tests verts.
- **TOURISTE (partiel) + hygiène i18n** (sur PR #6) : bascule **FR/EN dès le 1er
  écran** (FTUE) pour ne jamais piéger un touriste ; `<html lang>` posé au 1er rendu ;
  **suppression du bloc `onboarding.*`** (mort + cadrage « canapé » reversé) → source
  de vérité unique. 51 tests verts. Reste Touriste : onboarding concierge (locale=en),
  landmarks `gold`.
- **DÉFI DU JOUR — rituel quotidien + 1-tap-to-play express** (DEC-007, sur PR #6) :
  réponse directe au board (« définir+enseigner la boucle 30 s + rituel station du
  jour + résultat partageable ») et au playtest Agathe (« trop long »). `lib/challenge.ts`
  (picker pur, 8 tests) choisit le défi du jour (prochain palier sensé, rotation
  déterministe) ; le CTA bas de `NetworkScreen` devient « Défi du jour » → **1-tap**
  vers `/play/<slug>/<tier>?x=1` ; `GameScreen` en **mode express** saute le briefing
  si la station est déjà connue (enseigne une fois, puis 1-tap). 51 tests + typecheck
  + build verts. **Drive exploré & réconcilié** dans `source-registry.md` (le brain
  prime ; DA reste claire ; ⚑ mismatch Bastille targetPct à aligner en sprint scoring).
- **PERSONAS verrouillés + « Victory Moment »** (DEC-006) : les 7 personas (Bible DA
  V3.0, Partie V) sont recopiés dans **`brain/personas.md`** (source de vérité
  versionnée) avec état code + backlog priorisé. **Premier lot livré** (persona 7
  « Collégiens » + juice transverse, 100 % frontend) : confettis tricolores
  (`components/Confetti.tsx`, victoire only, reduced-motion safe), fanfare de
  victoire (`lib/feedback.ts ▸ victory()`), **partage natif** (`lib/share.ts` +
  bouton ResultView, Web Share → repli presse-papier, instrumenté, 5 tests), et
  **verrou anti ghost-touch** sur `Button.tsx` (protège la porte de score des
  doubles soumissions). 43 tests + typecheck + build verts. Personas 4 (Clan) &
  6 (Guide) = chantiers backend, hors scope frontend (sprint dédié).
- **FTUE « L'Émergence » P1 — montée craft (profondeur, lumière, son)** (sur PR #5,
  fidèle au Manifeste « reconquête du trajet ») : (1) **nappe sonore ambiante**
  WebAudio (drone Do/Sol désaccordé + battement lent au filtre, fondus in/out)
  dans `lib/sfx-ftue.ts` → `ambientStart/ambientStop`, lancée au 1er geste, coupée
  à skip/finish/unmount + respecte le mute ; (2) **profondeur** : silhouette
  lointaine de Paris (Tour Eiffel, Arc, dômes) en horizon brumeux derrière la
  Ligne 1 ; (3) **key-light chaud** derrière Marc (volume, détachement du fond) ;
  (4) **brand-block enrichi** : cartouche émaillé « PARIS · ① » sous le wordmark
  (signature réseau). Typecheck + 38 tests + build OK. Reste P1 : Marc animé en
  Rive (bloqué : `marc.riv` à fournir par le fondateur).
- **FTUE « L'Émergence » V4 — 100 % au touché + diégétique** (sur PR #5, 5 personas
  + expert) : suppression de tout auto-advance → **le joueur cause chaque étape**
  (jamais trop vite). Cohérence écran↔action : on touche le phare → la rame émerge ;
  on touche **Louvre-Rivoli** (qui pulse) → sa station s'ouvre en quiz (plaque
  « Louvre — Rivoli ») ; le reveal sort de la station ; la **conquête se PLANTE au
  toucher** (la plaque passe tricolore + territoire). Affordance « touche pour… »
  par temps. Plus de symbole hors-sol (étoile retirée).
- **FTUE « L'Émergence » V3 — audit Epic appliqué** (sur PR #5) : (1) narration
  recadrée sur la **reconquête du TRAJET** (fidèle au Manifeste : « temps mort du
  trajet » ; géoloc = bonus, pas « canapé ») — corrigé aussi dans CLAUDE.md +
  map.tapHint ; (2) **UN SEUL MONDE** : plateau de Paris (Ligne 1 + Seine +
  plaques émaillées) qui naît au renversement et persiste — quiz/reveal/conquête
  se jouent DESSUS, caméra tenue (transform), Louvre-Rivoli héros, conquête =
  station tricolore + territoire qui s'illumine ; (3) **couture** : épilogue =
  carte large + « Touche Louvre-Rivoli pour commencer » → /line/M1. Reste P1 :
  brand-block MP59 plus riche, profondeur/lumière, Marc Rive, mix sonore.
- **FTUE « L'Émergence » V2 — registre Lion d'Or** (sur PR #5) : refonte vers
  ÉMERVEILLEMENT CINÉMATIQUE (réf. Sky/Monument Valley) suite retour fondateur
  (« trop rapide, concept pas assez ressenti, pas assez premium »). Tempo HYBRIDE
  (chaque temps respire + tap pour précipiter), le RENVERSEMENT tunnel→Paris en
  plan tenu (~1,8 s, money shot : la ligne se trace, stations éclosent),
  god-rays/vignette/grain, **sound design en couches** (WebAudio `lib/sfx-ftue.ts`,
  débloqué au 1er geste, mute), **wordmark Space Grotesk**, Marc détouré (pose-swap).
  Beats : tunnel(quotidien) → renversement → promesse(touche d'où tu veux) →
  quiz → reveal(loot Malraux) → conquête(tricolore) → épilogue guest-first.
- **FTUE « L'Émergence »** (DEC-005) sur `claude/ftue-emergence` / **PR #5** :
  cinématique d'accueil premium sur **doublure Marc** (drop-in Rive) + **passe
  « source de vérité unique »** : tokens DA unifiés dans `index.css @theme`
  (Acier inclus), FTUE migrée aux tokens, ancien `Onboarding.tsx` supprimé
  (clé → `lib/ftue.ts`). Reste : `marc.riv` (agent Rive, prompt versionné) +
  planche de réf Marc.
- PR #4 (discipline déploiement Netlify, DEC-004) : ouverte, non mergée.

## ASSETS / DETTE (suite « source unique »)

- **6 rendus Marc nano banana** dans Drive `09_MARC` (~6,8 Mo chacun) = **référence
  pour l'animateur Rive**. PAS intégrés au web (trop lourds ; pas d'optimiseur
  d'image dispo dans l'env). À optimiser en webp ≤100 Ko pour upgrader la doublure
  (ou exporter optimisé). La doublure tourne sur `poinconneur.png` (1,6 Mo, déjà là).
- **Migration hex legacy** : ~200 hex inline restent dans les composants hors-FTUE
  (beaucoup sont des illustrations SVG légitimes ; certains sont des couleurs de
  marque à passer en token). Sweep mécanique à faire par lots (faible risque/fichier),
  hors de ce tour pour ne pas risquer tout le visuel d'un coup. Règle posée dans
  `invariants.md`.
- **Couleurs de paliers dupliquées** (TIER_* dans GameScreen/StationScreen/QuizGame/
  DemolitionGame) : candidat à un module partagé (cross-package app↔games) — suivi.
- Police **Space Grotesk Black** pour le wordmark (Bible) : non chargée (placeholder
  Outfit) — sprint DA dédié.

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
