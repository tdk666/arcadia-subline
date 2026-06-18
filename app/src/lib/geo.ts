/**
 * Géographie du réseau (offline-first). Les coordonnées + l'ordre des stations
 * viennent de /content/network-geo.json, exporté depuis Supabase à partir des
 * données ouvertes IDFM (arrets-lignes + referentiel-des-lignes + traces). Aucune
 * dépendance carto externe : on projette nous-mêmes en SVG (jouable hors-ligne).
 */
import geo from '@content/network-geo.json';

export interface GeoStation {
  slug: string;
  name: string;
  lat: number;
  lon: number;
}

export interface GeoLine {
  code: string;
  name: string;
  color: string;
  stops: string[];
}

interface GeoRaw {
  city: string;
  network: string;
  source: string;
  note: string;
  /** Compact : [slug, name, lat, lon] pour limiter le poids du bundle. */
  stations: [string, string, number, number][];
  lines: GeoLine[];
}

const raw = geo as unknown as GeoRaw;

export const GEO_META = { city: raw.city, network: raw.network, source: raw.source, note: raw.note };

export const GEO_STATIONS: GeoStation[] = raw.stations.map(([slug, name, lat, lon]) => ({ slug, name, lat, lon }));
export const GEO_LINES: GeoLine[] = raw.lines;

const BY_SLUG = new Map(GEO_STATIONS.map((s) => [s.slug, s] as const));
export function geoStation(slug: string): GeoStation | undefined {
  return BY_SLUG.get(slug);
}

/** Nombre de lignes desservant une station (≥ 2 = correspondance). */
const LINE_COUNT = new Map<string, number>();
for (const l of GEO_LINES) for (const slug of l.stops) LINE_COUNT.set(slug, (LINE_COUNT.get(slug) ?? 0) + 1);
export function linesAt(slug: string): number {
  return LINE_COUNT.get(slug) ?? 0;
}

/* ── GeoJSON pour MapLibre (carte WebGL réelle) ──────────────────────────── */
import type { FeatureCollection, LineString, Point } from 'geojson';

/** Tracés des lignes en GeoJSON (LineString par ligne, dans l'ordre officiel). */
export function lineFeatureCollection(playable: Set<string>): FeatureCollection<LineString> {
  return {
    type: 'FeatureCollection',
    features: GEO_LINES.map((l) => ({
      type: 'Feature',
      properties: { code: l.code, name: l.name, color: l.color, playable: playable.has(l.code) },
      geometry: {
        type: 'LineString',
        coordinates: l.stops
          .map((s) => geoStation(s))
          .filter((s): s is GeoStation => !!s)
          .map((s) => [s.lon, s.lat]),
      },
    })),
  };
}

/** Stations en GeoJSON (Point), avec drapeau correspondance + jouable. */
export function stationFeatureCollection(playableSlugs: Set<string>): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: GEO_STATIONS.map((s) => ({
      type: 'Feature',
      properties: { slug: s.slug, name: s.name, interchange: linesAt(s.slug) > 1, playable: playableSlugs.has(s.slug) },
      geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
    })),
  };
}

/** Slugs des stations desservies par au moins une ligne jouable. */
export function stationsOnLines(codes: Set<string>): Set<string> {
  const out = new Set<string>();
  for (const l of GEO_LINES) if (codes.has(l.code)) for (const s of l.stops) out.add(s);
  return out;
}

/** Emprise géographique des lignes jouables (pour cadrer la caméra à l'ouverture). */
export function playableBounds(codes: Set<string>): [[number, number], [number, number]] | null {
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity, any = false;
  for (const l of GEO_LINES) {
    if (!codes.has(l.code)) continue;
    for (const slug of l.stops) {
      const s = geoStation(slug);
      if (!s) continue;
      any = true;
      minLon = Math.min(minLon, s.lon); maxLon = Math.max(maxLon, s.lon);
      minLat = Math.min(minLat, s.lat); maxLat = Math.max(maxLat, s.lat);
    }
  }
  return any ? [[minLon, minLat], [maxLon, maxLat]] : null;
}

export interface Projection {
  width: number;
  height: number;
  project(lat: number, lon: number): { x: number; y: number };
}

/**
 * Projection équirectangulaire (suffisante à l'échelle d'une ville) avec
 * correction du méridien par cos(latitude) pour garder les bonnes proportions.
 * `width` fixe la largeur du viewBox ; la hauteur découle de l'emprise réelle.
 */
export function makeProjection(width: number, pad = 18): Projection {
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  for (const s of GEO_STATIONS) {
    if (s.lat < minLat) minLat = s.lat;
    if (s.lat > maxLat) maxLat = s.lat;
    if (s.lon < minLon) minLon = s.lon;
    if (s.lon > maxLon) maxLon = s.lon;
  }
  const lat0 = (minLat + maxLat) / 2;
  const kx = Math.cos((lat0 * Math.PI) / 180);
  const scale = (width - pad * 2) / ((maxLon - minLon) * kx);
  const height = (maxLat - minLat) * scale + pad * 2;
  return {
    width,
    height,
    project(lat: number, lon: number) {
      return { x: pad + (lon - minLon) * kx * scale, y: pad + (maxLat - lat) * scale };
    },
  };
}
