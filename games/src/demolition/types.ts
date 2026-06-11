/** Paramètres d'un palier de démolition (copie client de quest_steps.payload). */
export interface DemolitionParams {
  /** Nombre de boulets disponibles. */
  maxShots: number;
  /** Multiplicateur de solidité des blocs (1 = bronze). */
  hpMultiplier: number;
  /** % de destruction de la forteresse requis pour gagner (0–100). */
  targetPct: number;
  /** Limite de temps en secondes (0 = pas de chrono). */
  timeLimitS: number;
  /** Renforts supplémentaires posés sur le terrain (or). */
  reinforced: boolean;
}

export type BlockMaterial = 'stone' | 'wood' | 'iron';

export interface BlockSpec {
  x: number;
  y: number;
  w: number;
  h: number;
  material: BlockMaterial;
  /** Posé uniquement quand params.reinforced est vrai. */
  reinforcement?: boolean;
}

export interface TargetSpec {
  x: number;
  y: number;
  r: number;
}

export interface DemolitionLevel {
  /** Monde logique (mis à l'échelle de l'écran). */
  worldW: number;
  worldH: number;
  groundY: number;
  slingX: number;
  slingY: number;
  blocks: BlockSpec[];
  /** Les cibles à abattre (étendards royaux sur la forteresse). */
  targets: TargetSpec[];
}
