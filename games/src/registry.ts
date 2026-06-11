/**
 * REGISTRE DES MINI-JEUX
 * Pour ajouter un archétype : créer src/<archetype>/ qui exporte default un
 * composant GameProps, puis l'enregistrer ici. C'est tout — l'app résout
 * l'archétype d'une station via son contenu (station.game.archetype).
 */
import type { GameArchetype, MiniGameDefinition } from './contract';

const registry = new Map<GameArchetype, MiniGameDefinition>();

export function registerGame(def: MiniGameDefinition): void {
  registry.set(def.archetype, def);
}

export function getGame(archetype: GameArchetype): MiniGameDefinition {
  const def = registry.get(archetype);
  if (!def) throw new Error(`Mini-jeu non enregistré : ${archetype}`);
  return def;
}

export function hasGame(archetype: GameArchetype): boolean {
  return registry.has(archetype);
}

/* ── Archétypes livrés ─────────────────────────────────────────────── */

registerGame({
  archetype: 'demolition',
  load: () => import('./demolition/DemolitionGame'),
});
