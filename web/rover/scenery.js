// Scenery for web/rover.html: sky, lake ripples, rocks and pine trees.
// AI-generated: written by Claude (Anthropic, Claude Code) on 2026-11-14. Review before use.
//
// None of this is data. The terrain heights are NASA data; the rocks and trees
// are placed by a fixed random pattern so the ground reads at rover scale, and
// they are drawn at the same exaggerated scale as the rover. The page says so.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { WORLD } from './terrain.js';

// A seeded random generator, so the scenery is the same on every visit.
function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- sky ---------------------------------------------------------------------

const SKY = {
  salda: { top: 0x3f7fc4, horizon: 0xd3e6f3, ground: 0xb7c9d4 },
  van: { top: 0x4b86c2, horizon: 0xdbe7ef, ground: 0xbfcad0 },
  jezero: { top: 0x9a6a4c, horizon: 0xe2b98e, ground: 0xc79a72 },
};

// A large dome with a vertical colour gradient. It ignores fog and follows the camera.
export function createSky(id) {
  const colors = SKY[id];
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new THREE.Color(colors.top) },
      horizon: { value: new THREE.Color(colors.horizon) },
      ground: { value: new THREE.Color(colors.ground) },
    },
    vertexShader: 'varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 ground; varying vec3 vDir;
      void main() {
        float h = vDir.y;
        vec3 sky = mix(horizon, top, pow(clamp(h, 0.0, 1.0), 0.55));
        vec3 below = mix(horizon, ground, clamp(-h * 4.0, 0.0, 1.0));
        gl_FragColor = vec4(h >= 0.0 ? sky : below, 1.0);
      }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), material);
  dome.frustumCulled = false;
  dome.renderOrder = -1;
  return dome;
}

// ---- water ---------------------------------------------------------------------

// A tileable normal map built from a few sine waves, scrolled each frame for ripples.
let waterNormalTexture = null;
export function waterNormals() {
  if (waterNormalTexture) return waterNormalTexture;
  const size = 256;
  const height = new Float32Array(size * size);
  const waves = [[3, 1, 0.0], [1, 4, 1.3], [5, -2, 2.1], [-2, 7, 0.7], [9, 3, 2.9], [-6, -9, 1.9]];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let h = 0;
      for (const [kx, ky, phase] of waves) h += Math.sin(((kx * x + ky * y) / size) * Math.PI * 2 + phase) / Math.hypot(kx, ky);
      height[y * size + x] = h;
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const at = (i, j) => height[((j + size) % size) * size + ((i + size) % size)];
      const dx = (at(x + 1, y) - at(x - 1, y)) * 1.6, dy = (at(x, y + 1) - at(x, y - 1)) * 1.6;
      const length = Math.hypot(dx, dy, 1);
      const p = (y * size + x) * 4;
      image.data[p] = Math.round(((-dx / length) * 0.5 + 0.5) * 255);
      image.data[p + 1] = Math.round(((-dy / length) * 0.5 + 0.5) * 255);
      image.data[p + 2] = Math.round(((1 / length) * 0.5 + 0.5) * 255);
      image.data[p + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  waterNormalTexture = new THREE.CanvasTexture(canvas);
  waterNormalTexture.wrapS = waterNormalTexture.wrapT = THREE.RepeatWrapping;
  waterNormalTexture.repeat.set(60, 60);
  return waterNormalTexture;
}

// ---- rocks and trees -------------------------------------------------------------

function rockGeometry(seed) {
  const rand = random(seed);
  const g = new THREE.IcosahedronGeometry(1, 1);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i);
    v.multiplyScalar(0.75 + rand() * 0.45);
    v.y *= 0.62;                                     // rocks sit flatter than they are wide
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function pineGeometry() {
  const trunk = new THREE.CylinderGeometry(0.12, 0.18, 1.6, 6).translate(0, 0.8, 0);
  const tiers = [[1.1, 2.2, 1.9], [0.85, 1.9, 3.0], [0.55, 1.6, 4.0]].map(([r, h, y]) => new THREE.ConeGeometry(r, h, 7).translate(0, y, 0));
  const color = (g, hex) => {
    const c = new THREE.Color(hex), n = g.attributes.position.count, data = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) data.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(data, 3));
    return g.index ? g.toNonIndexed() : g;
  };
  return mergeGeometries([color(trunk, 0x5a4330), ...tiers.map((g, i) => color(g, [0x2f4a2a, 0x355330, 0x3c5c35][i]))]);
}

const STYLE = {
  salda: { rocks: 3200, rockColors: [0xb3ab9c, 0x9c958a, 0xc9c2b3, 0x85807a], rockSize: [0.5, 2.8], trees: 5200 },
  van: { rocks: 4200, rockColors: [0x6e6862, 0x857c72, 0x5b5652, 0x9a8f80], rockSize: [0.5, 3.0], trees: 0 },
  jezero: { rocks: 6500, rockColors: [0x5e3a28, 0x7a4b32, 0x4a2e22, 0x8e5a3a], rockSize: [0.5, 3.6], trees: 0 },
};

// Rocks everywhere off the water, more on steep ground; pines in clusters on
// Salda's slopes between the shore and the bare ridge tops.
export function createScatter(terrain) {
  const id = terrain.site.id;
  const style = STYLE[id];
  const rand = random({ salda: 1140, van: 1645 }[id] || 2021);
  const group = new THREE.Group();
  const half = WORLD / 2 - 20;
  const slopeAt = (x, z) => Math.hypot(terrain.heightAt(x + 4, z) - terrain.heightAt(x - 4, z), terrain.heightAt(x, z + 4) - terrain.heightAt(x, z - 4)) / 8;
  const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();

  // Rocks: a few shapes, each one instanced.
  const shapes = [rockGeometry(1), rockGeometry(2), rockGeometry(3)];
  const rockMaterial = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0, flatShading: true });
  const perShape = Math.ceil(style.rocks / shapes.length);
  for (const shape of shapes) {
    const mesh = new THREE.InstancedMesh(shape, rockMaterial, perShape);
    mesh.castShadow = true; mesh.receiveShadow = true;
    let placed = 0, tries = 0;
    while (placed < perShape && tries++ < perShape * 8) {
      const x = (rand() * 2 - 1) * half, z = (rand() * 2 - 1) * half;
      if (terrain.isWater(x, z)) continue;
      const steep = slopeAt(x, z);
      if (rand() > 0.35 + steep * 0.8) continue;      // denser on slopes and scree
      const [lo, hi] = style.rockSize;
      const size = lo + Math.pow(rand(), 2.6) * (hi - lo) * (1 + steep);
      e.set(rand() * 0.6, rand() * Math.PI * 2, rand() * 0.6);
      sc.set(size * (0.8 + rand() * 0.5), size * (0.7 + rand() * 0.5), size * (0.8 + rand() * 0.5));
      matrix.compose(v.set(x, terrain.heightAt(x, z) - size * 0.25, z), q.setFromEuler(e), sc);
      mesh.setMatrixAt(placed, matrix);
      mesh.setColorAt(placed, new THREE.Color(style.rockColors[Math.floor(rand() * style.rockColors.length)]).multiplyScalar(0.85 + rand() * 0.3));
      placed++;
    }
    mesh.count = placed;
    mesh.userData.full = placed;
    group.add(mesh);
  }

  // Pines (Salda only): Turkish red pine and black pine forest cover the hills around the lake.
  if (style.trees) {
    const pines = new THREE.InstancedMesh(pineGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true }), style.trees);
    pines.castShadow = true; pines.receiveShadow = true;
    let placed = 0, tries = 0;
    const clump = (x, z) => Math.sin(x * 0.011) * Math.cos(z * 0.013) + Math.sin((x + z) * 0.007) * 0.6;
    while (placed < style.trees && tries++ < style.trees * 12) {
      const x = (rand() * 2 - 1) * half, z = (rand() * 2 - 1) * half;
      if (terrain.isWater(x, z)) continue;
      const m = terrain.elevationAt(x, z);
      if (m < 1175 || m > 1950) continue;              // above the white shore, below the bare tops
      if (slopeAt(x, z) > 1.1 || clump(x, z) < 0.1) continue;
      const size = 2.4 + rand() * 2.2;
      e.set(0, rand() * Math.PI * 2, 0);
      matrix.compose(v.set(x, terrain.heightAt(x, z) - 0.3, z), q.setFromEuler(e), sc.set(size, size * (0.9 + rand() * 0.4), size));
      pines.setMatrixAt(placed, matrix);
      pines.setColorAt(placed, new THREE.Color(1, 1, 1).multiplyScalar(0.8 + rand() * 0.35));
      placed++;
    }
    pines.count = placed;
    pines.userData.full = placed;
    group.add(pines);
  }
  return group;
}

// Show only a share of the rocks and trees (1 = all), for slower machines.
export function setScatterDensity(group, share) {
  for (const mesh of group.children) if (mesh.isInstancedMesh) mesh.count = Math.round(mesh.userData.full * share);
}
