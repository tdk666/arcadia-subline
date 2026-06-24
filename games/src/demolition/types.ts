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

export type BlockMaterial = 'stone' | 'wood' | 'iron' | 'powder';

/** Rôle d'un bloc dans la forteresse → pilote le rendu (tour ronde, courtine,
 *  créneau, pont-levis, linteau). Les créneaux comptent comme décor : ils se
 *  brisent (juteux) mais n'entrent PAS dans le % de destruction structurelle. */
export type BlockPart = 'tower' | 'curtain' | 'merlon' | 'bridge' | 'lintel';

export interface BlockSpec {
  x: number;
  y: number;
  w: number;
  h: number;
  material: BlockMaterial;
  /** Posé uniquement quand params.reinforced est vrai. */
  reinforcement?: boolean;
  /** Indice de rendu (défaut : pierre générique). */
  part?: BlockPart;
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
