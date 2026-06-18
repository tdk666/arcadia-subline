/**
 * LA CARTE — moteur WebGL réel (MapLibre GL JS), construit comme les références :
 *   · Pokémon GO → monde OpenStreetMap STYLISÉ (abstrait, épuré), caméra 3D.
 *   · Citymapper → tuiles vectorielles OSM, style minimal centré transport.
 * Les tuiles sont stylées AU RUNTIME : on part d'un fond épuré (OpenFreeMap
 * « positron »), on le recolore « Métro Clair » (papier chaud, eau bleu plaque)
 * et on retire le bruit (POI, n° de rue). Par-dessus : nos lignes + stations
 * réelles (IDFM), la ligne jouable en héros, le reste dégressif au zoom.
 * Géoloc native (« tu es ici » + suivi). Bundle chargé en lazy (cf. NetworkScreen).
 */
import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  GEO_LINES,
  lineFeatureCollection,
  playableBounds,
  stationFeatureCollection,
  stationsOnLines,
} from '../lib/geo';

// fond épuré (lignée CARTO Positron) — la base « Citymapper-clean »
const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
const PARIS: [number, number] = [2.3488, 48.8534];

interface Props {
  playableCodes: Set<string>;
  onPickLine: (code: string) => void;
}

/** Recolore « Métro Clair » + retire le bruit. Tout est gardé (style tiers). */
function curate(map: maplibregl.Map) {
  for (const layer of map.getStyle().layers ?? []) {
    const sl = (layer as { 'source-layer'?: string })['source-layer'];
    try {
      if (layer.type === 'symbol' && (sl === 'poi' || sl === 'housenumber')) {
        map.setLayoutProperty(layer.id, 'visibility', 'none');
      } else if (layer.type === 'background') {
        map.setPaintProperty(layer.id, 'background-color', '#f3ecdd'); // papier chaud
      } else if (layer.type === 'fill' && sl === 'water') {
        map.setPaintProperty(layer.id, 'fill-color', '#bcd6ea'); // eau bleu plaque clair
      } else if (layer.type === 'fill' && (sl === 'landcover' || sl === 'park')) {
        map.setPaintProperty(layer.id, 'fill-color', '#dfe7d2'); // vert tendre
      }
    } catch { /* couche absente du style : non bloquant */ }
  }
}

export function MapView({ playableCodes, onPickLine }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const onPick = useRef(onPickLine);
  onPick.current = onPickLine;

  useEffect(() => {
    if (!ref.current) return;
    const slugToPlayLine = new Map<string, string>();
    for (const l of GEO_LINES) {
      if (playableCodes.has(l.code)) for (const s of l.stops) if (!slugToPlayLine.has(s)) slugToPlayLine.set(s, l.code);
    }

    const map = new maplibregl.Map({
      container: ref.current,
      style: STYLE_URL,
      center: PARIS,
      zoom: 11,
      pitch: 50,        // inclinaison 3D façon Pokémon GO
      bearing: -17,
      maxPitch: 72,
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,     // suit la localisation (le « jeu du métro »)
      }),
      'top-right',
    );

    map.on('load', () => {
      curate(map);

      // ── relief 3D : extrusion des bâtiments (schéma OpenMapTiles) ──
      try {
        map.addLayer({
          id: 'buildings-3d',
          source: 'openmaptiles',
          'source-layer': 'building',
          type: 'fill-extrusion',
          minzoom: 14,
          paint: {
            'fill-extrusion-color': '#e7ddc7',
            'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 12],
            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
            'fill-extrusion-opacity': 0.85,
          },
        });
      } catch { /* le style n'expose pas la couche : non bloquant */ }

      map.addSource('metro-lines', { type: 'geojson', data: lineFeatureCollection(playableCodes) });
      map.addSource('metro-stations', {
        type: 'geojson',
        data: stationFeatureCollection(stationsOnLines(playableCodes)),
      });

      // halo de la ligne jouable
      map.addLayer({
        id: 'lines-glow',
        source: 'metro-lines',
        type: 'line',
        filter: ['==', ['get', 'playable'], true],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ['get', 'color'], 'line-width': 16, 'line-opacity': 0.22, 'line-blur': 8 },
      });
      // tracés : jouable héros (épais, opaque) ; « à venir » discrètes
      map.addLayer({
        id: 'lines',
        source: 'metro-lines',
        type: 'line',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['interpolate', ['linear'], ['zoom'],
            10, ['case', ['get', 'playable'], 4.5, 1.2],
            14, ['case', ['get', 'playable'], 8, 2.6]],
          'line-opacity': ['case', ['get', 'playable'], 1, 0.35],
        },
      });

      // stations « à venir » : seulement en zoom rapproché (anti-densité)
      map.addLayer({
        id: 'stations-soon',
        source: 'metro-stations',
        type: 'circle',
        filter: ['==', ['get', 'playable'], false],
        minzoom: 12.5,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 12.5, 2, 15, 4],
          'circle-color': '#fffdf7',
          'circle-stroke-color': '#8a96a0',
          'circle-stroke-width': 1.1,
          'circle-opacity': 0.7,
        },
      });
      // stations jouables : toujours visibles, mises en avant
      map.addLayer({
        id: 'stations',
        source: 'metro-stations',
        type: 'circle',
        filter: ['==', ['get', 'playable'], true],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, ['case', ['get', 'interchange'], 4, 3], 15, ['case', ['get', 'interchange'], 8, 6]],
          'circle-color': '#fffdf7',
          'circle-stroke-color': '#0a5a9e',
          'circle-stroke-width': 2.4,
        },
      });
      // libellés au zoom (jouables d'abord)
      map.addLayer({
        id: 'station-labels',
        source: 'metro-stations',
        type: 'symbol',
        minzoom: 12.5,
        filter: ['==', ['get', 'playable'], true],
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 11,
          'text-offset': [0, 1.1],
          'text-anchor': 'top',
          'text-font': ['Noto Sans Regular'],
        },
        paint: { 'text-color': '#2a2118', 'text-halo-color': '#f6f1e6', 'text-halo-width': 1.5 },
      });

      // ouverture cadrée sur ta ligne (pas sur tout Paris)
      const b = playableBounds(playableCodes);
      if (b) map.fitBounds(b, { padding: 48, maxZoom: 13.5, bearing: -17, pitch: 50, duration: 0 });

      const pick = (e: maplibregl.MapLayerMouseEvent) => {
        const f = e.features?.[0];
        if (!f) return;
        const props = f.properties as { code?: string; slug?: string; name?: string };
        const code = props.code ?? (props.slug ? slugToPlayLine.get(props.slug) : undefined);
        if (code && playableCodes.has(code)) { onPick.current(code); return; }
        new maplibregl.Popup({ closeButton: false, offset: 10 })
          .setLngLat(e.lngLat)
          .setHTML(`<div style="font:600 12px 'Work Sans',sans-serif;color:#2a2118">${props.name ?? ''}<br><span style="color:#6f6450;font-weight:500">Bientôt</span></div>`)
          .addTo(map);
      };
      for (const layer of ['lines', 'stations', 'stations-soon'] as const) {
        map.on('click', layer, pick);
        map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
      }
    });

    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={ref} className="h-full w-full" />;
}
