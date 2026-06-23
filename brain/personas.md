# 👥 Personas — les 7 parcours utilisateurs (source : Bible DA V3.0, Partie V)

> Origine : « Bible de Direction Artistique Arcadia Subline V3.0 » (Drive,
> `1lt2b3T5rVijwZ_e9zcT4Onzr4WG7mQ0ZKWZWr194aXs`), Partie V « Use Cases Précis &
> Parcours Utilisateurs Commuters ». Recopiés ici car le **brain est la source de
> vérité versionnée** (le Drive est une vitrine). Toute UX se justifie par rapport
> à ces 7 profils + les 5 lois UX (`Direction DA & UX (réf)`) + l'audit Inspecteur.

## Les 5 lois UX (non négociables)
1. **Pouce d'abord** — action primaire dans les 40 % bas, cibles ≥ 56 px.
2. **1 tap pour jouer** — lancer une partie en 1–2 taps depuis la carte.
3. **On apprend en jouant** — onboarding par le geste, zéro mur de texte.
4. **Tout est juteux** — squash & stretch, particules, ≥ 3 sons, haptique, compteurs.
5. **Un seul CTA évident par écran.**

## Les 7 personas

| # | Persona | Contexte | Besoin clé | État code |
|---|---------|----------|-----------|-----------|
| 1 | **Pendulaire de 8h15** (urgence tactile) | L13 bondée, 1 pouce, réseau Edge, attention 5 % | Sécuriser le Streak en < 60 s, offline-first, climax rapide | Streak/DailyObjective/DailyReward ✅ · PWA SW ✅ · **FAIT (lot Défi du Jour)** : 1-tap-to-play (carte → défi du jour → express, brief sauté si station connue) · **reste** : jeu/score jouable offline |
| 2 | **Flâneur de 14h30** (slow travel) | L6 aérienne, assis, soleil plein écran | Lisibilité plein soleil, archives sourcées (pas trivia IA) | Métro Clair ✅ · ArchiveCard (stamp/shine) ✅ · contenu fr/en ✅ · **manque** : ambiance sonore reveal, +stations |
| 3 | **Stratège de 23h45** (tension nocturne) | Au lit, noir, Wi-Fi | Métagame sombre, tabular-nums, vérifier Streak avant minuit | tabular-nums ✅ · count-up ✅ · Boutique/Ligue/Profil ✅ · **manque** : châssis sombre hors-FTUE, succès/badges, saisons |
| 4 | **Clan de Rame** (guerre de territoire) | L9, clan asynchrone | Domination tribale, frontières, émotes, **zéro chat** | **ABSENT** (modèle solo by design ; gros chantier backend — voir Statut) |
| 5 | **Touriste Ébahi** (passeport patrimonial) | L1, ne parle pas FR, stressé | Onboarding apaisant, multilingue, archives-souvenir | i18n fr/en + auto `navigator.language` ✅ · **FAIT (partiel)** : bascule **FR/EN dès l'accueil** (FTUE), `<html lang>` au 1er rendu, purge des clés `onboarding.*` obsolètes (cadrage « canapé » reversé) · **reste** : onboarding « concierge » localisé, landmarks gold, GeoIP |
| 6 | **Guide Conférencier** (EdTech) | Arts et Métiers, groupe de 15 | Lobbies privés QR, hub narratif synchronisé | **ABSENT** (Phase 2 ; backend realtime — voir Statut) |
| 7 | **Bande de Collégiens** (stress-test) | Android fissuré, batterie 15 %, spam | 60 FPS, anti ghost-touch, drop tricolore partageable (vanité = acquisition #1) | **FAIT ce tour** : anti-ghost-touch (Button), confettis tricolores + fanfare (victoire), partage natif (Web Share) |

## Backlog priorisé (frontend d'abord, sans backend ni asset externe)

**Livré (PR victory-moment) — persona 7 + juice transverse :**
- `components/Confetti.tsx` — confettis tricolores GPU, victoire only, reduced-motion safe.
- `lib/feedback.ts ▸ victory()` — fanfare arpège majeur + haptique de célébration.
- `lib/share.ts` + bouton « Partager ma conquête » (ResultView) — Web Share API → repli presse-papier, instrumenté (`share`/`share_cancel`/`share_fail`). Tests (5).
- `Button.tsx` — verrou anti double-déclenchement (350 ms) : protège la porte de score.

**Livré (lot Défi du Jour) — persona 1 « Pendulaire » + rituel quotidien (board) :**
- `lib/challenge.ts` — picker pur du **défi du jour** (prochain palier sensé, rotation
  déterministe par jour, priorité progression puis rejeu). 8 tests.
- `lib/content.ts ▸ playableStations()` — stations jouables de la ligne héros.
- `screens/NetworkScreen.tsx` — le CTA bas (thumb-zone) devient **« Défi du jour »** :
  station + palier + flamme/série, **1-tap → /play/<slug>/<tier>?x=1** (express).
- `screens/GameScreen.tsx` — mode **express** (`?x=1`) : saute le briefing UNIQUEMENT
  si la station est déjà connue (≥ 1 palier gagné) → enseigne une fois, puis 1-tap
  pour toujours (réponse directe à Agathe « trop long » + loi UX #2). Gate
  `progressReady` pour ne pas tirer une manche avant la progression de banque.
- Instrumentation : `daily_challenge_launch`, `game_start{express}`.

**Livré (lot Touriste, partiel) — persona 5 + hygiène i18n :**
- `i18n/index.ts` — `<html lang>` posé au 1er rendu (a11y/SEO).
- `ftue/Emergence.tsx` — bascule **FR/EN dès le 1er écran** (le touriste n'est jamais piégé).
- `i18n/fr.ts`+`en.ts` — **suppression du bloc `onboarding.*`** (mort + cadrage « canapé »
  reversé) → une seule source de vérité, plus de piège pour les agents.

**Prochains lots candidats (ordre de leverage, tous frontend) :**
1. **Stratège** : succès/badges (méta-objectif), anneaux de progression partout.
2. **Touriste (suite)** : onboarding « concierge » quand locale = en, CTA landmarks `gold`.
3. **Flâneur** : nappe sonore douce au reveal d'archive (réutiliser le synthé WebAudio).

**Chantiers lourds (backend / hors scope d'un tour, à arbitrer) :**
- **Clan de Rame (#4)** et **Guide Conférencier (#6)** : nécessitent tables Supabase
  + realtime + RLS (touche la zone « scoring sacré »). À traiter en sprint dédié,
  pas en passe frontend. Le modèle est aujourd'hui **solo by design** (playtest Agathe).
- **Offline guest play (#1)** : jouer/scorer hors-ligne → file optimiste déjà là
  (`store.pending`/`flushPending`), reste l'aperçu local de score en mode invité.
