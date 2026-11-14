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
  // Lake Van and Lake Erçek: high steppe, drier and paler than Salda.
  van: {
    exaggeration: 2,
    sky: 0xa8c6dd, fog: 0xc6d6e0,
    sun: 0xfff1dc, sunStrength: 2.7, skyLight: 0xd6e4f2, groundLight: 0x5e5646, ambient: 1.1,
  },
  jezero: {
    exaggeration: 5,
    sky: 0xd6a878, fog: 0xd9b088,
    sun: 0xffe2c0, sunStrength: 2.1, skyLight: 0xf0c8a0, groundLight: 0x5a3a26, ambient: 1.0,
    // "Terraform" view: a guess at Jezero about 3.5 billion years ago, when it held a lake.
    // Only the terrain and the water level come from data. level_m is just under the point
    // where water would spill through the eastern outlet in this MOLA grid (about -2425 m).
    // The sky, the colours and the life forms are imagined.
    ancient: {
      level_m: -2430, rise_m: 260,
      sky: 0xaec3cf, fog: 0xc3d0d4,
      dome: { top: 0x6f93b0, horizon: 0xcdd9dc, ground: 0xb4c0c0 },   // the gradient sky dome's colours
      sun: 0xfff0d8, sunStrength: 2.3, skyLight: 0xd3e2ee, groundLight: 0x4d4a3c, ambient: 1.1,
    },
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
function lakeMask(metres, n, level, start = Math.floor(n / 2) * n + Math.floor(n / 2), mask = new Uint8Array(n * n)) {
  if (level === undefined) return mask;
  const flat = (k) => Math.abs(metres[k] - level) < 0.75;
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
  // Steppe grass and bare volcanic slopes; grey-brown shores; Van's soda water is deep blue.
  van: {
    beach: C(0xcfc7b4), grass: C(0xb2a676), scrub: C(0x8d8458), forest: C(0x76704e),
    rock: C(0x7b736a), shallow: C(0xa9dcd6), mid: C(0x2f8fb0), deep: C(0x0f4a78),
  },
  jezero: {
    floor: C(0x7a4429), plain: C(0xb46a3c), high: C(0xdba678), steep: C(0x5e3421),
  },
  // Imagined colours for the ancient view.
  ancient: {
    bed: C(0x4f5a50), mat: C(0x66703f), carbonate: C(0xe6dfc8), low: C(0x7d6650), high: C(0xb09a7c), steep: C(0x57483a),
    shallow: C(0x7fc4bd), deep: C(0x1d5670), moundPale: C(0xcfc5a4), moundDark: C(0x6c7448),
  },
};

// Earth lakes. `base` is the elevation where the colour bands start.
function paintSalda(out, m, slope, toWater, toLand, lake, grainy, p = PAINT.salda, base = 1200) {
  if (toLand > 0) {                                   // under the lake
    out.copy(p.shallow).lerp(p.mid, Math.min(1, toLand / 5));
    if (toLand > 5) out.lerp(p.deep, Math.min(1, (toLand - 5) / 9));
    return;
  }
  const t = THREE.MathUtils.clamp((m - base) / 700, 0, 1);
  out.copy(p.grass).lerp(p.scrub, Math.min(1, t * 2.2));
  if (t > 0.35) out.lerp(p.forest, Math.min(1, (t - 0.35) * 2.4));
  out.lerp(p.rock, THREE.MathUtils.clamp((slope - 0.55) * 1.6, 0, 1));
  if (t > 0.8) out.lerp(p.rock, (t - 0.8) * 4);
  // White hydromagnesite shore: only close to the water and barely above it.
  const shore = THREE.MathUtils.clamp(1 - (toWater - 1) / 3, 0, 1) * THREE.MathUtils.clamp(1 - (m - lake) / 25, 0, 1);
  out.lerp(p.beach, shore);
  out.multiplyScalar(0.86 + grainy * 0.28);
}

// The ancient view: a pale carbonate band at the waterline (orbiters see carbonates
// along Jezero's inner margin), olive microbial mats in the shallows (imagined, after
// Lake Salda), and less dusty ground above.
function paintAncient(out, m, slope, level, flooded, grainy) {
  const p = PAINT.ancient;
  const above = m - level;
  if (flooded && above < 0) {
    out.copy(p.mat).lerp(p.bed, THREE.MathUtils.clamp(-above / 45, 0, 1));
  } else {
    out.copy(p.low).lerp(p.high, THREE.MathUtils.clamp(above / 700, 0, 1));
    out.lerp(p.steep, THREE.MathUtils.clamp((slope - 0.35) * 1.8, 0, 0.8));
    if (flooded || above < 60) out.lerp(p.carbonate, THREE.MathUtils.clamp(1 - above / 45, 0, 1) * 0.85);
  }
  out.multiplyScalar(0.86 + grainy * 0.28);
}

// Cells at or below `level` that connect to the map centre: the ancient lake.
function floodMask(metres, n, level) {
  const mask = new Uint8Array(n * n);
  const start = Math.floor(n / 2) * n + Math.floor(n / 2);
  if (metres[start] > level) return mask;
  const stack = [start];
  mask[start] = 1;
  while (stack.length) {
    const k = stack.pop();
    const i = k % n;
    for (const next of [k - 1, k + 1, k - n, k + n]) {
      if (next < 0 || next >= n * n || mask[next] || metres[next] > level) continue;
      if (Math.abs((next % n) - i) > 1) continue;
      mask[next] = 1;
      stack.push(next);
    }
  }
  return mask;
}

// A small repeatable random source, so the mounds stand in the same places on every visit.
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
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
  const reply = await fetch(`${base}/sites.json`, { cache: 'no-cache' });
  if (!reply.ok) throw new Error(`could not load ${base}/sites.json (${reply.status})`);
  return (await reply.json()).sites;
}

export async function buildTerrain(site, base) {
  const reply = await fetch(`${base}/${site.file}`, { cache: 'no-cache' });
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

  // One lake flooded from the map centre, or several, each from a point known to be water.
  let water;
  const lakeLevel = new Float32Array(n * n).fill(site.lake_level_m ?? 0);   // surface level of the nearest lake, for shore colours
  if (site.lakes) {
    water = new Uint8Array(n * n);
    const kmPerDegree = (2 * Math.PI * BODY_RADIUS_KM[site.body]) / 360;
    for (const lake of site.lakes) {
      const before = water.slice();
      const i = Math.round(((lake.lon - site.lon) * kmPerDegree * Math.cos((site.lat * Math.PI) / 180) / site.width_km + 0.5) * (n - 1));
      const j = Math.round((0.5 - (lake.lat - site.lat) * kmPerDegree / site.width_km) * (n - 1));
      lakeMask(metres, n, lake.level_m, j * n + i, water);
      for (let k = 0; k < n * n; k++) if (water[k] && !before[k]) lakeLevel[k] = lake.level_m;
    }
    // Land cells take the level of the lake they are closer to in height, so each shore gets its own band.
    for (let k = 0; k < n * n; k++) if (!water[k]) {
      lakeLevel[k] = site.lakes.reduce((best, l) => (Math.abs(metres[k] - l.level_m) < Math.abs(metres[k] - best) ? l.level_m : best), site.lakes[0].level_m);
    }
  } else {
    water = lakeMask(metres, n, site.lake_level_m);
  }
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
  const old = look.ancient || null;
  const flooded = old ? floodMask(metres, n, old.level_m) : null;
  const ancientColors = old ? new Float32Array(n * n * 3) : null;
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
      } else if (site.body === 'earth') {
        paintSalda(color, metres[k], slope, toWater[k] / scale, water[k] ? toLand[k] / scale : 0,
          lakeLevel[k], grainy, PAINT[site.id] || PAINT.salda, (site.lakes ? Math.min(...site.lakes.map((l) => l.level_m)) : 1200) + 60);
      } else {
        paintJezero(color, metres[k], slope, low, high, grainy);
      }
      colors[k * 3] = color.r; colors[k * 3 + 1] = color.g; colors[k * 3 + 2] = color.b;
      if (old) {
        paintAncient(color, metres[k], slope, old.level_m, flooded[k] === 1, grainy);
        ancientColors[k * 3] = color.r; ancientColors[k * 3 + 1] = color.g; ancientColors[k * 3 + 2] = color.b;
      }
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
  const toY = (m) => ((m - site.min_m) * look.exaggeration) / metresPerUnit;

  // ---- the ancient lake (only for a site whose look has an `ancient` block) ----
  let ancient = null;
  if (old) {
    const levelY = toY(old.level_m), startY = toY(old.level_m - old.rise_m);
    // One flat sheet over the lake cells and their neighbours; the terrain rising
    // through it draws the shoreline, so the edge is smooth without extra geometry.
    const near = distanceTo(flooded, n, 3);
    const sheetPos = new Float32Array(n * n * 3), sheetCol = new Float32Array(n * n * 3), sheetIndex = [];
    const tint = new THREE.Color();
    let cells = 0, deepest = 0;
    for (let k = 0; k < n * n; k++) {
      sheetPos[k * 3] = positions[k * 3]; sheetPos[k * 3 + 2] = positions[k * 3 + 2];
      const depth = Math.max(0, old.level_m - metres[k]);
      tint.copy(PAINT.ancient.shallow).lerp(PAINT.ancient.deep, Math.min(1, depth / 160));
      sheetCol[k * 3] = tint.r; sheetCol[k * 3 + 1] = tint.g; sheetCol[k * 3 + 2] = tint.b;
      if (flooded[k]) { cells++; deepest = Math.max(deepest, depth); }
    }
    for (let j = 0; j < n - 1; j++) {
      for (let i = 0; i < n - 1; i++) {
        const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
        if (near[a] < 2 && near[b] < 2 && near[c] < 2 && near[d] < 2) sheetIndex.push(a, c, b, b, c, d);
      }
    }
    const sheet = new THREE.BufferGeometry();
    sheet.setAttribute('position', new THREE.BufferAttribute(sheetPos, 3));
    sheet.setAttribute('color', new THREE.BufferAttribute(sheetCol, 3));
    sheet.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    sheet.setIndex(sheetIndex);
    sheet.computeVertexNormals();
    // Same rippled, reflective water as Lake Salda's.
    const lake = new THREE.Mesh(sheet, new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.08, metalness: 0.15, transparent: true, opacity: 0.88,
      normalMap: waterNormals(), normalScale: new THREE.Vector2(0.35, 0.35) }));
    lake.receiveShadow = true;
    lake.visible = false;
    group.add(lake);

    // Imagined life: low rounded mounds like the microbialites of Lake Salda, scattered
    // along the waterline. One instanced mesh, so they cost a single draw call.
    const random = seeded(20261114);
    const spots = [];
    for (let k = 0; k < n * n; k++) {
      const above = metres[k] - old.level_m;
      if (near[k] < 2 && above > -35 && above < 8) spots.push(k);
    }
    const count = Math.min(320, spots.length);
    const mounds = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial(), count);
    const matrix = new THREE.Matrix4(), at = new THREE.Vector3(), size = new THREE.Vector3(), turn = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const moundBase = [];
    for (let c = 0; c < count; c++) {
      const k = spots[Math.floor(random() * spots.length)];
      const x = positions[k * 3] + (random() - 0.5) * cell * 1.6, z = positions[k * 3 + 2] + (random() - 0.5) * cell * 1.6;
      const r = 1.6 + random() * 3.2;
      moundBase.push({ x, z, r, squash: 0.45 + random() * 0.35, spin: random() * Math.PI });
      mounds.setColorAt(c, tint.copy(PAINT.ancient.moundPale).lerp(PAINT.ancient.moundDark, random()));
    }
    mounds.frustumCulled = false;
    mounds.castShadow = mounds.receiveShadow = true;
    mounds.visible = false;
    group.add(mounds);

    const colorAttribute = geometry.attributes.color;
    const today = colors.slice();
    ancient = {
      level_m: old.level_m, look: old, amount: 0, waterY: startY, flooded,
      area_km2: Math.round(cells * (site.width_km / (n - 1)) ** 2), deepest_m: Math.round(deepest), mounds: count,
      // amount runs from 0 (today) to 1 (lake full).
      set(amount) {
        this.amount = amount;
        const eased = amount * amount * (3 - 2 * amount);
        this.waterY = startY + (levelY - startY) * eased;
        lake.visible = mounds.visible = amount > 0.001;
        lake.position.y = this.waterY;
        lake.updateMatrix();
        const data = colorAttribute.array;
        for (let q = 0; q < data.length; q++) data[q] = today[q] + (ancientColors[q] - today[q]) * eased;
        colorAttribute.needsUpdate = true;
        const grow = Math.max(0.001, eased);
        for (let c = 0; c < count; c++) {
          const m = moundBase[c];
          at.set(m.x, sample(y, m.x, m.z) - m.r * m.squash * 0.25, m.z);
          size.set(m.r * grow, m.r * m.squash * grow, m.r * grow);
          turn.setFromAxisAngle(up, m.spin);
          mounds.setMatrixAt(c, matrix.compose(at, turn, size));
        }
        mounds.instanceMatrix.needsUpdate = true;
      },
    };
  }
  const cellAt = (x, z) => Math.round(THREE.MathUtils.clamp((z + half) / cell, 0, n - 1)) * n
    + Math.round(THREE.MathUtils.clamp((x + half) / cell, 0, n - 1));

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
    ancient,
    isWater(x, z) {
      const k = cellAt(x, z);
      if (water[k] === 1) return true;
      // In the ancient view a spot is water once the rising lake has covered it.
      return !!ancient && ancient.amount > 0 && ancient.flooded[k] === 1 && sample(y, x, z) < ancient.waterY - 0.3;
    },
    // Height of whatever is on top here: the ground, or the lake surface over it.
    surfaceAt(x, z) {
      const ground = sample(y, x, z);
      return ancient && ancient.amount > 0 && ancient.flooded[cellAt(x, z)] === 1 ? Math.max(ground, ancient.waterY) : ground;
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
