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

- **🔴 SÉCURITÉ — alerte Supabase « rls_disabled_in_public »** (DEC-010) : une table de
  `public` exposée sans RLS. Le dépôt active pourtant la RLS partout → table créée HORS
  migrations (dette DEC-003) ou matview `leaderboard_entries`. Migration **`0018_rls_hardening.sql`**
  (filet idempotent, active la RLS deny-by-default sur toute table de base non couverte)
  **committée mais PAS encore appliquée en prod** (connecteur Supabase MCP indisponible ce
  tour). **À appliquer** : MCP rétabli (`get_advisors`+`apply_migration`) ou fondateur (SQL
  Editor). Voir le bloc SQL prêt-à-coller fourni en chat.
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
