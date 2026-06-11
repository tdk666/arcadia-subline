// Génère les icônes PWA sans aucune dépendance (encodeur PNG minimal + zlib).
// DA : fond tunnel, anneau néon (le réseau), "A" doré (Arcadia).
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

function encodePng(size, pixels /* RGBA Uint8Array */) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  // filtre 0 par scanline
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

const TUNNEL = [0x0d, 0x10, 0x14];
const CYAN = [0x6e, 0xc4, 0xe8];
const GOLD = [0xf2, 0xc2, 0x00];
const MAGENTA = [0xcf, 0x00, 0x9e];

function drawIcon(size, { maskable = false } = {}) {
  const px = new Uint8Array(size * size * 4);
  const cx = size / 2, cy = size / 2;
  const R = size * (maskable ? 0.5 : 0.46);          // disque de fond
  const ringR = size * (maskable ? 0.36 : 0.40);     // anneau néon
  const ringW = size * 0.035;

  // Le "A" : deux jambes + barre, en coordonnées normalisées
  const aTop = { x: 0.5, y: 0.27 };
  const aL = { x: 0.345, y: 0.71 };
  const aR = { x: 0.655, y: 0.71 };
  const strokeW = size * 0.052;

  const distSeg = (p, a, b) => {
    const vx = b.x - a.x, vy = b.y - a.y;
    const wx = p.x - a.x, wy = p.y - a.y;
    const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / (vx * vx + vy * vy)));
    return Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy));
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const d = Math.hypot(x - cx, y - cy);
      let rgb = null;
      let alpha = 0;

      if (maskable || d <= R) {
        // fond avec léger dégradé radial
        const k = Math.min(1, d / R);
        rgb = TUNNEL.map((v, j) => Math.round(v + [13, 18, 28][j] * (1 - k)));
        alpha = 255;
      }

      if (rgb) {
        // anneau néon cyan (avec halo)
        const dr = Math.abs(d - ringR);
        if (dr < ringW) rgb = CYAN;
        else if (dr < ringW * 2.2) {
          const g = 1 - (dr - ringW) / (ringW * 1.2);
          rgb = rgb.map((v, j) => Math.round(v + (CYAN[j] - v) * g * 0.35));
        }
        // tick magenta en bas de l'anneau (la "station" sur le réseau)
        const ang = Math.atan2(y - cy, x - cx);
        if (Math.abs(d - ringR) < ringW * 1.6 && Math.abs(ang - Math.PI / 2) < 0.10) rgb = MAGENTA;

        // lettre A dorée
        const p = { x: x / size, y: y / size };
        const w = strokeW / size;
        const onA =
          distSeg(p, aTop, aL) < w ||
          distSeg(p, aTop, aR) < w ||
          distSeg(p, { x: 0.415, y: 0.555 }, { x: 0.585, y: 0.555 }) < w * 0.85;
        if (onA && d < ringR - ringW * 1.4) rgb = GOLD;
      }

      if (rgb) {
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
  <circle cx="50" cy="50" r="46" fill="#0d1014"/>
  <circle cx="50" cy="50" r="40" fill="none" stroke="#6ec4e8" stroke-width="3.5"/>
  <circle cx="50" cy="90" r="4" fill="#cf009e"/>
  <path d="M50 27 L34.5 71 M50 27 L65.5 71 M41.5 55.5 L58.5 55.5"
        stroke="#f2c200" stroke-width="5.2" stroke-linecap="round" fill="none"/>
</svg>`;
writeFileSync(join(outDir, 'icon.svg'), svg);

console.log('Icônes générées dans', outDir);
