// Generates simple brand PNG icons for the PWA manifest.
// No external dependencies: builds a valid PNG with zlib + manual chunk CRC.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public');
mkdirSync(outDir, { recursive: true });

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function makePng(size) {
  const bg = [15, 23, 42]; // slate-900
  const ring = [96, 165, 250]; // brand-400
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size * 0.34;
  const rInner = rOuter * 0.62;
  const ringThick = Math.max(2, size * 0.05);

  // RGBA rows with filter byte per row
  const rowLen = size * 4;
  const raw = Buffer.alloc((rowLen + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (rowLen + 1)] = 0; // filter type none
    for (let x = 0; x < size; x++) {
      const o = y * (rowLen + 1) + 1 + x * 4;
      const dx = x - cx + 0.5;
      const dy = y - cy + 0.5;
      const d = Math.sqrt(dx * dx + dy * dy);

      // rounded square background
      const radius = size * 0.22;
      const inside =
        dx > -radius && dx < radius && dy > -radius && dy < radius;
      let [r, g, b, a] = [0, 0, 0, 0];
      if (inside) {
        [r, g, b, a] = [...bg, 255];
      }

      const onRing = d <= rOuter + ringThick / 2 && d >= rOuter - ringThick / 2;
      const hourHand = (x >= cx - ringThick / 2 && x <= cx + ringThick / 2 && y < cy && y > cy - rInner) ||
        (y >= cy - ringThick / 2 && y <= cy + ringThick / 2 && x > cx && x < cx + rInner);
      if (onRing || hourHand) {
        [r, g, b, a] = [...ring, 255];
      }

      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
    }
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  writeFileSync(join(outDir, `pwa-${size}x${size}.png`), makePng(size));
  console.log(`generated pwa-${size}x${size}.png`);
}
