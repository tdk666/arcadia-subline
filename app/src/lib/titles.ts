/**
 * SYSTÈME DE TITRES — cœur algorithmique PUR (DB-agnostique, testable).
 *
 * Principe (DEC-012) : UNE source de vérité = `station_best` (joueur × station →
 * meilleur score). TOUS les titres supérieurs (ligne, quartier, arrondissement,
 * rive, empire) sont des AGRÉGATIONS (Σ) de `station_best` filtrées par
 * l'appartenance géographique de la station. On calcule le score de station une
 * fois ; tout le reste en découle.
 *
 * Ce module ne fait QUE l'agrégation et le classement. Les scores viennent du
 * serveur (`fn_submit_attempt`) — jamais calculés ici ; cette couche ne fait que
 * LIRE et classer. Le wiring (DB/leaderboards) se branche dessus.
 */

export type TitleScope = 'station' | 'line' | 'quartier' | 'arrondissement' | 'rive' | 'empire';

/** Appartenance géographique d'une station (métadonnée statique, dérivée IDFM + curation). */
export interface StationMembership {
  slug: string;
  lines: string[];                 // ex. ['M1'] (correspondances → plusieurs)
  arrondissement: number;          // 1..20
  rive: 'gauche' | 'droite';
  quartier?: string;               // ex. 'le-marais' (clusters curatés, optionnel)
}

/** `station_best` : joueur → (slug station → meilleur score). Lecture serveur. */
export type StationBest = Record<string, Record<string, number>>;

/** Un périmètre de titre concret = un ensemble de stations à agréger. */
export interface Scope {
  scope: TitleScope;
  /** id d'instance : 'bastille' (station), 'M4' (ligne), 'arr-4', 'rive-gauche', 'le-marais', 'empire'. */
  key: string;
  stations: string[];              // slugs des stations du périmètre
}

/** Détenteur classé d'un périmètre. */
export interface Holder {
  playerId: string;
  /** Σ des meilleurs scores du joueur sur les stations du périmètre. */
  score: number;
  /** Nombre de stations du périmètre où le joueur a un score (largeur). */
  stationsHeld: number;
}

/** Σ des meilleurs scores d'un joueur sur un ensemble de stations. */
export function sumBest(playerBest: Record<string, number> | undefined, stations: readonly string[]): number {
  if (!playerBest) return 0;
  let s = 0;
  for (const slug of stations) s += playerBest[slug] ?? 0;
  return s;
}

/**
 * Classement d'un périmètre : joueurs triés par Σ décroissante (départage : plus
 * de stations tenues, puis id stable). Les joueurs à score 0 sur le périmètre
 * sont exclus (on ne « détient » rien à 0).
 */
export function rankScope(best: StationBest, stations: readonly string[]): Holder[] {
  const holders: Holder[] = [];
  for (const [playerId, playerBest] of Object.entries(best)) {
    const score = sumBest(playerBest, stations);
    if (score <= 0) continue;
    const stationsHeld = stations.reduce((n, slug) => n + ((playerBest[slug] ?? 0) > 0 ? 1 : 0), 0);
    holders.push({ playerId, score, stationsHeld });
  }
  holders.sort((a, b) =>
    b.score - a.score || b.stationsHeld - a.stationsHeld || a.playerId.localeCompare(b.playerId),
  );
  return holders;
}

/** Détenteur du titre (tête du classement) ou null si personne. */
export function titleHolder(best: StationBest, stations: readonly string[]): Holder | null {
  return rankScope(best, stations)[0] ?? null;
}

/**
 * Construit TOUS les périmètres de titres à partir des appartenances :
 * une station, une ligne, un quartier, un arrondissement, une rive, l'empire.
 */
export function buildScopes(memberships: readonly StationMembership[]): Scope[] {
  const all = memberships.map((m) => m.slug);
  const byLine = new Map<string, string[]>();
  const byArr = new Map<number, string[]>();
  const byRive = new Map<string, string[]>();
  const byQuartier = new Map<string, string[]>();

  for (const m of memberships) {
    for (const line of m.lines) push(byLine, line, m.slug);
    push(byArr, m.arrondissement, m.slug);
    push(byRive, m.rive, m.slug);
    if (m.quartier) push(byQuartier, m.quartier, m.slug);
  }

  const scopes: Scope[] = [];
  for (const m of memberships) scopes.push({ scope: 'station', key: m.slug, stations: [m.slug] });
  for (const [line, st] of byLine) scopes.push({ scope: 'line', key: line, stations: st });
  for (const [q, st] of byQuartier) scopes.push({ scope: 'quartier', key: q, stations: st });
  for (const [arr, st] of byArr) scopes.push({ scope: 'arrondissement', key: `arr-${arr}`, stations: st });
  for (const [rive, st] of byRive) scopes.push({ scope: 'rive', key: `rive-${rive}`, stations: st });
  scopes.push({ scope: 'empire', key: 'empire', stations: all });
  return scopes;
}

function push<K>(map: Map<K, string[]>, key: K, slug: string) {
  const arr = map.get(key);
  if (arr) arr.push(slug); else map.set(key, [slug]);
}
