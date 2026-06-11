/**
 * Accès typé au dossier /content (la donnée éditoriale vit hors du code).
 * Pour ajouter une station jouable : créer /content/stations/<slug>.json
 * et l'enregistrer dans STATION_CONTENT ci-dessous — rien d'autre.
 */
import type { DifficultyTier, GameArchetype } from '@arcadia/games';
import type { LocalizedText } from '../i18n';
import ligne1 from '@content/lines/ligne-1.json';
import bastille from '@content/stations/bastille.json';

export interface LineContent {
  id: string;
  code: string;
  name: string;
  color: string;
  stations: { slug: string; name: string }[];
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
  story: {
    teaser: LocalizedText;
    body: LocalizedText;
    facts: Record<string, string[]>;
  };
}

export const LINE: LineContent = ligne1 as LineContent;

const STATION_CONTENT: Record<string, StationContent> = {
  bastille: bastille as unknown as StationContent,
};

export function getStationContent(slug: string): StationContent | null {
  return STATION_CONTENT[slug] ?? null;
}

export function isPlayable(slug: string): boolean {
  return slug in STATION_CONTENT;
}
