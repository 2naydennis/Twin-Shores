// Terrain for web/rover.html: turns a NASA heightmap into one coloured mesh.
// AI-generated: written by Claude (Anthropic, Claude Code) on 2026-11-14. Review before use.
//
// Heights come from web/rover/terrain/*.bin (see web/tools/build_terrain.py).
// The colours are NOT data: they are painted from elevation, slope and distance
// to the lake so the two sites are easy to tell apart.

import * as THREE from 'three';
import { waterNormals } from './scenery.js';

export const WORLD = 2000;          // scene units across each map, whatever its real width
const BODY_RADIUS_KM = { earth: 6371.0, mars: 3396.0 };

// How each site is drawn. Vertical exaggeration is shown in the page so nobody
// mistakes the relief for true scale.
export const LOOK = {
  salda: {
    exaggeration: 2,
    sky: 0x9cc6e6, fog: 0xb9d6ea,
    sun: 0xfff4e0, sunStrength: 2.6, skyLight: 0xcfe4ff, groundLight: 0x5a5340, ambient: 1.1,
  },
  jezero: {
    exaggeration: 5,
    sky: 0xd6a878, fog: 0xd9b088,
    sun: 0xffe2c0, sunStrength: 2.1, skyLight: 0xf0c8a0, groundLight: 0x5a3a26, ambient: 1.0,
  },
};

function hash(i, j) {
  const n = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

// Smooth value noise in 0..1, used only to break up flat colour.
function noise(x, y) {
  const i = Math.floor(x), j = Math.floor(y);
  const fx = x - i, fy = y - j;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// One small speckle texture, tiled many times, so the ground has grain up close
// without shipping any image files.
let grainTexture = null;
function grain() {
  if (grainTexture) return grainTexture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(size, size);
  for (let p = 0; p < size * size; p++) {
    const v = 205 + Math.floor(Math.random() * 50);
    image.data[p * 4] = image.data[p * 4 + 1] = image.data[p * 4 + 2] = v;
    image.data[p * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  grainTexture = new THREE.CanvasTexture(canvas);
  grainTexture.wrapS = grainTexture.wrapT = THREE.RepeatWrapping;
  grainTexture.repeat.set(90, 90);
  grainTexture.colorSpace = THREE.SRGBColorSpace;
  grainTexture.anisotropy = 4;
  return grainTexture;
}

// Steps from every cell to the nearest cell where inside[] is 1, capped at `limit`.
function distanceTo(inside, n, limit) {
  const dist = new Uint8Array(n * n).fill(limit);
  const queue = new Int32Array(n * n);
  let head = 0, tail = 0;
  for (let k = 0; k < n * n; k++) if (inside[k]) { dist[k] = 0; queue[tail++] = k; }
  while (head < tail) {
    const k = queue[head++];
    const d = dist[k] + 1;
    if (d >= limit) continue;
    const i = k % n, j = (k - i) / n;
    if (i > 0 && dist[k - 1] > d) { dist[k - 1] = d; queue[tail++] = k - 1; }
    if (i < n - 1 && dist[k + 1] > d) { dist[k + 1] = d; queue[tail++] = k + 1; }
    if (j > 0 && dist[k - n] > d) { dist[k - n] = d; queue[tail++] = k - n; }
    if (j < n - 1 && dist[k + n] > d) { dist[k + n] = d; queue[tail++] = k + n; }
  }
  return dist;
}

// The lake is the flat patch at lake level that is connected to the map centre.
function lakeMask(metres, n, level) {
  const mask = new Uint8Array(n * n);
  if (level === undefined) return mask;
  const flat = (k) => Math.abs(metres[k] - level) < 0.75;
  const start = Math.floor(n / 2) * n + Math.floor(n / 2);
  if (!flat(start)) return mask;
  const stack = [start];
  mask[start] = 1;
  while (stack.length) {
    const k = stack.pop();
    const i = k % n;
    for (const next of [k - 1, k + 1, k - n, k + n]) {
      if (next < 0 || next >= n * n || mask[next]) continue;
      if (Math.abs((next % n) - i) > 1) continue;   // do not wrap across a row end
      if (flat(next)) { mask[next] = 1; stack.push(next); }
    }
  }
  return mask;
}

const C = (hex) => new THREE.Color(hex);
const PAINT = {
  salda: {
    beach: C(0xf1eee6), grass: C(0xa39a66), scrub: C(0x6f7a48), forest: C(0x3f5a34),
    rock: C(0x8f8a82), shallow: C(0xbfeee4), mid: C(0x35b6c2), deep: C(0x0c5f86),
  },
  jezero: {
    floor: C(0x7a4429), plain: C(0xb46a3c), high: C(0xdba678), steep: C(0x5e3421),
  },
};

function paintSalda(out, m, slope, toWater, toLand, lake, grainy) {
  const p = PAINT.salda;
  if (toLand > 0) {                                   // under the lake
    out.copy(p.shallow).lerp(p.mid, Math.min(1, toLand / 5));
    if (toLand > 5) out.lerp(p.deep, Math.min(1, (toLand - 5) / 9));
    return;
  }
  const t = THREE.MathUtils.clamp((m - 1200) / 700, 0, 1);
  out.copy(p.grass).lerp(p.scrub, Math.min(1, t * 2.2));
  if (t > 0.35) out.lerp(p.forest, Math.min(1, (t - 0.35) * 2.4));
  out.lerp(p.rock, THREE.MathUtils.clamp((slope - 0.55) * 1.6, 0, 1));
  if (t > 0.8) out.lerp(p.rock, (t - 0.8) * 4);
  // White hydromagnesite shore: only close to the water and barely above it.
  const shore = THREE.MathUtils.clamp(1 - (toWater - 1) / 3, 0, 1) * THREE.MathUtils.clamp(1 - (m - lake) / 25, 0, 1);
  out.lerp(p.beach, shore);
  out.multiplyScalar(0.86 + grainy * 0.28);
}

function paintJezero(out, m, slope, low, high, grainy) {
  const p = PAINT.jezero;
  const t = THREE.MathUtils.clamp((m - low) / (high - low), 0, 1);
  out.copy(p.floor).lerp(p.plain, Math.min(1, t * 2.5));
  if (t > 0.4) out.lerp(p.high, Math.min(1, (t - 0.4) * 1.9));
  out.lerp(p.steep, THREE.MathUtils.clamp((slope - 0.35) * 1.8, 0, 0.8));
  out.multiplyScalar(0.84 + grainy * 0.32);
}

export async function loadSites(base) {
  const reply = await fetch(`${base}/sites.json`);
  if (!reply.ok) throw new Error(`could not load ${base}/sites.json (${reply.status})`);
  return (await reply.json()).sites;
}

export async function buildTerrain(site, base) {
  const reply = await fetch(`${base}/${site.file}`);
  if (!reply.ok) throw new Error(`could not load ${site.file} (${reply.status})`);
  const packed = new Uint16Array(await reply.arrayBuffer());
  const n = site.grid;
  if (packed.length !== n * n) throw new Error(`${site.file} is not ${n} x ${n}`);

  const look = LOOK[site.id];
  const cell = WORLD / (n - 1);
  const metresPerUnit = (site.width_km * 1000) / WORLD;
  const range = site.max_m - site.min_m;
  const metres = new Float32Array(n * n);
  const y = new Float32Array(n * n);                   // scene height, lowest point at 0
  for (let k = 0; k < n * n; k++) {
    metres[k] = site.min_m + (packed[k] / 65535) * range;
    y[k] = ((metres[k] - site.min_m) * look.exaggeration) / metresPerUnit;
  }

  const water = lakeMask(metres, n, site.lake_level_m);
  const land = new Uint8Array(n * n);
  let hasWater = false;
  for (let k = 0; k < n * n; k++) { land[k] = water[k] ? 0 : 1; hasWater = hasWater || water[k] === 1; }
  // Distances are counted in cells; `scale` keeps the shore and depth bands the same
  // width in metres whatever the grid size (they were tuned on a 257 grid).
  const scale = (n - 1) / 256;
  const toWater = hasWater ? distanceTo(water, n, Math.round(12 * scale)) : null;   // for land cells
  const toLand = hasWater ? distanceTo(land, n, Math.round(16 * scale)) : null;     // for water cells

  const positions = new Float32Array(n * n * 3);
  const colors = new Float32Array(n * n * 3);
  const uvs = new Float32Array(n * n * 2);
  const color = new THREE.Color();
  // Jezero is coloured between the crater floor and the rim, ignoring the few extreme cells.
  const low = site.min_m + range * 0.12, high = site.min_m + range * 0.75;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      positions[k * 3] = i * cell - WORLD / 2;
      positions[k * 3 + 1] = y[k];
      positions[k * 3 + 2] = j * cell - WORLD / 2;
      uvs[k * 2] = i / (n - 1);
      uvs[k * 2 + 1] = j / (n - 1);
      const dx = y[j * n + Math.min(n - 1, i + 1)] - y[j * n + Math.max(0, i - 1)];
      const dz = y[Math.min(n - 1, j + 1) * n + i] - y[Math.max(0, j - 1) * n + i];
      const slope = Math.hypot(dx, dz) / (2 * cell);
      const grainy = noise(i * 0.35 / scale, j * 0.35 / scale) * 0.6 + noise(i * 0.09 / scale, j * 0.09 / scale) * 0.4;
      if (site.id === 'salda') {
        paintSalda(color, metres[k], slope, toWater[k] / scale, water[k] ? toLand[k] / scale : 0, site.lake_level_m, grainy);
      } else {
        paintJezero(color, metres[k], slope, low, high, grainy);
      }
      colors[k * 3] = color.r; colors[k * 3 + 1] = color.g; colors[k * 3 + 2] = color.b;
    }
  }

  const index = new Uint32Array((n - 1) * (n - 1) * 6);
  const waterIndex = [];
  let at = 0;
  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
      index[at++] = a; index[at++] = c; index[at++] = b;
      index[at++] = b; index[at++] = c; index[at++] = d;
      if (water[a] && water[b] && water[c] && water[d]) waterIndex.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(new THREE.BufferAttribute(index, 1));
  geometry.computeVertexNormals();
  const ground = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true, map: grain() }));
  ground.matrixAutoUpdate = false;
  ground.receiveShadow = true;

  const group = new THREE.Group();
  group.add(ground);

  let lakeMesh = null;
  // A glossy sheet over the lake cells only. It reuses the terrain's vertices,
  // lifted slightly, so it costs one extra draw call.
  if (waterIndex.length) {
    const sheet = new THREE.BufferGeometry();
    const lifted = positions.slice();
    for (let k = 0; k < n * n; k++) lifted[k * 3 + 1] += 0.35;
    sheet.setAttribute('position', new THREE.BufferAttribute(lifted, 3));
    sheet.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    sheet.setIndex(waterIndex);
    sheet.computeVertexNormals();
    sheet.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    const ripples = waterNormals();
    lakeMesh = new THREE.Mesh(sheet, new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.08, metalness: 0.15, transparent: true, opacity: 0.88,
      normalMap: ripples, normalScale: new THREE.Vector2(0.35, 0.35),
    }));
    lakeMesh.matrixAutoUpdate = false;
    lakeMesh.receiveShadow = true;
    group.add(lakeMesh);
  }

  const kmPerDeg = (2 * Math.PI * BODY_RADIUS_KM[site.body]) / 360;
  const half = WORLD / 2;

  function sample(field, x, z) {
    const gx = THREE.MathUtils.clamp((x + half) / cell, 0, n - 1.001);
    const gz = THREE.MathUtils.clamp((z + half) / cell, 0, n - 1.001);
    const i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j;
    const k = j * n + i;
    const top = field[k] + (field[k + 1] - field[k]) * fx;
    const bottom = field[k + n] + (field[k + n + 1] - field[k + n]) * fx;
    return top + (bottom - top) * fz;
  }

  return {
    site, group, look, metresPerUnit, water: lakeMesh,
    heightAt: (x, z) => sample(y, x, z),               // scene units
    elevationAt: (x, z) => sample(metres, x, z),       // real metres
    isWater(x, z) {
      const i = Math.round(THREE.MathUtils.clamp((x + half) / cell, 0, n - 1));
      const j = Math.round(THREE.MathUtils.clamp((z + half) / cell, 0, n - 1));
      return water[j * n + i] === 1;
    },
    inside: (x, z) => Math.abs(x) < half - cell && Math.abs(z) < half - cell,
    // Scene position to latitude and longitude (north is -z, east is +x).
    latLon(x, z) {
      const lat = site.lat - ((z / WORLD) * site.width_km) / kmPerDeg;
      const lon = site.lon + ((x / WORLD) * site.width_km) / (kmPerDeg * Math.cos((site.lat * Math.PI) / 180));
      return { lat, lon };
    },
    toScene(lat, lon) {
      const z = (-(lat - site.lat) * kmPerDeg * WORLD) / site.width_km;
      const x = ((lon - site.lon) * kmPerDeg * Math.cos((site.lat * Math.PI) / 180) * WORLD) / site.width_km;
      return { x, z };
    },
  };
}
