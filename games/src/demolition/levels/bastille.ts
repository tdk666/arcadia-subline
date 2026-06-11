import type { DemolitionLevel } from '../types';

/**
 * La forteresse de la Bastille — MÊME terrain pour les 3 paliers.
 * Deux tours crénelées + courtine centrale, trois étendards royaux à abattre.
 * Ce qui durcit entre paliers : maxShots, hpMultiplier, chrono, renforts
 * (voir DemolitionParams) — jamais la géométrie de base.
 */
const W = 960;
const GROUND = 540;

function tower(cx: number, baseY: number, floors: number) {
  const blocks = [];
  const bw = 46;
  const bh = 40;
  for (let f = 0; f < floors; f++) {
    const y = baseY - bh / 2 - f * bh;
    blocks.push(
      { x: cx - bw / 2 - 1, y, w: bw, h: bh, material: 'stone' as const },
      { x: cx + bw / 2 + 1, y, w: bw, h: bh, material: 'stone' as const },
    );
  }
  // linteau de bois au sommet — point faible volontaire
  blocks.push({
    x: cx,
    y: baseY - floors * bh - 9,
    w: bw * 2 + 14,
    h: 16,
    material: 'wood' as const,
  });
  return blocks;
}

export const bastilleLevel: DemolitionLevel = {
  worldW: W,
  worldH: 600,
  groundY: GROUND,
  slingX: 130,
  slingY: GROUND - 80,
  blocks: [
    // Tour gauche (4 étages) et tour droite (5 étages)
    ...tower(620, GROUND, 4),
    ...tower(860, GROUND, 5),
    // Courtine centrale
    { x: 740, y: GROUND - 20, w: 110, h: 40, material: 'stone' },
    { x: 740, y: GROUND - 60, w: 110, h: 36, material: 'wood' },
    // Renforts du palier OR : plaques de fer devant chaque tour
    { x: 560, y: GROUND - 50, w: 18, h: 100, material: 'iron', reinforcement: true },
    { x: 800, y: GROUND - 50, w: 18, h: 100, material: 'iron', reinforcement: true },
  ],
  targets: [
    { x: 620, y: GROUND - 4 * 40 - 38, r: 14 }, // étendard tour gauche
    { x: 740, y: GROUND - 96, r: 14 },          // étendard courtine
    { x: 860, y: GROUND - 5 * 40 - 38, r: 14 }, // étendard tour droite
  ],
};
