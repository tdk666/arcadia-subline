# 🧬 Canon — porte de compréhension (Phase 0)

> Écrit par Claude Code (build) après lecture INTÉGRALE du corpus : Manifeste v1.0,
> Bible DA v3.0 (7 onglets), Direction Identité/DA/Intro, Réservoir créatif v1.0 +
> addendum v1.1, Approfondissement Louvre/Bastille, le JSON Louvre-Rivoli (miroir
> repo), les 11 notes de `/brain` ET le code réel (`ftue/Emergence.tsx`, `MarcGuide.tsx`,
> `index.css`, i18n, seed). Rien ici n'est du copier-coller : c'est ce que j'ai compris,
> reformulé pour prouver que je peux coder HABITÉ par cette vision, pas juste correct.
> Les contradictions du corpus sont nommées en fin de document, sans lissage.

---

## 1. La vision et l'horizon long

Arcadia SubLine naît d'un retournement, pas d'une idée d'app : sur la ligne 6, au
moment précis où la rame émerge devant la Tour Eiffel, personne ne lève les yeux —
le réseau le plus chargé d'Histoire de France est traversé en aveugle, « seuls
ensemble ». Au lieu d'accuser le téléphone, on le retourne : l'objet qui isole
devient l'artefact qui reconnecte les gens à leur ville et entre eux. Le produit
répare trois manques d'un coup — le temps mort (1,4 Md de voyages/an subis),
l'isolement numérique, la cécité culturelle (Bastille, Alésia : des noms que
personne ne sait expliquer) — en transformant le réseau en plateau de jeu vivant :
chaque station est une histoire, un mini-jeu, un territoire à conquérir. La
singularité n'est aucun des trois piliers isolément mais leur FUSION : jeu vidéo
(conquête, score-chase sans fin façon Geometry Dash) + guide culturel (l'Histoire
est le loot, jamais le devoir) + réseau social (clans de routine, rivalités de
ligne), soudés sur l'infrastructure physique du quotidien — ça n'existe nulle part
ailleurs, et c'est ce triptyque qu'il ne faut jamais démembrer. L'horizon est une
plateforme multi-villes à 15 ans : le châssis (moteur, économie, game-feel,
identité sombre de marque) est invariant et international ; chaque ville est un
Content Pack (Paris → Londres → Tokyo → NY) ; la north star est le Parisien dont
l'app bascule en « Arcadia London » à l'atterrissage — et le modèle de données
(`networks`) est DÉJÀ multi-réseaux, donc l'export est une extension, pas une
refonte. Le moteur économique tient en une équation : RÉTENTION = REVENU. On joue
avant de créer un compte (guest-first), on monétise la profondeur (saisons, défis,
rivalités, Pass) et jamais l'attention ni le savoir (zéro pay-to-win sur un jeu de
connaissance) : ce qui fait rester est exactement ce qui fait payer — c'est UNE
seule machine, pas deux.

## 2. La doctrine de localisation (et le guest-first)

La localisation est une SUR-COUCHE qui enrichit, JAMAIS une dépendance qui bloque.
Trois étages, dans cet ordre de livraison : **jouable** partout sans rien (async —
le plancher : je conquiers ma ligne depuis mon canapé et ça compte) ; **meilleur**
au check-in (présence vérifiée = multiplicateur, couronne « Vérifiée » qui prime —
du prestige, pas un mur) ; **magique** avec la pile de capteurs (suivi inertiel du
trajet, « la rame est une manette »). Il n'y a pas de GPS fiable en souterrain :
la présence crédible repose sur l'OCR de la plaque émaillée (photographier la
plaque = planter son drapeau), pas sur le GPS. L'histoire du projet a déjà éprouvé
cette doctrine dans la douleur : DEC-015 avait fait de la présence un gate
(« on ne marque des points que sur place ») — le board l'a renversé en DEC-018/019 :
la présence est un FLAG runtime (`arcadia.presence_required`, défaut OFF, 0022 live
en prod), le play-from-anywhere compte toujours, et la présence reviendra comme
bonus, jamais comme barrière. Le guest-first est le frère de cette doctrine : on
lance le joueur dans la Bastille avant de lui demander son nom ; le compte se
propose après la première victoire, jamais avant. Aucun mur — ni de compte, ni de
géographie — entre un inconnu et sa première conquête.

## 3. La vérité DA — le système à deux couches

La DA vivante (Bible v3.0, encodée dans `brain/invariants.md` + `app/src/index.css`)
est un système à DEUX COUCHES qui ne se mélangent pas sur un même écran :

1. **Le Châssis** — SOMBRE et premium : Acier Obscur `#111115` (jamais de noir pur)
   + Laiton `#c9a227`. C'est la marque mère, le métagame, la nuit : logo, splash,
   boutique, classements, Pass, menus profonds, et l'Acte 0 du cold-open (le mythe
   du tunnel).
2. **La Couche Ville « Métro Clair »** — CLAIRE et lumineuse : Craie Faïence
   `#f6f1e6` + Bleu Émail `#0a5a9e` (le héros, la plaque) + Vert Guimard `#3f6b4d`
   (validation culturelle). C'est la carte, le jeu, le jour — lisible à bout de
   bras en plein soleil sur un quai aérien.

Le cold-open « L'Émergence » enchaîne les deux dans l'ordre du mythe fondateur —
SOMBRE (tunnel, marque) → CLAIR (Paris jouable) — et ce flip est sacré : la lumière
frappe parce qu'elle suit le noir. Deux labels sont PÉRIMÉS et ne doivent
réapparaître nulle part : **« Cyberpunk Parisien Souterrain »** (le §7 du Manifeste
v1.0 — néons cyan/magenta sur fond nuit, mort) ET **« Paris Souterrain »**
(l'étiquette intermédiaire du reskin de juin, morte aussi). L'erreur classique —
déjà commise par l'Atelier — est de lire le Manifeste pour la DA : le Manifeste
donne l'ÂME (§1–6, 8–11) ; pour la DA, seuls la Bible v3.0 et le brain font foi.
L'architecture de marque à deux étages, elle, tient toujours : Groupe « Arcadia
SubLine » (identité maîtresse, agnostique de la ville) / Ville « Arcadia SubLine
Paris » (un skin par ville ; les couleurs des lignes IDFM = codage de contenu,
jamais identité de marque — et on ne fonde rien sur l'identité RATP).

## 4. Les deux standards créatifs (le travail de l'Atelier = la barre)

**Le mariage inévitable** — la boussole, appliquée comme une guillotine : retire
l'habillage culturel ; si la mécanique reste jouable n'importe où, elle est trop
générique, on la tue. La bonne mécanique est IMPENSABLE AILLEURS : abattre CETTE
forteresse un 14 juillet (Bastille) ; recomposer la Déclaration depuis les
carreaux-lettres qui existent RÉELLEMENT sur les quais de la ligne 12 (Concorde) ;
survivre au rond-point de l'enfer (Étoile). Le pressure-test de l'Étoile dans le
Réservoir montre la méthode : un cozy-builder échoue au test (jouable partout),
le bâtisseur radial « tient à moitié », seul le Frogger du chaos passe — parce
que la réputation mondiale du lieu EST le chaos.

**Le coup au ventre** — le standard de révélation : chaque partie délivre une
révélation sur un lieu réel auquel le joueur est déjà attaché, mesurée par un seul
critère : *le répétera-t-il à quelqu'un demain ?* On joue À Paris, pas SUR Paris.
Le tracé de la Bastille est dans les pavés sous tes pieds ; le Louvre fut un squat
d'artistes avant d'être un musée ; Bienvenüe a creusé Paris d'une seule main. Et
ce standard a un garde-fou : l'EXACTITUDE SACRÉE. L'Atelier a rattrapé de vraies
erreurs (les invalides étaient DÉFENSEURS de la Bastille, pas assaillants ;
pyramide = 1989, pas 1990) et flague honnêtement ce qui reste à sourcer avant ship
(règle 50/50 de l'Étoile, ascenseur Montparnasse, altitude Télégraphe, comptage
Concorde, main-à-la-pomme de la Vénus). Un seul faux « le savais-tu » corrode tout
le moat — l'exactitude n'est pas un détail éditorial, c'est la défense du fossé.

## 5. Profondeur, pas largeur — et l'ordre de build inverse de la séduction

Le vrai livrable n'est pas 321 jeux : c'est ~8 MOTEURS réutilisables (quiz,
démolition, tactique/batailles toponymiques, rythme, cherche-trouve, runner
souterrain, mots/toponymie, bâtisseur) couvrant ~80 % du réseau par ré-habillage,
plus ~10 boss sur-mesure. Deux moteurs sont prouvés en code (A1 quiz Louvre-Rivoli,
A2 démolition Bastille) ; aucun autre ne se construit tant qu'une station ne l'a
pas MÉRITÉ par la rétention — et la rétention J+1 n'est toujours pas lue. Les noms
de stations sont le fossé de contenu (difficile à répliquer) ; la donnée transport
est IDFM/PRIM (ouverte), pas « la RATP ». L'ordre de build est l'INVERSE de la
séduction, et c'est un choix de discipline, pas de timidité : les deux prismes les
plus séduisants du projet — l'in-situ inertiel (« la rame est une manette ») et le
social (clans, guerre de territoire) — sont l'ADN, MAIS le premier est un moonshot
tardif (capteur fragile, pas de GPS souterrain, UX de rame bondée) et le second un
piège de démarrage à froid (il exige la densité, et la sécurité/modération by
design). Donc : l'ennuyeux réutilisable d'abord (moteurs, score serveur, boucle
quotidienne, profondeur d'une poignée de stations exemplaires), la magie en
dernier. Portrait par défaut (Bastille = boss paysage qu'on CHOISIT, jamais un
premier contact imposé). Score serveur uniquement (`fn_submit_attempt`, porte
unique). Rétention avant largeur — si je me surprends à vouloir élargir, c'est le
piège, et je m'arrête.

---

## DÉRIVES REPÉRÉES (contradictions du corpus, non lissées)

Règle d'arbitrage appliquée partout : **git (`/brain` + code) > Drive ; Bible v3.0 >
Manifeste §7 pour la DA ; le Manifeste reste roi pour l'âme.**

1. **Manifeste v1.0 §7 « Cyberpunk Parisien Souterrain » vs Bible v3.0 deux
   couches.** Le §7 prescrit fonds nuit + néons cyan/magenta/or : PÉRIMÉ. La Bible
   v3.0 (Châssis Acier/Laiton + Couche Ville Métro Clair) fait foi, relayée par
   `brain/invariants.md` (DEC-017). Le Manifeste ne se lit QUE pour l'âme.

2. **L'Atelier art-dirigé sur la palette morte.** L'addendum v1.1 du Réservoir
   (§0.1) « recadre tout le réservoir » sur le Cyberpunk — au moment où cette DA
   était déjà morte. Le board avait validé ce label à tort (constat consigné dans
   `brain/da-brief-atelier.md`). Toute production future de l'Atelier doit passer
   par ce brief. Gagnant : brain + Bible v3.0.

3. **« Paris Souterrain » traîne encore dans le corpus.** Le Réservoir v1.0 et
   l'Approfondissement Louvre/Bastille s'en réclament en en-tête ; l'ancien
   `invariants.md` de `main` (pré-PR #5) dit encore « DA Paris Souterrain
   conservée ». Les DEUX labels sont morts (DEC-017/023) ; seul le brain de la
   branche `claude/ftue-emergence` dit la vérité. Gagnant : brain (branche FTUE).

4. **Bible v3.0 Partie II « Éradication du Paysage / 100 % Portrait » vs
   invariant verrouillé « Bastille = boss paysage ».** Contradiction frontale : la
   Bible exige l'éradication du paysage, le brain (et le brief canonique) verrouille
   Bastille en paysage-boss choisi. Gagnant : `brain/invariants.md` — la Bible est
   source unique de la DA, pas des invariants de gameplay. (Une refonte portrait de
   la démolition serait une décision board, pas une lecture de Bible.)

5. **Bible v3.0 Partie VI : check-in GPS `ST_DWithin(50 m)` vs doctrine
   OCR-plaque / présence-jamais-gate.** La Bible spécifie une validation spatiale
   GPS anti-spoofing ; la doctrine (Manifeste §5, brief §B, DEC-018) dit : pas de
   GPS fiable en souterrain, présence = OCR-plaque, et JAMAIS un gate. L'histoire
   récente confirme : DEC-015 (géo-gate) a été renversée par DEC-018/019 (présence
   = flag OFF, 0022 live). Gagnant : brain/DEC-018.

6. **Le mandat décrit une surface « sur `main` à jour » qui n'y est pas.** Les
   fichiers cités (`ftue/Emergence.tsx`, `MarcGuide.tsx`, `brain/personas.md`,
   `brain/architecture-jeu.md`, `brain/mini-jeux.md`…) n'existent PAS sur `main` :
   toute la surface exemplaire vit sur la PR #5 ouverte (`claude/ftue-emergence`,
   ~50 commits, DEC-005→025). Résolution appliquée : la branche de cette phase est
   posée SUR la tête de PR #5 (le réel), pas sur `main`. Après merge de la PR #5,
   ce delta disparaît. Gagnant : le code réel (git = vérité, y compris quand la
   vérité est sur une branche).

7. **« Les 8 archétypes » ne sont pas la même liste partout.** Manifeste §4 :
   démolition, construction, labyrinthe, association, défense, rythme, mots, quiz.
   Réservoir v1.0 : quiz, démolition, tactique, rythme, cherche-trouve, runner,
   mots, bâtisseur (l'addendum réintègre ensuite association + labyrinthe comme
   canon et rétrograde cherche-trouve/runner en « extensions »). Le brief canonique
   reprend la liste du Réservoir. Ce qui est stable : ~8 moteurs × habillages,
   2 prouvés, le reste au mérite. La liste vivante = `brain/mini-jeux.md`.

8. **Incohérences internes mineures de la Bible.** (a) Onglet 1 : Marc « fourrure
   grise » vs Onglet 3 « fourrure rousse-grisée ». (b) Onglet 1 (table Châssis) :
   « Monétisation Freemium / 4,99 € » — le Manifeste §6 qualifie explicitement ce
   modèle de simplification 2023 ; le vrai moteur est le Pass de saison (que la
   Bible elle-même chiffre à 5,99 € en Partie IV). Gagnant : Manifeste §6 + Bible
   Partie IV (rétention = revenu, Pass au centre).

9. **La description Drive de l'intro est en retard sur le code.** Le doc
   Identité/DA décrit « L'Émergence » en 5 actes avec épilogue « Continue — sans
   compte » ; le code réel (DEC-023/024/025) est un film 4 temps avec embeds live
   (vraie carte MapLibre, vrai jeu Bastille indulgent), où le CTA « sans compte »
   a été tué au profit de la balise « Suis la ligne · Gare de Lyon ». Gagnant :
   le code. Le Drive est une vitrine, il photographie un moment.

10. **Trous dans la numérotation DEC.** DEC-004 ne vit que sur la PR #4 (non
    mergée) ; DEC-020/021/022 n'ont jamais été écrites (les migrations 0020/0021/
    0022 existent, DEC-019 couvre l'application de 0022). Le log append-only est
    fragmenté entre branches — à réconcilier au merge, sinon deux sessions futures
    pourraient réutiliser les mêmes numéros.

11. **Dérives d'exactitude — attrapées, et c'est le système qui marche.**
    Pyramide du Louvre datée 1990 dans g-73 (corrigée → 1989) ; brief Argent
    Bastille faisant des invalides des assaillants (corrigé : défenseurs) ; copie
    Gold « quatre boulets » vs serveur 3 (DEC-001/002). Restent flagués À VÉRIFIER
    avant tout ship : 50/50 Étoile, ascenseur Montparnasse, altitude Télégraphe,
    comptage Concorde, main-à-la-pomme Vénus (b-12), affluence Joconde (b-14) ;
    « C'est une révolte ? » = tradition rapportée, à présenter comme telle.

12. **`CLAUDE.md` (racine) est en retard sur le cerveau réel.** Sa carte liste 4
    notes ; le brain de la branche FTUE en compte 11 (personas, mini-jeux,
    architecture-jeu, note-intention, da-brief-atelier, marc-rive-agent-prompt…).
    À rafraîchir au merge — un agent qui ne lirait que CLAUDE.md ignorerait
    l'existence des personas et de l'architecture de jeu.

---

*Phase 0 close. La suite (prompt d'exécution #1) se code avec cette âme en
contexte : l'or se pose sur le cold-open → carte → Louvre-Rivoli/Bastille,
sans toucher au moteur de score, sans élargir, dans la cage d'invariants.*
