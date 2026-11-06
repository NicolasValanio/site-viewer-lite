#!/usr/bin/env node
'use strict';
// Generates a sample point cloud in the PTS1 binary format described in the brief.
//
//   node tools/make-cloud.js <projectId> [count] [--truncate]
//
// Header (16 bytes, little-endian):
//   bytes 0..3   ASCII magic "PTS1"
//   bytes 4..7   uint32  point count N
//   bytes 8..11  float32 point spacing in metres (informational)
//   bytes 12..15 uint32  reserved (0)
// Body: N records of 16 bytes each:
//   float32 x, float32 y, float32 z (metres, Z up), uint8 r, uint8 g, uint8 b, uint8 intensity
//
// --truncate writes only 60 % of the body (the header still announces N): a file cut off mid-download.

const fs = require('fs');
const path = require('path');

const [, , id, countArg, flag] = process.argv;
if (!id) { console.error('usage: node tools/make-cloud.js <projectId> [count] [--truncate]'); process.exit(1); }
const root = path.join(__dirname, '..', 'data');
const spacesFile = path.join(root, 'spaces', `${id}.json`);
if (!fs.existsSync(spacesFile)) { console.error(`no spaces for ${id}`); process.exit(1); }
const spaces = JSON.parse(fs.readFileSync(spacesFile, 'utf8'));
const N = Math.max(1, Number(countArg) || 2_000_000);

// Deterministic pseudo-random numbers so every candidate gets the same file.
let seed = 0x9e3779b9;
const rand = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 1_000_000) / 1_000_000; };

const buf = Buffer.alloc(16 + N * 16);
buf.write('PTS1', 0, 'ascii');
buf.writeUInt32LE(N, 4);
buf.writeFloatLE(0.02, 8);
buf.writeUInt32LE(0, 12);

const area = spaces.map((s) => 2 * (s.w * s.d + s.w * s.h + s.d * s.h));
const total = area.reduce((a, b) => a + b, 0);
for (let i = 0; i < N; i++) {
  // pick a room weighted by surface area, then a point on one of its six faces
  let t = rand() * total, k = 0; while (k < spaces.length - 1 && t > area[k]) { t -= area[k]; k++; }
  const s = spaces[k];
  let x = s.x + rand() * s.w, y = s.y + rand() * s.d, z = s.z + rand() * s.h;
  const face = Math.floor(rand() * 6);
  if (face === 0) x = s.x; else if (face === 1) x = s.x + s.w; else if (face === 2) y = s.y; else if (face === 3) y = s.y + s.d; else if (face === 4) z = s.z; else z = s.z + s.h;
  const o = 16 + i * 16;
  buf.writeFloatLE(x + (rand() - 0.5) * 0.01, o);
  buf.writeFloatLE(y + (rand() - 0.5) * 0.01, o + 4);
  buf.writeFloatLE(z + (rand() - 0.5) * 0.01, o + 8);
  const shade = face === 4 ? 150 : face === 5 ? 220 : 185;
  buf[o + 12] = Math.min(255, shade + Math.floor(rand() * 30));
  buf[o + 13] = Math.min(255, shade - 10 + Math.floor(rand() * 30));
  buf[o + 14] = Math.min(255, shade - 25 + Math.floor(rand() * 30));
  buf[o + 15] = Math.floor(rand() * 256);
}

const out = path.join(root, 'clouds');
fs.mkdirSync(out, { recursive: true });
const truncate = flag === '--truncate';
const bytes = truncate ? 16 + Math.floor(N * 0.6) * 16 : buf.length;
const file = path.join(out, truncate ? `${id}-truncated.pts` : `${id}.pts`);
fs.writeFileSync(file, buf.subarray(0, bytes));
console.log(`${file}: ${N.toLocaleString('en-US')} points announced, ${(bytes / 1048576).toFixed(1)} MB written${truncate ? ' (truncated)' : ''}`);
