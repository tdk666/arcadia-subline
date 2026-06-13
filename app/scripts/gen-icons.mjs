// Génère les icônes PWA sans aucune dépendance (encodeur PNG minimal + zlib).
// DA « Paris Souterrain » : « L'Arche » — voûte de tunnel en laiton, globe
// d'édicule ambre en clef, sur encre chaude. Néon banni.
// Usage : node app/scripts/gen-icons.mjs
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

function crc32(buf) {
  let c, table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  c = 0xffffffff;
  for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    pixels.subarray(y * size * 4, (y + 1) * size * 4)
      .forEach((v, i) => { raw[y * (size * 4 + 1) + 1 + i] = v; });
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const ENCRE = [0x15, 0x11, 0x0c];
const ENCRE_HI = [0x2a, 0x1d, 0x10]; // halo ambre sombre
const LAITON = [0xc9, 0xa2, 0x27];
const AMBRE = [0xe0, 0x96, 0x4a];

function mix(a, b, k) { return a.map((v, i) => Math.round(v + (b[i] - v) * k)); }

function drawIcon(size, { maskable = false } = {}) {
  const px = new Uint8Array(size * size * 4);
  const cx = size / 2, cy = size / 2;
  const R = size * (maskable ? 0.5 : 0.46);

  // géométrie de l'arche (voûte de tunnel) en coordonnées normalisées
  const archCx = 0.5, archTop = 0.30, archBottom = 0.72;
  const archOuter = 0.21, archInner = 0.115;   // rayons de la voûte
  const legW = (archOuter - archInner);
  const baseY = 0.66;                            // barre du « A »
  const globe = { x: 0.5, y: 0.235, r: 0.05 };   // globe d'édicule en clef

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const d = Math.hypot(x - cx, y - cy);
      let rgb = null, alpha = 0;

      if (maskable || d <= R) {
        // fond encre + halo ambre chaud en haut
        const k = Math.min(1, d / R);
        rgb = mix(ENCRE_HI, ENCRE, k);
        alpha = 255;
      }

      if (rgb) {
        const nx = x / size, ny = y / size;
        // anneau laiton (le roundel)
        const dr = Math.abs(d - R * 0.9);
        if (!maskable && dr < size * 0.012) rgb = LAITON;

        // arche : couronne (demi-cercle) + deux jambes
        const adx = nx - archCx, ady = ny - (archTop + 0.0);
        const arcR = Math.hypot(adx, ady);
        const inCrown = ady <= 0.02 && arcR > archInner && arcR < archOuter;
        const inLegs =
          ny > archTop && ny < archBottom &&
          ((Math.abs(nx - (archCx - (archInner + archOuter) / 2)) < legW / 2) ||
           (Math.abs(nx - (archCx + (archInner + archOuter) / 2)) < legW / 2));
        const inBar = Math.abs(ny - baseY) < legW / 2 &&
          nx > archCx - archInner && nx < archCx + archInner;
        if (inCrown || inLegs || inBar) {
          // dégradé laiton → laiton clair selon la hauteur (relief)
          rgb = mix(LAITON, [0xe3, 0xc4, 0x63], 1 - ny);
        }

        // globe d'édicule ambre en clef de voûte (lueur)
        const gd = Math.hypot(nx - globe.x, ny - globe.y);
        if (gd < globe.r) rgb = mix(AMBRE, [0xff, 0xe7, 0xb0], 1 - gd / globe.r);
        else if (gd < globe.r * 1.8) rgb = mix(rgb, AMBRE, (1 - gd / (globe.r * 1.8)) * 0.4);

        px[i] = rgb[0]; px[i + 1] = rgb[1]; px[i + 2] = rgb[2]; px[i + 3] = alpha;
      }
    }
  }
  return encodePng(size, px);
}

writeFileSync(join(outDir, 'icon-192.png'), drawIcon(192));
writeFileSync(join(outDir, 'icon-512.png'), drawIcon(512));
writeFileSync(join(outDir, 'icon-512-maskable.png'), drawIcon(512, { maskable: true }));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="46" fill="#15110c"/>
  <circle cx="50" cy="50" r="41" fill="none" stroke="#c9a227" stroke-width="2"/>
  <path d="M34 70 V44 a16 16 0 0 1 32 0 V70" fill="none" stroke="#c9a227" stroke-width="9" stroke-linecap="butt"/>
  <line x1="40" y1="62" x2="60" y2="62" stroke="#c9a227" stroke-width="8"/>
  <circle cx="50" cy="26" r="5.5" fill="#e0964a"/>
  <circle cx="50" cy="26" r="9" fill="#e0964a" opacity="0.28"/>
</svg>`;
writeFileSync(join(outDir, 'icon.svg'), svg);

console.log("Icônes « L'Arche » générées dans", outDir);
