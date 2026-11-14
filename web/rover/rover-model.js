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
// geometry. Parts are merged per finish (paint, metal, dark, gold, lens),
// so the rover costs a few dozen draw calls.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const WHITE = 0xe9e6de, DECK = 0xcfccc3, DARK = 0x2b2c30, METAL = 0x9a9ea6;
const ALUMINIUM = 0xb9bcc2, TREAD = 0x55585e, GOLD = 0xb08a3c, LENS = 0x10141c;
const CABLE = 0x3a3d42, BLUE = 0x27406b, COPPER = 0xa8653a;

// Which material each colour is drawn with.
const FINISH = {
  [WHITE]: 'paint', [DECK]: 'paint', [BLUE]: 'paint',
  [METAL]: 'metal', [ALUMINIUM]: 'metal', [COPPER]: 'metal',
  [DARK]: 'dark', [TREAD]: 'dark', [CABLE]: 'dark',
  [GOLD]: 'gold', [LENS]: 'lens',
};

const WHEEL_RADIUS = 0.2625, WHEEL_WIDTH = 0.28;
const TRACK = 1.1;                                  // wheel centre to rover centreline
const WHEEL_Z = { front: 1.12, middle: -0.02, rear: -1.08 };

function tint(geometry, hex) {
  const color = new THREE.Color(hex);
  const count = geometry.attributes.position.count;
  const data = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) { data[i * 3] = color.r; data[i * 3 + 1] = color.g; data[i * 3 + 2] = color.b; }
  geometry.setAttribute('color', new THREE.BufferAttribute(data, 3));
  geometry.userData.hex = hex;
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
  // Perseverance's 48 grousers are gently curved; two angled halves per cleat give the same chevron look.
  const cleats = 48;
  for (let c = 0; c < cleats; c++) {
    const angle = (c / cleats) * Math.PI * 2;
    for (const half of [-1, 1]) {
      const g = new THREE.BoxGeometry(WHEEL_WIDTH / 2, 0.02, 0.018);
      g.applyMatrix4(new THREE.Matrix4().makeRotationY(half * 0.18));
      g.applyMatrix4(new THREE.Matrix4().makeTranslation(half * WHEEL_WIDTH / 4, WHEEL_RADIUS + 0.008, 0));
      g.applyMatrix4(new THREE.Matrix4().makeRotationX(angle));
      parts.push(tint(g, TREAD));
    }
  }
  for (const edge of [-1, 1]) {                       // rolled rim edges
    const flange = new THREE.TorusGeometry(WHEEL_RADIUS - 0.004, 0.012, 6, 28).rotateY(Math.PI / 2);
    flange.translate(edge * WHEEL_WIDTH / 2, 0, 0);
    parts.push(tint(flange, ALUMINIUM));
  }
  const disc = new THREE.RingGeometry(0.1, WHEEL_RADIUS - 0.03, 24).rotateY(Math.PI / 2);
  parts.push(tint(disc.translate(-WHEEL_WIDTH * 0.3, 0, 0), DARK));
  // Six spokes, visible through the open wheel.
  for (let s = 0; s < 6; s++) {
    const g = new THREE.BoxGeometry(0.03, WHEEL_RADIUS * 2 - 0.02, 0.035);
    g.applyMatrix4(new THREE.Matrix4().makeRotationX((s / 6) * Math.PI));
    parts.push(tint(g, METAL));
  }
  return parts;
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

  // ---- added detail (2026-11-14) ----
  // Panel seams on the warm electronics box and the deck.
  for (const x of [-0.751, 0.751]) for (const z of [-0.5, 0.15, 0.7]) box(p, CABLE, 0.005, 0.4, 0.012, x, 0.9, z);
  for (const z of [-0.45, 0.3]) box(p, CABLE, 1.62, 0.006, 0.01, 0, 1.172, z);
  box(p, CABLE, 0.01, 0.006, 1.82, 0.25, 1.172, 0.02);
  // Front and rear hazard cameras: paired lenses under the deck edges.
  for (const x of [-0.4, -0.25, 0.25, 0.4]) {
    tube(p, METAL, [x, 0.78, 0.86], [x, 0.78, 0.92], 0.035, 10);
    tube(p, LENS, [x, 0.78, 0.92], [x, 0.78, 0.93], 0.026, 10);
  }
  for (const x of [-0.18, 0.18]) {
    tube(p, METAL, [x, 0.8, -0.82], [x, 0.8, -0.88], 0.032, 10);
    tube(p, LENS, [x, 0.8, -0.88], [x, 0.8, -0.89], 0.024, 10);
  }
  // Sample caching system: a box with a bit carousel on the front of the body.
  box(p, WHITE, 0.62, 0.34, 0.1, 0.3, 0.86, 0.88);
  tube(p, METAL, [0.3, 0.86, 0.93], [0.3, 0.86, 0.98], 0.13, 16);
  for (let b = 0; b < 8; b++) {
    const a = (b / 8) * Math.PI * 2;
    tube(p, DARK, [0.3 + Math.cos(a) * 0.09, 0.86 + Math.sin(a) * 0.09, 0.98], [0.3 + Math.cos(a) * 0.09, 0.86 + Math.sin(a) * 0.09, 1.0], 0.012, 6);
  }
  // Mast: pan joint, elevation hinge, MEDA wind sensor booms and a calibration target on the deck.
  tube(p, METAL, [mx, 1.97, mz], [mx, 2.0, mz], 0.07, 12);
  tube(p, DARK, [mx - 0.25, 2.08, mz], [mx + 0.25, 2.08, mz], 0.022, 8);
  for (const [dx, dz] of [[0.14, 0.12], [-0.12, -0.13]]) {
    tube(p, WHITE, [mx, 1.62, mz], [mx + dx * 2, 1.66, mz + dz * 2], 0.012, 6);
    box(p, DARK, 0.06, 0.05, 0.08, mx + dx * 2, 1.66, mz + dz * 2);
  }
  box(p, DECK, 0.16, 0.012, 0.16, -0.3, 1.18, 0.78);
  for (let i = 0; i < 4; i++) box(p, [GOLD, BLUE, COPPER, LENS][i], 0.05, 0.016, 0.05, -0.33 + (i % 2) * 0.06, 1.188, 0.75 + Math.floor(i / 2) * 0.06);
  // Cable harness along the mast and the arm.
  tube(p, CABLE, [mx + 0.05, 1.2, mz - 0.04], [mx + 0.05, 1.95, mz - 0.04], 0.012, 6);
  tube(p, CABLE, [0.55, 1.0, 0.98], [-0.25, 1.03, 1.08], 0.01, 6);
  // Arm turret instruments: PIXL, SHERLOC, WATSON, the coring drill and a contact sensor.
  tube(p, WHITE, [0.25, 0.8, 1.38], [0.25, 0.8, 1.42], 0.17, 16);
  tube(p, METAL, [0.38, 0.72, 1.42], [0.38, 0.72, 1.56], 0.045, 10);
  tube(p, WHITE, [0.12, 0.88, 1.42], [0.12, 0.88, 1.53], 0.05, 10);
  tube(p, LENS, [0.12, 0.88, 1.53], [0.12, 0.88, 1.54], 0.035, 10);
  tube(p, DARK, [0.25, 0.64, 1.38], [0.25, 0.42, 1.38], 0.03, 8);
  tube(p, METAL, [0.25, 0.42, 1.38], [0.25, 0.34, 1.38], 0.018, 8);
  tube(p, METAL, [0.35, 0.92, 1.38], [0.35, 1.0, 1.38], 0.02, 6);
  // Arm joints.
  for (const at of [[0.55, 0.95, 1.05], [-0.3, 0.98, 1.12], [0.25, 0.8, 1.22]]) {
    const joint = new THREE.SphereGeometry(0.06, 12, 8);
    joint.translate(...at);
    p.push(tint(joint, METAL));
  }
  // Gold thermal blanket on the RTG cover and the belly sides.
  box(p, GOLD, 0.02, 0.2, 1.4, 0.76, 0.72, 0.02);
  box(p, GOLD, 0.02, 0.2, 1.4, -0.76, 0.72, 0.02);
  // Rocker pivot hubs and bogie hinge discs.
  for (const s of [-1, 1]) {
    tube(p, METAL, [s * 0.83, 0.92, 0.2], [s * 0.9, 0.92, 0.2], 0.085, 14);
    tube(p, METAL, [s * 0.83, 0.56, -0.55], [s * 0.9, 0.56, -0.55], 0.065, 12);
  }

  return p;
}

// A survey pontoon boat that carries the rover across the lake. Not a piece of
// mission hardware: it is here so the lake can be explored too. Built like the
// aluminium pontoon workboats used for lake surveys: two pontoons with pointed
// noses, a plank deck, side rails, a bow ramp and an outboard motor whose
// propeller turns with speed. Units are rover metres; the deck top is at y = 0,
// where the wheels stand, and the bow points forward (+z).
export function createBoat() {
  const paint = [], metal = [], dark = [], wood = [], orange = [];
  const put = (list, g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1)));
    list.push(g.index ? g.toNonIndexed() : g);
  };
  const LEN = 6.4, HALF = LEN / 2, PX = 1.62, PR = 0.42, PY = -0.62;

  for (const s of [-1, 1]) {
    // Pontoon: a tube with a pointed nose and a rounded tail, plus a keel strake and an orange band.
    put(paint, new THREE.CylinderGeometry(PR, PR, LEN - 1.3, 20), s * PX, PY, -0.25, Math.PI / 2);
    put(paint, new THREE.ConeGeometry(PR, 1.3, 20), s * PX, PY, HALF - 0.25 + 0.4, Math.PI / 2);
    put(paint, new THREE.SphereGeometry(PR, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), s * PX, PY, -HALF + 0.4, -Math.PI / 2);
    put(orange, new THREE.CylinderGeometry(PR + 0.012, PR + 0.012, LEN - 1.4, 20, 1, true), s * PX, PY + 0.02, -0.25, Math.PI / 2);
    put(metal, new THREE.BoxGeometry(0.05, 0.08, LEN - 1.2), s * PX, PY - PR - 0.02, -0.2);
    // Brackets that tie the pontoon to the deck frame.
    for (const z of [-2.3, -0.8, 0.7, 2.0]) put(metal, new THREE.BoxGeometry(0.12, 0.42, 0.12), s * PX, -0.24, z);
    // Side rail: posts and a top tube; the stern half stays open for the motor.
    for (const z of [-2.2, -1.1, 0, 1.1, 2.2]) put(metal, new THREE.CylinderGeometry(0.03, 0.03, 0.62, 8), s * 2.02, 0.31, z);
    put(metal, new THREE.CylinderGeometry(0.035, 0.035, 4.5, 8), s * 2.02, 0.62, 0, Math.PI / 2);
    put(metal, new THREE.CylinderGeometry(0.03, 0.03, 4.5, 8), s * 2.02, 0.32, 0, Math.PI / 2);
    // Fenders and a cleat.
    for (const z of [-1.6, 0.4]) put(dark, new THREE.CylinderGeometry(0.11, 0.11, 0.42, 10), s * 2.16, -0.05, z);
    put(metal, new THREE.BoxGeometry(0.08, 0.06, 0.3), s * 1.9, 0.04, 2.55);
  }

  // Deck: cross beams under a run of planks with gaps between them.
  for (const z of [-2.5, -1.25, 0, 1.25, 2.5]) put(metal, new THREE.BoxGeometry(4.1, 0.12, 0.16), 0, -0.18, z);
  const planks = 16;
  for (let i = 0; i < planks; i++) {
    const z = -2.75 + (i + 0.5) * (5.5 / planks);
    put(wood, new THREE.BoxGeometry(4.0, 0.08, 5.5 / planks - 0.035), 0, -0.04, z);
  }
  put(dark, new THREE.BoxGeometry(4.12, 0.1, 0.1), 0, -0.04, 2.8);                 // bow and stern edges
  put(dark, new THREE.BoxGeometry(4.12, 0.1, 0.1), 0, -0.04, -2.8);
  // Wheel chocks so the rover stays put, and a hinged bow ramp.
  for (const x of [-1.1, 1.1]) put(orange, new THREE.BoxGeometry(0.34, 0.12, 0.18), x, 0.06, 1.42);
  put(metal, new THREE.BoxGeometry(2.6, 0.06, 0.9), 0, -0.12, 3.18, 0.32);
  for (let i = 0; i < 5; i++) put(dark, new THREE.BoxGeometry(2.5, 0.02, 0.05), 0, -0.07 - i * 0.055, 2.86 + i * 0.16, 0.32);
  // Stern: transom plate, motor mount and a navigation light pole.
  put(metal, new THREE.BoxGeometry(1.1, 0.5, 0.08), 0, -0.2, -2.86);
  put(metal, new THREE.CylinderGeometry(0.025, 0.025, 1.2, 8), 1.7, 0.6, -2.7);
  put(paint, new THREE.SphereGeometry(0.07, 10, 8), 1.7, 1.24, -2.7);

  const group = new THREE.Group();
  const mesh = (list, material) => {
    const m = new THREE.Mesh(mergeGeometries(list), material);
    m.castShadow = true; m.receiveShadow = true;
    group.add(m);
  };
  mesh(paint, new THREE.MeshStandardMaterial({ color: 0xe8e6e0, roughness: 0.45, metalness: 0.2 }));
  mesh(metal, new THREE.MeshStandardMaterial({ color: 0xa9adb3, roughness: 0.35, metalness: 0.75 }));
  mesh(dark, new THREE.MeshStandardMaterial({ color: 0x2c2f34, roughness: 0.8, metalness: 0.1 }));
  mesh(wood, new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.85, metalness: 0 }));
  mesh(orange, new THREE.MeshStandardMaterial({ color: 0xd2541c, roughness: 0.55, metalness: 0.05 }));

  // Outboard motor: cowling, shaft and a propeller that spins with speed.
  const motor = new THREE.Group();
  motor.position.set(0, 0.05, -3.05);
  const cowl = new THREE.MeshStandardMaterial({ color: 0x23262b, roughness: 0.4, metalness: 0.3 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x9ea3aa, roughness: 0.3, metalness: 0.8 });
  const add = (geometry, material, x, y, z, rx = 0) => {
    const m = new THREE.Mesh(geometry, material); m.position.set(x, y, z); m.rotation.x = rx; m.castShadow = true; motor.add(m); return m;
  };
  add(new THREE.BoxGeometry(0.46, 0.55, 0.62), cowl, 0, 0.32, -0.12);
  add(new THREE.CylinderGeometry(0.24, 0.24, 0.46, 14), cowl, 0, 0.6, -0.12, 0).scale.set(1, 0.35, 1.25);
  add(new THREE.BoxGeometry(0.14, 1.0, 0.2), steel, 0, -0.45, -0.18);
  add(new THREE.BoxGeometry(0.5, 0.03, 0.34), steel, 0, -0.62, -0.18);              // cavitation plate
  add(new THREE.CylinderGeometry(0.09, 0.07, 0.42, 12), steel, 0, -0.92, -0.2, Math.PI / 2);
  const propeller = new THREE.Group();
  propeller.position.set(0, -0.92, -0.45);
  for (let b = 0; b < 3; b++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.02), steel);
    blade.position.y = 0.16; blade.rotation.y = 0.5;
    const arm = new THREE.Group(); arm.rotation.z = (b / 3) * Math.PI * 2; arm.add(blade);
    propeller.add(arm);
  }
  motor.add(propeller);
  add(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 6), steel, 0, 0.4, 0.38, -1.2);     // tiller
  group.add(motor);

  // Wake: two soft foam strips that trail behind the pontoons and grow with speed.
  const foam = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
  const wake = new THREE.Group();
  for (const s of [-1, 1, 0]) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(s === 0 ? 0.9 : 0.55, 6).rotateX(-Math.PI / 2), foam);
    strip.position.set(s * PX, PY + PR * 0.55, -HALF - 3 + (s === 0 ? -0.6 : 0));
    strip.rotation.y = s * 0.08;
    wake.add(strip);
  }
  group.add(wake);

  group.visible = false;
  let spin = 0;
  return {
    object: group,
    // speed in rover metres per second (negative when reversing), dt in seconds
    update(speed, dt, clock) {
      spin += speed * dt * 3;
      propeller.rotation.z = spin;
      motor.rotation.y = Math.sin(clock * 0.9) * 0.03;
      foam.opacity = Math.min(0.55, Math.abs(speed) * 0.07);
      wake.scale.z = 0.4 + Math.min(1.2, Math.abs(speed) * 0.08);
    },
  };
}

export function createRover() {
  const MATERIALS = {
    paint: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide }),
    metal: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.85, side: THREE.DoubleSide }),
    dark: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.2, side: THREE.DoubleSide }),
    gold: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.28, metalness: 1.0, side: THREE.DoubleSide }),
    lens: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.05, metalness: 0.6, side: THREE.DoubleSide }),
  };
  // Merge the parts of each finish into one geometry, so the rover stays a handful of draw calls.
  const byFinish = (parts) => {
    const groups = {};
    for (const g of parts) (groups[FINISH[g.userData.hex] || 'paint'] ||= []).push(g.index ? g.toNonIndexed() : g);
    return Object.entries(groups).map(([finish, list]) => [mergeGeometries(list), MATERIALS[finish]]);
  };
  const root = new THREE.Group();
  for (const [geometry, material] of byFinish(bodyGeometry())) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true; mesh.receiveShadow = true;
    root.add(mesh);
  }

  const wheelParts = byFinish(wheelGeometry());
  const wheels = [];      // spin about x
  const steered = [];     // turn about y; sign flips for the rear pair
  for (const s of [-1, 1]) {
    for (const [name, z] of Object.entries(WHEEL_Z)) {
      const pivot = new THREE.Group();
      pivot.position.set(s * TRACK, WHEEL_RADIUS, z);
      const wheel = new THREE.Group();
      for (const [geometry, material] of wheelParts) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        wheel.add(mesh);
      }
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
