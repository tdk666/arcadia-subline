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
  geoStation,
  lineFeatureCollection,
  playableBounds,
  stationFeatureCollection,
  stationsOnLines,
} from '../lib/geo';
import { auraColor } from '../lib/cosmetics';
import { useArcadia } from '../store';
import type { AvatarHandle } from './avatar3d';

// fond épuré (lignée CARTO Positron) — la base « Citymapper-clean »
const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
const PARIS: [number, number] = [2.3488, 48.8534];
// station « porte d'entrée » : le phare focal de la carte (alignée FTUE + contenu)
const HERO_SLUG = 'louvre-rivoli';
const HERO_RGB: [number, number, number] = [201, 162, 39]; // laiton maison (#c9a227)
// la cinématique d'arrivée ne joue qu'UNE fois par session (pas à chaque onglet)
let introPlayed = false;

/**
 * Point pulsant « plaque émaillée » (technique canonique MapLibre StyleImageInterface) :
 * un cœur laiton cerclé d'ivoire + une onde qui se propage en boucle. Donne le
 * « tape-moi » humain de Pokémon GO sur la station d'entrée, sans aucun asset.
 */
function makePulsingDot(map: maplibregl.Map, rgb: [number, number, number]) {
  const size = 140;
  return {
    width: size,
    height: size,
    data: new Uint8ClampedArray(size * size * 4),
    context: null as CanvasRenderingContext2D | null,
    onAdd() {
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      this.context = c.getContext('2d');
    },
    render() {
      const ctx = this.context;
      if (!ctx) return false;
      const duration = 1500;
      const t = (performance.now() % duration) / duration; // 0→1 en boucle
      const core = size * 0.16;
      const wave = core + (size / 2 - core) * t;
      const mid = size / 2;
      ctx.clearRect(0, 0, size, size);
      // onde qui se propage (fondu sortant)
      ctx.beginPath();
      ctx.arc(mid, mid, wave, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${0.45 * (1 - t)})`;
      ctx.fill();
      // cœur plein + liseré ivoire
      ctx.beginPath();
      ctx.arc(mid, mid, core, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},1)`;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,253,247,0.95)';
      ctx.lineWidth = 3 + 2 * (1 - t);
      ctx.stroke();
      this.data = ctx.getImageData(0, 0, size, size).data;
      map.triggerRepaint(); // garde l'animation vivante
      return true;
    },
  } satisfies maplibregl.StyleImageInterface & { context: CanvasRenderingContext2D | null };
}

interface Props {
  playableCodes: Set<string>;
  onStation: (slug: string, name: string) => void;
}

/** Style signature « Métro Clair » : recolore le fond tiers en palette maison,
 *  retire le bruit, pose une atmosphère chaude. (Recoloration au runtime — la
 *  technique des cartes premium ; un style 100 % bespoke viendra ensuite.) */
function curate(map: maplibregl.Map) {
  for (const layer of map.getStyle().layers ?? []) {
    const sl = (layer as { 'source-layer'?: string })['source-layer'];
    try {
      if (layer.type === 'symbol' && (sl === 'poi' || sl === 'housenumber' || sl === 'aerodrome_label')) {
        map.setLayoutProperty(layer.id, 'visibility', 'none');               // bruit
      } else if (layer.type === 'background') {
        map.setPaintProperty(layer.id, 'background-color', '#efe6d3');       // papier chaud
      } else if (layer.type === 'fill' && sl === 'water') {
        map.setPaintProperty(layer.id, 'fill-color', '#aecde8');            // eau bleu plaque
      } else if ((layer.type === 'fill') && (sl === 'landcover' || sl === 'park')) {
        map.setPaintProperty(layer.id, 'fill-color', '#d6e4c4');            // vert tendre
      } else if (layer.type === 'fill' && sl === 'landuse') {
        map.setPaintProperty(layer.id, 'fill-color', '#ece2cd');           // tâches urbaines chaudes
      } else if (layer.type === 'line' && sl === 'transportation') {
        map.setPaintProperty(layer.id, 'line-color', '#e3d8bf');           // routes discrètes (le métro doit primer)
      } else if (layer.type === 'symbol' && sl === 'transportation_name') {
        map.setPaintProperty(layer.id, 'text-halo-color', '#efe6d3');
      }
    } catch { /* couche absente du style : non bloquant */ }
  }
  // atmosphère chaude à l'horizon quand la caméra s'incline (profondeur premium)
  try {
    map.setSky({
      'sky-color': '#aecde8',
      'horizon-color': '#f3ecdd',
      'fog-color': '#f6f1e6',
      'sky-horizon-blend': 0.6,
      'horizon-fog-blend': 0.5,
      'fog-ground-blend': 0.4,
    });
  } catch { /* setSky indisponible : non bloquant */ }
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
      zoom: 9,          // départ « loin/à plat » → descente cinématique au load
      pitch: 0,
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

    // ── AVATAR : 2D instantané (placeholder) puis MARC 3D chargé en lazy ──
    let avatar2d: maplibregl.Marker | null = null;
    let avatar3d: AvatarHandle | null = null;
    let loading3d = false;
    const place2d = (lngLat: [number, number]) => {
      if (avatar2d) { avatar2d.setLngLat(lngLat); return; }
      const el = document.createElement('div');
      el.className = 'arcadia-avatar';
      el.style.setProperty('--aura', auraColor(useArcadia.getState().equippedAura));
      const img = document.createElement('img');
      img.src = '/mascotte/poinconneur.png';
      img.alt = '';
      el.appendChild(img);
      avatar2d = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat(lngLat).addTo(map);
    };
    geo.on('geolocate', (e) => {
      const c = (e as GeolocationPosition).coords;
      const lngLat: [number, number] = [c.longitude, c.latitude];
      const heading = typeof c.heading === 'number' && !Number.isNaN(c.heading) ? c.heading : undefined;
      if (avatar3d) { avatar3d.setPosition(lngLat[0], lngLat[1], heading); return; }
      place2d(lngLat);
      if (!loading3d) {
        loading3d = true;
        // le .glb (lourd) + Three.js ne se chargent QUE quand on se géolocalise
        import('./avatar3d').then(({ createAvatar }) => {
          const a = createAvatar(map, () => { avatar2d?.remove(); avatar2d = null; });
          a.setPosition(lngLat[0], lngLat[1], heading);
          map.addLayer(a.layer);
          avatar3d = a;
        }).catch(() => { loading3d = false; });
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
          minzoom: 13,
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
      // halo chaud sous les stations jouables : la ligne « respire », allumée comme
      // des lampadaires (échelle humaine) — sous les pastilles pour rester lisible
      map.addLayer({
        id: 'stations-halo',
        source: 'metro-stations',
        type: 'circle',
        filter: ['==', ['get', 'playable'], true],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 5, 15, 15],
          'circle-color': '#c9a227',
          'circle-opacity': ['interpolate', ['linear'], ['zoom'], 11, 0.08, 15, 0.20],
          'circle-blur': 1,
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

      // ── PHARE HÉROS : pulse « tape-moi » sur la station d'entrée (focal Pokémon-GO) ──
      try {
        const hero = geoStation(HERO_SLUG);
        if (hero && !map.hasImage('hero-pulse')) {
          map.addImage('hero-pulse', makePulsingDot(map, HERO_RGB), { pixelRatio: 2 });
          map.addSource('hero-beacon', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: { slug: hero.slug, name: hero.name },
              geometry: { type: 'Point', coordinates: [hero.lon, hero.lat] },
            },
          });
          map.addLayer({
            id: 'hero-beacon',
            source: 'hero-beacon',
            type: 'symbol',
            layout: {
              'icon-image': 'hero-pulse',
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
              'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.5, 15, 1],
            },
          });
        }
      } catch { /* beacon non bloquant */ }

      // ── CINÉMATIQUE D'ARRIVÉE : descente douce sur ta ligne (le « wow » d'entrée) ──
      // joue une seule fois par session ; aux visites suivantes, cadrage instantané.
      const dur = introPlayed ? 0 : 2600;
      introPlayed = true;
      const b = playableBounds(playableCodes);
      if (b) {
        map.fitBounds(b, { padding: 56, maxZoom: 13.2, bearing: -17, pitch: 55, duration: dur });
      } else {
        map.flyTo({ center: PARIS, zoom: 12.5, pitch: 55, bearing: -17, duration: dur });
      }

      // tap STATION → fiche en bottom-sheet (tout vit sur la carte, zéro aller-retour)
      const pickStation = (e: maplibregl.MapLayerMouseEvent) => {
        const f = e.features?.[0];
        if (!f) return;
        const props = f.properties as { slug?: string; name?: string };
        if (props.slug) onStationRef.current(props.slug, props.name ?? '');
      };
      for (const layer of ['stations', 'stations-soon', 'hero-beacon'] as const) {
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
