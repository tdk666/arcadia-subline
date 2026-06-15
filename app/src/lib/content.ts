/**
 * Accès typé au dossier /content (la donnée éditoriale vit hors du code).
 * Pour ajouter une station jouable : créer /content/stations/<slug>.json
 * et l'enregistrer dans STATION_CONTENT ci-dessous — rien d'autre.
 */
import type { DifficultyTier, GameArchetype } from '@arcadia/games';
import type { LocalizedText } from '../i18n';
import ligne1 from '@content/lines/ligne-1.json';
import bastille from '@content/stations/bastille.json';
import networkData from '@content/network.json';

export interface LineContent {
  id: string;
  code: string;
  name: string;
  color: string;
  stations: { slug: string; name: string }[];
}

/** Métadonnée de ligne au niveau RÉSEAU (le plateau global, façon plan de métro).
 *  Légère : la topologie/géo complète des stations vient du pipeline GTFS IDFM. */
export interface NetworkLine {
  code: string;
  name: string;
  color: string;
  termini: string;
  status: 'playable' | 'soon';
}

export interface NetworkContent {
  city: string;
  network: string;
  lines: NetworkLine[];
}

export interface StationContent {
  slug: string;
  stationId: string;
  lineId: string;
  name: string;
  game: {
    archetype: GameArchetype;
    skin: string;
    title: LocalizedText;
    tagline: LocalizedText;
  };
  quests: Record<DifficultyTier, { questId: string; params: Record<string, unknown> }>;
  briefs: Record<DifficultyTier, { date: LocalizedText; title: LocalizedText; body: LocalizedText }>;
  archive: { number: string; collection: LocalizedText; era: LocalizedText };
  story: {
    teaser: LocalizedText;
    body: LocalizedText;
    facts: Record<string, string[]>;
  };
}

export const LINE: LineContent = ligne1 as LineContent;

/** Le réseau complet (16 lignes). Le plateau de plus haut niveau de l'app. */
export const NETWORK: NetworkContent = networkData as NetworkContent;

/** Une ligne porte du contenu jouable réel (stations + quêtes). MVP : M1 seule. */
const LINE_CONTENT: Record<string, LineContent> = {
  M1: ligne1 as LineContent,
};

export function getLineContent(code: string): LineContent | null {
  return LINE_CONTENT[code] ?? null;
}

const STATION_CONTENT: Record<string, StationContent> = {
  bastille: bastille as unknown as StationContent,
};

export function getStationContent(slug: string): StationContent | null {
  return STATION_CONTENT[slug] ?? null;
}

export function isPlayable(slug: string): boolean {
  return slug in STATION_CONTENT;
}
