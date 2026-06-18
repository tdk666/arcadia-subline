/**
 * LA CARTE — moteur WebGL réel (MapLibre GL JS), comme les références :
 *   · Pokémon GO → monde OpenStreetMap stylisé, caméra 3D inclinée.
 *   · Citymapper → tuiles vectorielles OSM, rendu WebGL épuré.
 * Fond : OpenFreeMap (tuiles vectorielles OSM, sans clé). Par-dessus : nos
 * lignes + stations réelles (coordonnées IDFM), la ligne jouable mise en avant.
 * Géoloc native (« tu es ici » + suivi). Le bundle MapLibre est chargé en lazy
 * (cf. NetworkScreen) pour ne pas alourdir le reste de l'app.
 */
import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  GEO_LINES,
  lineFeatureCollection,
  stationFeatureCollection,
  stationsOnLines,
} from '../lib/geo';

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const PARIS: [number, number] = [2.3488, 48.8534];

interface Props {
  playableCodes: Set<string>;
  onPickLine: (code: string) => void;
}

export function MapView({ playableCodes, onPickLine }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // refs « live » pour que les handlers (liés une seule fois) voient les valeurs à jour
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

      // halo de la ligne jouable (respire visuellement)
      map.addLayer({
        id: 'lines-glow',
        source: 'metro-lines',
        type: 'line',
        filter: ['==', ['get', 'playable'], true],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ['get', 'color'], 'line-width': 14, 'line-opacity': 0.25, 'line-blur': 6 },
      });
      // tracés des lignes (jouable épais, à venir fines/estompées)
      map.addLayer({
        id: 'lines',
        source: 'metro-lines',
        type: 'line',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['interpolate', ['linear'], ['zoom'],
            10, ['case', ['get', 'playable'], 4, 1.5],
            14, ['case', ['get', 'playable'], 7, 3]],
          'line-opacity': ['case', ['get', 'playable'], 1, 0.45],
        },
      });

      // stations
      map.addLayer({
        id: 'stations',
        source: 'metro-stations',
        type: 'circle',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, ['case', ['get', 'interchange'], 3.5, 2], 15, ['case', ['get', 'interchange'], 7, 4.5]],
          'circle-color': '#fffdf7',
          'circle-stroke-color': ['case', ['get', 'playable'], '#0a5a9e', '#8a96a0'],
          'circle-stroke-width': ['case', ['get', 'playable'], 2, 1.2],
          'circle-opacity': ['case', ['get', 'playable'], 1, 0.7],
        },
      });
      // libellés au zoom (illisibles dézoomés → apparaissent quand on plonge)
      map.addLayer({
        id: 'station-labels',
        source: 'metro-stations',
        type: 'symbol',
        minzoom: 13,
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 11,
          'text-offset': [0, 1.1],
          'text-anchor': 'top',
          'text-font': ['Noto Sans Regular'],
        },
        paint: { 'text-color': '#2a2118', 'text-halo-color': '#f6f1e6', 'text-halo-width': 1.4 },
      });

      const pick = (e: maplibregl.MapLayerMouseEvent) => {
        const f = e.features?.[0];
        if (!f) return;
        const props = f.properties as { code?: string; slug?: string; name?: string };
        const code = props.code ?? (props.slug ? slugToPlayLine.get(props.slug) : undefined);
        if (code && playableCodes.has(code)) { onPick.current(code); return; }
        // station « à venir » : petit repère informatif
        new maplibregl.Popup({ closeButton: false, offset: 10 })
          .setLngLat(e.lngLat)
          .setHTML(`<div style="font:600 12px 'Work Sans',sans-serif;color:#2a2118">${props.name ?? ''}<br><span style="color:#6f6450;font-weight:500">Bientôt</span></div>`)
          .addTo(map);
      };
      for (const layer of ['lines', 'lines-glow', 'stations'] as const) {
        map.on('click', layer, pick);
        map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
      }
    });

    return () => map.remove();
    // une seule init ; les codes jouables sont stables sur la durée de vie de l'écran
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={ref} className="h-full w-full" />;
}
