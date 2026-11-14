// A low-polygon model of NASA's Perseverance rover, built from simple shapes.
// AI-generated: written by Claude (Anthropic, Claude Code) on 2026-11-14. Review before use.
//
// Proportions follow NASA's published figures: about 3 m long, 2.7 m wide and
// 2.2 m tall, six 52.5 cm wheels on a rocker-bogie suspension, a mast with the
// SuperCam and Mastcam-Z heads, a stowed robotic arm and the MMRTG power source
// at the back. Part positions were laid out by eye from NASA's public pictures,
// not from engineering drawings, so treat it as a likeness, not a scale model.
//
// Units are metres. Forward is +z, up is +y, wheels touch the ground at y = 0.
// Everything static is merged into one mesh and the six wheels share one
// geometry, so the whole rover costs seven draw calls.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const WHITE = 0xe9e6de, DECK = 0xcfccc3, DARK = 0x2b2c30, METAL = 0x9a9ea6;
const ALUMINIUM = 0xb9bcc2, TREAD = 0x55585e, GOLD = 0xb08a3c, LENS = 0x10141c;

const WHEEL_RADIUS = 0.2625, WHEEL_WIDTH = 0.28;
const TRACK = 1.1;                                  // wheel centre to rover centreline
const WHEEL_Z = { front: 1.12, middle: -0.02, rear: -1.08 };

function tint(geometry, hex) {
  const color = new THREE.Color(hex);
  const count = geometry.attributes.position.count;
  const data = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) { data[i * 3] = color.r; data[i * 3 + 1] = color.g; data[i * 3 + 2] = color.b; }
  geometry.setAttribute('color', new THREE.BufferAttribute(data, 3));
  return geometry;
}

function box(parts, hex, w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.applyMatrix4(new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1)));
  parts.push(tint(g, hex));
}

// A cylinder running from point a to point b.
function tube(parts, hex, a, b, radius, sides = 8) {
  const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b);
  const length = from.distanceTo(to);
  const g = new THREE.CylinderGeometry(radius, radius, length, sides);
  const turn = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(from.clone().add(to).multiplyScalar(0.5), turn, new THREE.Vector3(1, 1, 1)));
  parts.push(tint(g, hex));
}

function wheelGeometry() {
  const parts = [];
  const side = new THREE.Matrix4().makeRotationZ(Math.PI / 2);   // lay the cylinder along x
  const rim = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_WIDTH, 20, 1, true);
  parts.push(tint(rim.applyMatrix4(side), ALUMINIUM));
  const hub = new THREE.CylinderGeometry(0.09, 0.09, WHEEL_WIDTH * 0.9, 10);
  parts.push(tint(hub.applyMatrix4(side), DARK));
  // Perseverance has gently curved treads; straight cleats read the same at this size.
  const cleats = 24;
  for (let c = 0; c < cleats; c++) {
    const angle = (c / cleats) * Math.PI * 2;
    const g = new THREE.BoxGeometry(WHEEL_WIDTH, 0.022, 0.03);
    g.applyMatrix4(new THREE.Matrix4().makeTranslation(0, WHEEL_RADIUS + 0.006, 0));
    g.applyMatrix4(new THREE.Matrix4().makeRotationX(angle));
    parts.push(tint(g, TREAD));
  }
  // Six spokes, visible through the open wheel.
  for (let s = 0; s < 6; s++) {
    const g = new THREE.BoxGeometry(0.03, WHEEL_RADIUS * 2 - 0.02, 0.035);
    g.applyMatrix4(new THREE.Matrix4().makeRotationX((s / 6) * Math.PI));
    parts.push(tint(g, METAL));
  }
  return mergeGeometries(parts.map((g) => g.index ? g.toNonIndexed() : g));
}

function bodyGeometry() {
  const p = [];

  // Chassis ("warm electronics box") and top deck.
  box(p, WHITE, 1.5, 0.46, 1.7, 0, 0.9, 0.02);
  box(p, DECK, 1.62, 0.04, 1.82, 0, 1.15, 0.02);
  box(p, GOLD, 1.3, 0.05, 1.5, 0, 0.655, 0.02);              // gold belly pan
  box(p, DARK, 0.5, 0.08, 0.6, -0.3, 1.21, 0.35);            // deck equipment
  box(p, DARK, 0.3, 0.06, 0.3, 0.3, 1.2, -0.45);
  box(p, WHITE, 0.4, 0.1, 0.3, 0.1, 1.22, 0.1);

  // MMRTG power source: a finned cylinder tilted up at the back.
  const tilt = -0.5;
  const rtg = new THREE.CylinderGeometry(0.2, 0.2, 0.68, 12);
  const place = new THREE.Matrix4().compose(
    new THREE.Vector3(0, 1.08, -1.16), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2 + tilt, 0, 0)), new THREE.Vector3(1, 1, 1));
  p.push(tint(rtg.applyMatrix4(place), WHITE));
  for (let f = 0; f < 8; f++) {
    const fin = new THREE.BoxGeometry(0.012, 0.6, 0.13);
    fin.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0, 0.255));
    fin.applyMatrix4(new THREE.Matrix4().makeRotationY((f / 8) * Math.PI * 2));
    p.push(tint(fin.applyMatrix4(place), DARK));
  }
  tube(p, METAL, [0.22, 0.95, -0.82], [0.16, 1.0, -1.02], 0.025);
  tube(p, METAL, [-0.22, 0.95, -0.82], [-0.16, 1.0, -1.02], 0.025);
  box(p, DARK, 0.03, 0.42, 0.5, 0.52, 0.98, -1.0, 0, 0.25, 0);   // heat exchanger plates
  box(p, DARK, 0.03, 0.42, 0.5, -0.52, 0.98, -1.0, 0, -0.25, 0);

  // Remote sensing mast with its camera head, on the front right corner of the deck.
  const mx = -0.56, mz = 0.72;
  tube(p, WHITE, [mx, 1.15, mz], [mx, 2.0, mz], 0.045);
  tube(p, METAL, [mx, 1.15, mz], [mx, 1.3, mz], 0.075);
  box(p, WHITE, 0.46, 0.2, 0.24, mx, 2.08, mz + 0.02);
  tube(p, WHITE, [mx + 0.08, 2.1, mz - 0.02], [mx + 0.08, 2.1, mz + 0.2], 0.085, 12);   // SuperCam
  tube(p, LENS, [mx + 0.08, 2.1, mz + 0.2], [mx + 0.08, 2.1, mz + 0.21], 0.065, 12);
  for (const eye of [-0.17, -0.06]) {                                                    // Mastcam-Z pair
    tube(p, LENS, [mx + eye, 2.03, mz + 0.14], [mx + eye, 2.03, mz + 0.16], 0.028, 8);
  }
  for (const eye of [-0.21, 0.21]) {                                                     // navigation cameras
    tube(p, LENS, [mx + eye, 2.13, mz + 0.14], [mx + eye, 2.13, mz + 0.155], 0.016, 6);
  }

  // High-gain antenna (hexagonal), low-gain stub and UHF can.
  tube(p, METAL, [0.5, 1.17, -0.2], [0.5, 1.4, -0.2], 0.03);
  const dish = new THREE.CylinderGeometry(0.2, 0.2, 0.03, 6);
  dish.applyMatrix4(new THREE.Matrix4().compose(
    new THREE.Vector3(0.5, 1.48, -0.2), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.9, 0.3, 0)), new THREE.Vector3(1, 1, 1)));
  p.push(tint(dish, DARK));
  tube(p, METAL, [0.2, 1.17, -0.7], [0.2, 1.5, -0.7], 0.02);
  tube(p, METAL, [0.6, 1.17, -0.72], [0.6, 1.42, -0.72], 0.055, 10);

  // Robotic arm, folded across the front, with its instrument turret.
  tube(p, METAL, [0.55, 0.95, 0.9], [0.55, 0.95, 1.05], 0.07, 10);
  tube(p, WHITE, [0.55, 0.95, 1.05], [-0.3, 0.98, 1.12], 0.045);
  tube(p, WHITE, [-0.3, 0.98, 1.12], [0.25, 0.8, 1.22], 0.04);
  tube(p, METAL, [-0.3, 0.9, 1.12], [-0.3, 1.06, 1.12], 0.06, 10);
  tube(p, DARK, [0.25, 0.8, 1.14], [0.25, 0.8, 1.38], 0.17, 12);

  // Rocker-bogie suspension, one per side.
  for (const s of [-1, 1]) {
    const x = s * 0.86;
    const rocker = [x, 0.92, 0.2], bogie = [x, 0.56, -0.55];
    tube(p, DARK, [s * 0.75, 0.92, 0.2], [x, 0.92, 0.2], 0.06, 10);              // pivot into the body
    tube(p, DARK, rocker, [x, 0.62, WHEEL_Z.front], 0.04);                       // rocker, front leg
    tube(p, DARK, rocker, bogie, 0.04);                                          // rocker, rear leg
    tube(p, DARK, bogie, [x, 0.45, WHEEL_Z.middle], 0.035);                      // bogie to middle wheel
    tube(p, DARK, bogie, [x, 0.62, WHEEL_Z.rear], 0.035);                        // bogie to rear wheel
    for (const z of [WHEEL_Z.front, WHEEL_Z.rear]) {                             // steering motors
      tube(p, METAL, [x, 0.52, z], [x, 0.7, z], 0.06, 10);
      tube(p, DARK, [x, 0.3, z], [x, 0.52, z], 0.03);
      tube(p, DARK, [x, 0.3, z], [s * (TRACK - WHEEL_WIDTH / 2), WHEEL_RADIUS, z], 0.03);
    }
    tube(p, DARK, [x, 0.45, WHEEL_Z.middle], [s * (TRACK - WHEEL_WIDTH / 2), WHEEL_RADIUS, WHEEL_Z.middle], 0.03);
  }
  // Differential bar across the deck that links the two rockers.
  tube(p, DARK, [-0.75, 1.2, 0.2], [0.75, 1.2, 0.2], 0.025);

  return mergeGeometries(p.map((g) => g.index ? g.toNonIndexed() : g));
}

// A small open boat that carries the rover across the lake. Not a real piece of
// mission hardware: it is here so the lake can be explored too. Its deck is at
// y = 0, where the wheels stand, and the bow points forward (+z).
export function createBoat() {
  const outline = (grow) => {
    const s = new THREE.Shape();
    s.moveTo(-1.75 - grow, -2.3 - grow);
    s.lineTo(1.75 + grow, -2.3 - grow);
    s.lineTo(1.75 + grow, 1.5);
    s.lineTo(0, 3.2 + grow * 1.6);
    s.lineTo(-1.75 - grow, 1.5);
    s.closePath();
    return s;
  };
  const slab = (grow, depth, top) => new THREE.ExtrudeGeometry(outline(grow), { depth, bevelEnabled: false })
    .rotateX(Math.PI / 2).translate(0, top, 0);
  const boat = new THREE.Group();
  boat.add(new THREE.Mesh(slab(0, 0.6, -0.04), new THREE.MeshLambertMaterial({ color: 0xb4622f })));    // hull
  boat.add(new THREE.Mesh(slab(0.12, 0.1, 0.06), new THREE.MeshLambertMaterial({ color: 0xf3efe4 })));  // rim
  boat.visible = false;
  return boat;
}

export function createRover() {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.25, side: THREE.DoubleSide });
  const root = new THREE.Group();
  root.add(new THREE.Mesh(bodyGeometry(), material));

  const wheelShape = wheelGeometry();
  const wheels = [];      // spin about x
  const steered = [];     // turn about y; sign flips for the rear pair
  for (const s of [-1, 1]) {
    for (const [name, z] of Object.entries(WHEEL_Z)) {
      const pivot = new THREE.Group();
      pivot.position.set(s * TRACK, WHEEL_RADIUS, z);
      const wheel = new THREE.Mesh(wheelShape, material);
      pivot.add(wheel);
      root.add(pivot);
      wheels.push(wheel);
      if (name !== 'middle') steered.push({ pivot, sign: name === 'front' ? 1 : -1 });
    }
  }

  return {
    object: root,
    length: 3.0, width: 2.7,
    // distance in metres of rover travel (negative when reversing), steer from -1 to 1
    animate(distance, steer) {
      const spin = distance / WHEEL_RADIUS;
      for (const wheel of wheels) wheel.rotation.x += spin;
      for (const { pivot, sign } of steered) pivot.rotation.y += (steer * 0.45 * sign - pivot.rotation.y) * 0.2;
    },
  };
}
