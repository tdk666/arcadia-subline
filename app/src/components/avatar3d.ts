/**
 * AVATAR 3D — « Marc », la souris parisienne, en vrai modèle glTF posé sur la
 * carte (custom layer MapLibre + Three.js). Il s'incline avec la caméra 3D,
 * se place à ta position GPS et s'oriente vers ton cap. Animation de marche à
 * venir (le mesh Meshy est statique pour l'instant).
 *
 * Technique (officielle MapLibre v5) : on rend une scène Three.js dans le même
 * contexte WebGL que la carte ; à chaque frame on compose la matrice de
 * projection mercator (defaultProjectionData.projectionMatrix) avec la position
 * du modèle convertie via MercatorCoordinate. Chargé en lazy (le .glb est lourd).
 */
import maplibregl from 'maplibre-gl';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const MODEL_URL = '/mascotte/marc.glb';
const TARGET_METERS = 60; // hauteur « réelle » de l'avatar sur la carte (réglable)

export interface AvatarHandle {
  layer: maplibregl.CustomLayerInterface;
  setPosition(lng: number, lat: number, headingDeg?: number): void;
}

export function createAvatar(map: maplibregl.Map, onReady?: () => void): AvatarHandle {
  let lng = 2.3488, lat = 48.8534, heading = 0;
  let scene: THREE.Scene;
  let camera: THREE.Camera;
  let renderer: THREE.WebGLRenderer;

  const layer: maplibregl.CustomLayerInterface = {
    id: 'avatar-3d',
    type: 'custom',
    renderingMode: '3d',
    onAdd(_map, gl) {
      camera = new THREE.Camera();
      scene = new THREE.Scene();
      const key = new THREE.DirectionalLight(0xfff4e0, 2.6);
      key.position.set(0.4, -0.7, 1).normalize();
      scene.add(key);
      scene.add(new THREE.AmbientLight(0xffffff, 1.4));

      new GLTFLoader().load(MODEL_URL, (gltf) => {
        const model = gltf.scene;
        // normalise : hauteur = 1 unité, pieds posés à l'origine (robuste quel
        // que soit l'export Meshy).
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const norm = 1 / (size.y || 1);
        model.scale.setScalar(norm);
        model.position.set(-((box.min.x + box.max.x) / 2) * norm, -box.min.y * norm, -((box.min.z + box.max.z) / 2) * norm);
        scene.add(model);
        map.triggerRepaint();
        onReady?.();
      });

      renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true });
      renderer.autoClear = false;
    },
    render(_gl, options) {
      const proj = options.defaultProjectionData.mainMatrix;
      const o = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], 0);
      const s = o.meterInMercatorCoordinateUnits() * TARGET_METERS;
      const local = new THREE.Matrix4()
        .makeTranslation(o.x, o.y, o.z ?? 0)
        .scale(new THREE.Vector3(s, -s, s))
        .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2))                       // glTF Y-up → carte Z-up
        .multiply(new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(heading))); // cap
      camera.projectionMatrix = new THREE.Matrix4().fromArray(proj as unknown as number[]).multiply(local);
      renderer.resetState();
      renderer.render(scene, camera);
    },
    onRemove() {
      try { renderer?.dispose(); } catch { /* noop */ }
    },
  };

  return {
    layer,
    setPosition(nlng, nlat, h) {
      lng = nlng; lat = nlat;
      if (typeof h === 'number' && !Number.isNaN(h)) heading = h;
      map.triggerRepaint();
    },
  };
}
