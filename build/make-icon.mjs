// Generates build/icon.png (512x512): a phone handset on a rounded blue tile.
// Pure Node (zlib) so the repo needs no image tooling.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const S = 512;
const px = Buffer.alloc(S * S * 4);
const set = (x, y, [r, g, b, a]) => {
  const i = (y * S + x) * 4;
  px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
};
const inRoundRect = (x, y, r) => {
  const cx = Math.min(Math.max(x, r), S - 1 - r);
  const cy = Math.min(Math.max(y, r), S - 1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};
// Handset: thick arc between two rounded ends, drawn in polar coordinates.
const inHandset = (x, y) => {
  const cx = 300, cy = 212, R = 170, w = 46;
  const dx = x - cx, dy = y - cy;
  const d = Math.hypot(dx, dy);
  const ang = Math.atan2(dy, dx);
  const a0 = Math.PI * 0.5, a1 = Math.PI * 1.05;
  if (ang >= a0 && ang <= a1 && Math.abs(d - R) <= w) return true;
  for (const a of [a0, a1]) {
    const ex = cx + R * Math.cos(a), ey = cy + R * Math.sin(a);
    if (Math.hypot(x - ex, y - ey) <= w + 18) return true;
  }
  return false;
};
for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    if (!inRoundRect(x, y, 110)) { set(x, y, [0, 0, 0, 0]); continue; }
    const t = y / S;
    const bg = [Math.round(37 + 20 * t), Math.round(99 + 30 * t), 235, 255];
    set(x, y, inHandset(x, y) ? [255, 255, 255, 255] : bg);
  }
}
const raw = Buffer.alloc((S * 4 + 1) * S);
for (let y = 0; y < S; y++) px.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4);
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4); ihdr[8] = 8; ihdr[9] = 6;
writeFileSync(new URL('./icon.png', import.meta.url), Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
]));
