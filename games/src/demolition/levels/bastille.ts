import type { BlockSpec, DemolitionLevel, TargetSpec } from '../types';

/**
 * LA BASTILLE — forteresse jouable, pas une pile de caisses.
 * Façade d'assaut : trois TOURS RONDES crénelées reliées par des COURTINES,
 * un DONJON central plus haut, et un PONT-LEVIS de bois en première ligne.
 * Chaque élément est un vrai morceau de forteresse qui se brise.
 *
 * MÊME terrain pour les 3 paliers ; ce qui durcit (maxShots, hpMultiplier,
 * chrono, renforts de fer) vit dans DemolitionParams — jamais la géométrie.
 */
const W = 960;
const GROUND = 540;
const FLOOR = 38;              // hauteur d'une assise de pierre

const blocks: BlockSpec[] = [];

/** Tour ronde : une assise de pierre par étage (ombrage cylindrique au rendu),
 *  coiffée de créneaux (merlons) — JAMAIS au centre, pour que l'étendard s'y
 *  plante proprement. Renvoie l'altitude du toit. */
function tower(cx: number, width: number, floors: number): number {
  for (let f = 0; f < floors; f++) {
    blocks.push({
      x: cx, y: GROUND - FLOOR / 2 - f * FLOOR,
      w: width, h: FLOOR, material: 'stone', part: 'tower',
    });
  }
  const roofY = GROUND - floors * FLOOR;            // sommet du fût
  const mxs = [cx - width / 2 + 11, cx + width / 2 - 11];
  if (width >= 80) mxs.push(cx - width / 4, cx + width / 4); // donjon : 4 merlons
  for (const mx of mxs) {
    blocks.push({ x: mx, y: roofY - 9, w: 16, h: 18, material: 'stone', part: 'merlon' });
  }
  return roofY;
}

/** Courtine : mur de liaison plus bas entre deux tours, crénelé lui aussi. */
function curtain(cx: number, width: number, floors: number) {
  for (let f = 0; f < floors; f++) {
    blocks.push({
      x: cx, y: GROUND - FLOOR / 2 - f * FLOOR,
      w: width, h: FLOOR, material: 'stone', part: 'curtain',
    });
  }
  const topY = GROUND - floors * FLOOR;
  const n = Math.max(2, Math.round(width / 34));
  for (let i = 0; i < n; i++) {
    const mx = cx - width / 2 + 11 + (i * (width - 22)) / (n - 1);
    blocks.push({ x: mx, y: topY - 9, w: 15, h: 17, material: 'stone', part: 'merlon' });
  }
}

// ── Pont-levis de bois en première ligne (on l'abaisse pour ouvrir l'assaut) ──
blocks.push({ x: 516, y: GROUND - 39, w: 30, h: 78, material: 'wood', part: 'bridge' });

// ── Trois tours rondes + le donjon central (plus haut) ──
const roofA = tower(600, 70, 5);   // tour de l'Ouest
const roofD = tower(752, 84, 6);   // DONJON (cœur de la forteresse)
const roofC = tower(902, 70, 5);   // tour de l'Est

// ── Courtines de liaison (entre les tours) ──
curtain(676, 80, 3);   // courtine Ouest–Donjon
curtain(827, 78, 3);   // courtine Donjon–Est

// ── Barils de poudre : la poudre que le peuple vint saisir le 14 juillet.
//    Fragiles, ils EXPLOSENT en chaîne et soufflent la pierre alentour : la clé
//    pour ouvrir la forteresse (et rendre le palier OR jouable en 3 boulets). ──
blocks.push({ x: 648, y: GROUND - 19, w: 26, h: 38, material: 'powder' });
blocks.push({ x: 800, y: GROUND - 19, w: 26, h: 38, material: 'powder' });

// ── Renforts du palier OR : plaques de fer devant le donjon et la tour Est ──
blocks.push({ x: 700, y: GROUND - 52, w: 18, h: 104, material: 'iron', reinforcement: true });
blocks.push({ x: 856, y: GROUND - 52, w: 18, h: 104, material: 'iron', reinforcement: true });

// ── Étendards royaux : un planté sur le toit de chaque tour (placé exactement
//    sur son support par le moteur — voir buildWorld) ──
const targets: TargetSpec[] = [
  { x: 600, y: roofA - 18, r: 14 },
  { x: 752, y: roofD - 18, r: 14 },
  { x: 902, y: roofC - 18, r: 14 },
];

export const bastilleLevel: DemolitionLevel = {
  worldW: W,
  worldH: 600,
  groundY: GROUND,
  slingX: 132,
  slingY: GROUND - 84,
  blocks,
  targets,
};
