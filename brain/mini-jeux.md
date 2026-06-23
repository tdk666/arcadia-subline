# 🎮 Mini-jeux — miroir de l'Atelier Culturel (Drive → brain)

> Source : Drive `06_MINI_JEUX` (`1vqOb44ItWuFnoVw1K-vHTOTDC9u_EoxS`). Le brain est
> la source de vérité ; ceci recopie l'essentiel pour ne plus dépendre du Drive.
> Règle cardinale : **n'invente pas la culture** — le contenu vient de l'Atelier.

## Les 8 archétypes (canon, RESERVOIR)
A1 **Quiz** · A2 **Démolition** · A3 Tactique/barricade · A4 Rythme · A5 Cherche-et-trouve ·
A6 Runner souterrain · A7 Mots/toponymie · A8 Bâtisseur (+ réintégrés : Association, Labyrinthe).
Modèle : ~8 moteurs ré-habillables (≈80 % du réseau) + ~10 « boss » sur-mesure.
**Prouvés en code : A1 Quiz (Louvre-Rivoli) + A2 Démolition (Bastille).** Reste : A3/A6
= plus gros multiplicateurs — MAIS « un jeu n'est bâti que le jour où une station l'a mérité
par la rétention » (gouvernance board).

## Boss (RESERVOIR) — Ligne 1 ouest→est
B1 Montparnasse · B2 Étoile · **B3 Bastille = démolition étalon** · B4 Châtelet (labyrinthe) ·
B5 Concorde · B6 Opéra (rythme) · B7 Denfert (runner catacombes) · B8 Bir-Hakeim (tower-defense) ·
B9 Blanche · B10 Télégraphe. **Louvre-Rivoli = exemplar A1 Quiz.**

## Louvre-Rivoli (A1 Quiz) — banque & images
- **Source Drive** : `LOUVRE RIVOLI/` (`1FpeRsAFIBzLlSItxOzvli_dPsbHdhLfC`) →
  `louvre-rivoli.json` (`1Jg7ddhji8ltdJk5kofk-y4PTqg1fSpPa`, 150 items) +
  `louvre-rivoli_IMAGE_LOG.md` (`1QQqHhOdEQZHcIuH2WmlKjuDQ468YNy0r8fuzLpQotow`).
  **Pas de fichiers image dans le Drive** : URLs Wikimedia Commons dans le JSON.
- **Repo** : `content/stations/louvre-rivoli.json` porte déjà la banque 150 (bronze 30 /
  silver 30 / gold 90), images incluses. **Statut images : 37 `verified`** (5 œuvres
  réutilisées) / 113 `to_verify`.
- **⚠️ Bug corrigé (DEC-011)** : les 37 `verified` pointaient des **URLs de PAGE wiki**
  (`commons.wikimedia.org/wiki/File:…`) → rejetées par `isUsableQuizImage` (garde `/wiki/`)
  donc **aucune image ne s'affichait**. Converties en **URLs directes**
  (`upload.wikimedia.org/wikipedia/commons/<h>/<hh>/<fichier>`, MD5 canonique). Test
  anti-régression : tout `verified` DOIT passer `isUsableQuizImage`.
- Paliers : bronze `lives 3 · timerS 0 · draw 5` · silver `lives 2 · timerS 12 · draw 6` ·
  gold `lives 1 · timerS 8 · draw 8`. Seuils points 30/36/56. Archive #002.
- **5 œuvres `verified`** (Wikimedia, réutilisées) : La Joconde, Vénus de Milo, Le Scribe
  accroupi, Victoire de Samothrace, La Liberté guidant le peuple.
- IMAGE_LOG : cibles `to_verify` (Hammurabi, Lamassu, Radeau de la Méduse, Sacre de
  Napoléon, Grande Odalisque, Noces de Cana, Dentellière, Esclaves de Michel-Ange…).
  Règles : 2D PD-Art OK ; photo de sculpture = licence du photographe ; **⚠ pyramide de
  Pei = sous copyright** (éviter en visuel). **TODO Atelier** : compléter les URLs verified.
- Image montrée **APRÈS la réponse uniquement** (décision board). Le host **biaise le
  tirage vers les items illustrés** (`drawBank(..., prefer=isUsableQuizImage)`) pour que
  le joueur voie l'art malgré la rareté des verified.

## Bastille (A2/B3 Démolition) — spec
- Pas de dossier Bastille au Drive : params en repo. `content/stations/bastille.json` +
  `games/src/demolition/levels/bastille.ts`.
- Paliers : bronze `maxShots 5 · targetPct 0 · pas de timer` · silver `4 · 35 % · pas de
  timer` · gold `3 · 50 % · timer 75 s · plaques de fer`. Monde 960×600, **3 étendards
  royaux** (1 par tour : ouest / donjon central / est), 2 courtines, pont-levis ; gold
  ajoute 2 plaques de fer. Victoire = 3 étendards à terre (+ targetPct sur silver/gold).
- **HUD live** (DemolitionGame) : pavés restants, étendards, **% destruction chiffré +
  barre + repère de cible**, chrono (gold). Tambours + Marseillaise (audio.ts).
- **Correctif appliqué** (APPROFONDISSEMENT) : brief argent disait « les invalides ont
  rejoint l'assaut » = FAUX (les invalides DÉFENDAIENT). Réécrit : Gardes françaises
  passées au peuple amènent les canons ; invalides + Suisses défendent.
- Cliffhanger fin de session : Bastille → Gare de Lyon.

## Exigences UX mini-jeux (audit + Bible + retours fondateur)
- **HUD live lisible** (% ≤ 100, jamais sombre-sur-sombre) — % chiffré proéminent.
- **Chrono visible chiffré** quand il existe (quiz silver/gold, démo gold). Bronze = sans chrono (voulu).
- **Musique** : Bastille = tambours + Marseillaise ; Quiz = nappe « Cabinet des Merveilles » (ambient WebAudio).
- **Orientation** : démolition = paysage (OrientationGate) ; quiz = portrait, 1 main, 1-tap.
- **Scoring SACRÉ** : le mini-jeu ne calcule jamais le score (télémétrie brute → `fn_submit_attempt`) ; `answer_key` jamais client.

## TODO mini-jeux (suivi)
- [ ] Atelier : compléter les images `verified` (Hammurabi, Radeau, Sacre…) avec URLs Wikimedia jouables.
- [ ] ⚑ Aligner `bastille.json` targetPct (35/50) ↔ `answer_key` serveur (sprint scoring).
- [ ] A3/A6 = prochains archétypes quand une station les mérite (rétention).
