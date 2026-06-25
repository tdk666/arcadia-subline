# 🐭 Marc — Prompt « god-tier » pour l'agent Rive + contrat runtime

> But : obtenir `marc.riv` (machine à états « Marc ») **drop-in** dans l'app.
> Le code (cinématique « L'Émergence ») est déjà construit **vers ce contrat** :
> dès que `app/public/mascotte/marc.riv` existe, `<MarcGuide>` bascule de la
> doublure animée vers Rive **sans changer une ligne**. **Ne change jamais un nom
> d'input** sans prévenir le code (source de vérité : ce fichier + le pack Drive 09_MARC).

---

## A. À COLLER DANS L'AGENT IA DE L'ÉDITEUR RIVE (scaffolding machine à états)

> L'agent Rive échafaude l'artboard + la state machine + les inputs + les
> transitions. **Toi (ou un animateur)** poses ensuite les keyframes — *l'âme du geste*.

```
Crée un artboard "Marc" (carré, fond TRANSPARENT, personnage centré avec marge
— il sera affiché de petite à grande taille). Puis crée une STATE MACHINE nommée
EXACTEMENT "Marc".

INPUTS (noms EXACTS, ASCII sans accent — c'est l'API avec le code) :
- Trigger: entree
- Trigger: salut
- Trigger: pointe
- Trigger: acquiesce
- Trigger: reconforte
- Trigger: celebre
- Boolean: parle
- Number:  humeur   (0=neutre, 1=joyeux, 2=erudit — optionnel)

ÉTATS / ANIMATIONS (timelines) :
- "idle"  : ÉTAT PAR DÉFAUT, EN BOUCLE — respiration + clignement des yeux,
            micro-balancement, regard caméra (brise le 4e mur). ~2–3 s.
- "entree", "salut", "pointe", "acquiesce", "reconforte", "celebre" : one-shots.
- "parle" : boucle de bouche (lip-flap) jouée tant que le Boolean parle = true.

TRANSITIONS :
- any-state → chaque one-shot quand son Trigger se déclenche ;
  à la fin du one-shot → retour à "idle".
- idle ⇄ parle piloté par le Boolean parle (true entre, false sort).
- Durées de transition courtes (150–250 ms), easing élastique léger (ressort)
  pour les apparitions (entree, celebre).
- Aucune transition ne doit "coller" : depuis idle on doit pouvoir déclencher
  n'importe quel trigger immédiatement.

Quand c'est monté, liste-moi les inputs et confirme que "idle" est l'état par défaut.
```

## B. DIRECTION DU PERSONNAGE & INTENTION D'ANIMATION (pour qui anime)

**Marc — le poinçonneur** (souris parisienne, **2D vectoriel stylisé, PAS photoréaliste**, niveau mascotte de jeu premium / Duolingo) :
- museau **long et pointu** ; **GRANDES oreilles roses translucides PLACÉES SUR LES CÔTÉS** de la tête (jamais rondes sur le sommet — **éviter l'effet Mickey**) ;
- **casquette bleu émail 1930s** avec petit écusson doré « M » ; **gilet bleu émail** à boutons dorés ; **FOULARD ROUGE** (canon, à garder) ; **poinçonneuse en laiton** à la main ; **regard ambré** qui brise le 4ᵉ mur. **Pas de socle en bois** (il bouge librement).
- **DA (hexes exacts)** : bleu émail `#0a5a9e`, laiton/or `#c9a227`, foulard vermillon `#bb2e2a`, lumière craie `#f6f1e6`, ombre acier `#111115`.
- **INTERDIT** : fleur de lys, tout symbole monarchique, tout emoji, tout texte dans le `.riv`.

**Intention par clip** (garde-les courts, lisibles, « premium ») :
| clip | intention à l'écran |
|------|---------------------|
| idle | respiration + clignement, micro-balancement, regard caméra |
| entree | émerge de la pénombre vers la lumière (translation + fade-in) ; la poinçonneuse accroche la lumière |
| salut | lève la main, coucou, sourire — « bienvenue » |
| pointe | tend le bras / la poinçonneuse pour **désigner** hors de lui (guide le regard) |
| acquiesce | hoche la tête, petit air fier (bonne réponse) |
| reconforte | geste doux, paume ouverte, sourire bienveillant — **JAMAIS moqueur** |
| celebre | explosion de joie, poing/pouce levé, saut léger (moment tricolore) |
| parle | lip-flap simple tant que true ; bouche au repos quand false |

**Contraintes techniques** : 60 fps, vectoriel ; lueurs via **Vector Feathering** (pas de flou raster) ; **fichier ≤ ~300 Ko** ; fond transparent ; Marc centré avec marge.

**Livrable** : `marc.riv` (state machine « Marc » + inputs ci-dessus) testé dans le Rive Player → déposer dans `app/public/mascotte/marc.riv`.

## C. CONTRAT RUNTIME (déjà câblé côté code — pour info / vérif)

```ts
import { useRive, useStateMachineInput } from "@rive-app/react-canvas";
const { rive, RiveComponent } = useRive({
  src: "/mascotte/marc.riv", stateMachines: "Marc", autoplay: true,
});
const entree     = useStateMachineInput(rive, "Marc", "entree");     // .fire()
const salut      = useStateMachineInput(rive, "Marc", "salut");
const pointe     = useStateMachineInput(rive, "Marc", "pointe");
const acquiesce  = useStateMachineInput(rive, "Marc", "acquiesce");
const reconforte = useStateMachineInput(rive, "Marc", "reconforte");
const celebre    = useStateMachineInput(rive, "Marc", "celebre");
const parle      = useStateMachineInput(rive, "Marc", "parle");      // .value = true/false
```

Mapping beat → input : voir `app/src/components/ftue/Emergence.tsx` (composant
`<MarcGuide state=…>`). Tant que `marc.riv` est absent, la doublure SVG animée joue
les mêmes états — le rendu n'attend pas l'animateur.
