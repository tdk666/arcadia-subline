# Arcadia SubLine — Style-Guide (une page)

> Système visuel **« Métro Clair » premium**. Source de vérité DA : tokens dans
> `app/src/index.css`, icônes dans `app/src/components/icons.tsx`. Règle d'or :
> *lisible à bout de bras, en plein soleil sur un quai.*

## 1. Couleur — rôles (pas de couleur « décorative »)
| Token | Hex | Rôle |
|---|---|---|
| `craie` / `craie-2` | `#f6f1e6` / `#ece4d2` | Fonds papier (appli / champs) |
| `plomb` / `plomb-hi` | `#fffdf7` / `#f1ead8` | Surfaces (cartes) / appui |
| `rail` | `#ddd2ba` | Filets, bordures douces |
| `pierre` / `-dim` / `-faint` | `#2a2118` / `#5d5446` / `#6f6450` | Texte 1aire / 2aire / 3aire |
| `encre` | `#15110c` | Texte sur accent or/bleu |
| **`email`** | **`#0a5a9e`** | **HÉROS — plaque émaillée RATP** (primaire) |
| `laiton` / `-clair` | `#c9a227` / `#e3c463` | Récompense, médailles, premium |
| `ambre` | `#e0964a` | Réverbère, streak « en jeu », accent chaud |
| `vermillon` | `#bb2e2a` | Rival, urgence, streak « assurée » |
| `guimard` | `#3f6b4d` | Culture débloquée / succès |
| **Tricolore** | bleu·blanc·rouge | **Célébration RARE** (conquête/victoire) |

Règle : texte sombre sur clair ; accents saturés pour les actions ; **bannir le
gris délavé**. Le **tricolore est sacré** — réservé aux moments de fierté.

## 2. Couleurs de ligne = codage de contenu
Officielles IDFM (`colourweb_hexa`), cf. `content/network.json` (M1 `#ffbe00`,
M2 `#0055c8`, …). Servent à **coder** une ligne, jamais à décorer l'UI.

## 3. Typographie
- **Display** : `Marcellus` (titres, chiffres). *À réévaluer vers une géométrique
  plus « jeu » en session DA.*
- **UI / mono** : `Work Sans` (gros, gras, lisible). Chiffres **tabulaires** +
  count-up pour scores/XP.

## 4. Composant signature — la plaque émaillée
Bleu `#0a5a9e` + liseré blanc + 4 vis d'angle. Décliné en : en-tête, carte-défi,
bouton héros, titre de victoire. *Un motif fort > dix gadgets.*

## 5. Boutons (`components/Button.tsx`)
Physiques (volume + enfoncement + clack/haptique). Hiérarchie : **un seul
primaire visible**. `primary` (bleu plaque) · `gold` (récompense) · `secondary`
(contour) · `tertiary` (texte). Cibles **≥ 56 px**, espacement ≥ 8 px.

## 6. Icônes (`components/icons.tsx`)
Set unique, **mono-sens**, géométrique façon pictogramme métro, `currentColor`,
trait 2. **Interdit** : emojis système (◉❖♛◈🔒) dans l'UI.

## 7. Mouvement & juice
Animations **courtes** (Royal Match). Catalogue : `animate-pop` (apparition),
`animate-slide-up`, `animate-glow` (halo laiton), `animate-line-pulse` (ligne
jouable), count-ups, confettis **tricolores** (conquête uniquement), flamme de
streak. Respecter `prefers-reduced-motion`.

## 8. Mascotte (à produire)
**Le poinçonneur-souris** — un petit rongeur parisien attachant en tenue de
poinçonneur RATP (casquette bleu plaque), esprit *Ratatouille*. Rôles : FTUE,
états vides, célébrations (streak/victoire), notifications. **À générer en
illustration** (pas en SVG codé à la main) puis décliner en 3-4 poses
(idle / joyeux / pouce levé / endormi=streak en danger). Palette : Métro Clair.

## 9. Layout & accessibilité
Action primaire dans les **40 % bas** (zone du pouce). Barre de statut
persistante (streak/rang/XP). Safe-areas iOS gérées. Contraste AA minimum.

## 10. Do / Don't
- ✅ Un CTA héros par écran · plaque émaillée pour le primaire · tricolore rare.
- ❌ Emojis système · gris délavé sur clair · deux primaires · animations longues.
