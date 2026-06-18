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
  lineFeatureCollection,
  playableBounds,
  stationFeatureCollection,
  stationsOnLines,
} from '../lib/geo';
import { auraColor } from '../lib/cosmetics';
import { useArcadia } from '../store';

// fond épuré (lignée CARTO Positron) — la base « Citymapper-clean »
const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
const PARIS: [number, number] = [2.3488, 48.8534];

interface Props {
  playableCodes: Set<string>;
  onStation: (slug: string, name: string) => void;
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

export function MapView({ playableCodes, onStation }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const onStationRef = useRef(onStation);
  onStationRef.current = onStation;

  useEffect(() => {
    if (!ref.current) return;

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
    const geo = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,     // suit la localisation (le « jeu du métro »)
      showUserLocation: false,     // on remplace le point bleu par NOTRE avatar-mascotte
    });
    map.addControl(geo, 'top-right');

    // ── AVATAR : la mascotte posée à ta position, qui te suit (façon Pokémon GO) ──
    let avatar: maplibregl.Marker | null = null;
    geo.on('geolocate', (e) => {
      const c = (e as GeolocationPosition).coords;
      const lngLat: [number, number] = [c.longitude, c.latitude];
      if (!avatar) {
        const el = document.createElement('div');
        el.className = 'arcadia-avatar';
        // halo de l'aura équipée (cosmétique de la boutique)
        el.style.setProperty('--aura', auraColor(useArcadia.getState().equippedAura));
        const img = document.createElement('img');
        img.src = '/mascotte/poinconneur.png';
        img.alt = '';
        el.appendChild(img);
        avatar = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat(lngLat).addTo(map);
      } else {
        avatar.setLngLat(lngLat);
      }
    });

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
        paint: { 'line-color': ['get', 'color'], 'line-width': 18, 'line-opacity': 0.22, 'line-blur': 8 },
      });
      // liseré blanc sous la ligne jouable → ruban net « plan de métro » (premium)
      map.addLayer({
        id: 'lines-casing',
        source: 'metro-lines',
        type: 'line',
        filter: ['==', ['get', 'playable'], true],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#fffdf7',
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 8, 14, 12],
        },
      });
      // tracés : jouable héros (ruban épais opaque) ; « à venir » discrètes
      map.addLayer({
        id: 'lines',
        source: 'metro-lines',
        type: 'line',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['interpolate', ['linear'], ['zoom'],
            10, ['case', ['get', 'playable'], 5.5, 1.2],
            14, ['case', ['get', 'playable'], 9, 2.6]],
          'line-opacity': ['case', ['get', 'playable'], 1, 0.32],
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
      // stations jouables : pastilles « plan de métro » (blanc, fin liseré encre)
      // discrètes en ville pour laisser le ruban jaune dominer, nettes au zoom
      map.addLayer({
        id: 'stations',
        source: 'metro-stations',
        type: 'circle',
        filter: ['==', ['get', 'playable'], true],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, ['case', ['get', 'interchange'], 3, 2.2], 15, ['case', ['get', 'interchange'], 6.5, 5]],
          'circle-color': '#fffdf7',
          'circle-stroke-color': '#1f1812',
          'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 10, 1.2, 15, 2],
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

      // tap STATION → fiche en bottom-sheet (tout vit sur la carte, zéro aller-retour)
      const pickStation = (e: maplibregl.MapLayerMouseEvent) => {
        const f = e.features?.[0];
        if (!f) return;
        const props = f.properties as { slug?: string; name?: string };
        if (props.slug) onStationRef.current(props.slug, props.name ?? '');
      };
      for (const layer of ['stations', 'stations-soon'] as const) {
        map.on('click', layer, pickStation);
        map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
      }
      // tap LIGNE → on zoome dessus (focus), sans changer d'écran
      map.on('click', 'lines', (e) => {
        const f = e.features?.[0];
        if (!f || f.geometry.type !== 'LineString') return;
        const coords = f.geometry.coordinates as [number, number][];
        if (!coords.length) return;
        const bb = coords.reduce((acc, c) => acc.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
        map.fitBounds(bb, { padding: 56, maxZoom: 14, bearing: -17, pitch: 50 });
      });
      map.on('mouseenter', 'lines', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'lines', () => { map.getCanvas().style.cursor = ''; });
    });

    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={ref} className="h-full w-full" />;
}
