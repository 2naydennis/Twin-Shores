// Drive a rover across Lake Salda (Earth) and Jezero Crater (Mars).
// AI-generated: written by Claude (Anthropic, Claude Code) on 2026-11-14. Review before use.

import * as THREE from 'three';
import { WORLD, loadSites, buildTerrain } from './terrain.js';
import { createRover, createBoat } from './rover-model.js';
import { loadFacts, createGame } from './game.js';

const TERRAIN_URL = new URL('./terrain', import.meta.url).href;
const ROVER_SCALE = 4;              // scene units per rover metre: a 3 m rover is drawn 12 units long
const SPEED_STEP = 14;              // scene units per second for each step of the speed slider
const TURN_RATE = 1.5;              // radians per second
const BOAT_LIFT = 1.9;              // scene units the rover rides above the lake when on its boat

// Where the rover starts. Jezero: near Perseverance's landing site (Octavia E.
// Butler Landing). Coordinates entered by the AI from memory; check before citing.
const START = {
  jezero: { lat: 18.4447, lon: 77.4508, heading: 2.2 },
  salda: { shoreWalk: [0, 1], heading: 2.2 },  // walk south from the lake centre to the shore
};

const $ = (id) => document.getElementById(id);
const ui = {
  status: $('status'), site: $('site-name'), place: $('site-place'), width: $('fact-width'),
  relief: $('fact-relief'), cell: $('fact-cell'), data: $('fact-data'), toggle: $('switch'),
  speed: $('speed'), speedValue: $('speed-value'), lat: $('lat'), lon: $('lon'),
  elevation: $('elevation'), fps: $('fps'), roverScale: $('rover-scale'),
};
const gameUi = {
  found: $('found'), nearest: $('nearest'), arrow: $('arrow'), card: $('fact'), kicker: $('fact-kicker'),
  title: $('fact-title'), text: $('fact-text'), other: $('fact-other'), match: $('fact-match'),
  matchValue: $('fact-match-value'), matchBar: $('fact-match-bar'), source: $('fact-source'),
  done: $('fact-done'), close: $('fact-close'),
};
let game = null;                    // the fact hunt; stays null if the data cannot be loaded

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xffffff, 700, 2700);
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 4500);
const skyLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.position.set(-0.55, 0.75, 0.35);
scene.add(skyLight, sun);

const rover = createRover();
rover.object.scale.setScalar(ROVER_SCALE);
rover.object.rotation.order = 'YXZ';
const shadow = new THREE.Mesh(
  new THREE.CircleGeometry(1.9, 20).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
shadow.position.y = 0.03;
rover.object.add(shadow);
const boat = createBoat();
rover.object.add(boat);
scene.add(rover.object);

const terrains = {};                // id -> terrain
const saved = {};                   // id -> { x, z, heading }
let active = null;
const state = { x: 0, z: 0, heading: 0, speed: 0, pitch: 0, roll: 0, afloat: 0, clock: 0 };
const view = { yaw: 0, pitch: 0.36, distance: 70, heading: 0, snap: true };
const keys = new Set();

function startFor(terrain) {
  const start = START[terrain.site.id];
  if (start.lat !== undefined) return { ...terrain.toScene(start.lat, start.lon), heading: start.heading };
  let x = 0, z = 0;
  const step = WORLD / (terrain.site.grid - 1);
  while (terrain.isWater(x, z) && terrain.inside(x, z)) { x += start.shoreWalk[0] * step; z += start.shoreWalk[1] * step; }
  return { x: x + start.shoreWalk[0] * step * 3, z: z + start.shoreWalk[1] * step * 3, heading: start.heading };
}

function show(id) {
  if (active) {
    saved[active.site.id] = { x: state.x, z: state.z, heading: state.heading };
    active.group.visible = false;
  }
  active = terrains[id];
  active.group.visible = true;
  Object.assign(state, saved[id] || startFor(active), { speed: 0 });
  view.snap = true;

  const { look, site } = active;
  scene.background = new THREE.Color(look.sky);
  scene.fog.color.set(look.fog);
  sun.color.set(look.sun); sun.intensity = look.sunStrength;
  skyLight.color.set(look.skyLight); skyLight.groundColor.set(look.groundLight); skyLight.intensity = look.ambient;

  const other = Object.values(terrains).find((t) => t !== active).site;
  ui.site.textContent = site.name;
  ui.place.textContent = site.place;
  ui.width.textContent = `${site.width_km} km across`;
  ui.relief.textContent = `Heights drawn ${look.exaggeration}× taller than real`;
  ui.cell.textContent = `One elevation reading every ${Math.round(site.source_cell_m)} m`;
  ui.data.textContent = site.dataset;
  ui.data.href = site.url;
  ui.toggle.textContent = `Switch to ${other.name}`;
  ui.toggle.dataset.target = other.id;
  ui.roverScale.textContent = Math.round((ROVER_SCALE * active.metresPerUnit));
  if (game) game.setSite(id);
  document.body.dataset.site = id;
}

function drive(dt) {
  const forward = (keys.has('up') ? 1 : 0) - (keys.has('down') ? 1 : 0);
  const turn = (keys.has('left') ? 1 : 0) - (keys.has('right') ? 1 : 0);
  const top = Number(ui.speed.value) * SPEED_STEP;
  const wanted = forward > 0 ? top : forward < 0 ? -top * 0.5 : 0;
  state.speed += (wanted - state.speed) * Math.min(1, dt * 3.5);
  if (Math.abs(state.speed) < 0.05 && !forward) state.speed = 0;
  state.heading += turn * TURN_RATE * dt * (state.speed < -1 ? -1 : 1);

  const step = state.speed * dt;
  const x = state.x + Math.sin(state.heading) * step;
  const z = state.z + Math.cos(state.heading) * step;
  let moved = 0;
  if (active.inside(x, z)) { state.x = x; state.z = z; moved = step; }
  else state.speed = 0;                                // the map edge stops the rover

  // On the lake a boat pops up under the rover; afloat runs from 0 (land) to 1 (boat fully out).
  const onWater = active.isWater(state.x, state.z);
  state.afloat += ((onWater ? 1 : 0) - state.afloat) * Math.min(1, dt * 7);
  state.clock += dt;
  boat.visible = state.afloat > 0.02;
  boat.scale.setScalar(Math.max(0.001, state.afloat));
  shadow.visible = state.afloat < 0.5;

  // Sit the rover on the ground and tilt it to match the slope under its wheels.
  const sin = Math.sin(state.heading), cos = Math.cos(state.heading);
  const halfLength = (rover.length / 2) * ROVER_SCALE, halfWidth = (rover.width / 2) * ROVER_SCALE;
  const front = active.heightAt(state.x + sin * halfLength, state.z + cos * halfLength);
  const back = active.heightAt(state.x - sin * halfLength, state.z - cos * halfLength);
  const left = active.heightAt(state.x + cos * halfWidth, state.z - sin * halfWidth);
  const right = active.heightAt(state.x - cos * halfWidth, state.z + sin * halfWidth);
  const ease = Math.min(1, dt * 8);
  // Afloat, the rover stays level apart from a gentle bob; on land it follows the slope.
  const land = 1 - state.afloat;
  const bobPitch = Math.sin(state.clock * 1.7) * 0.02, bobRoll = Math.sin(state.clock * 1.3) * 0.03;
  state.pitch += (Math.atan2(front - back, halfLength * 2) * land + bobPitch * state.afloat - state.pitch) * ease;
  state.roll += (Math.atan2(left - right, halfWidth * 2) * land + bobRoll * state.afloat - state.roll) * ease;
  const ground = onWater ? active.heightAt(state.x, state.z) : (front + back + left + right) / 4;
  rover.object.position.set(state.x, ground + state.afloat * BOAT_LIFT, state.z);
  rover.object.rotation.set(-state.pitch, state.heading, state.roll);
  rover.animate((moved / ROVER_SCALE) * land, turn);
}

const target = new THREE.Vector3(), wantedCamera = new THREE.Vector3();
function follow(dt) {
  // The camera swings round behind the rover, a little late, so turns feel smooth.
  let gap = state.heading - view.heading;
  gap = Math.atan2(Math.sin(gap), Math.cos(gap));
  view.heading += view.snap ? gap : gap * Math.min(1, dt * 2.5);
  const angle = view.heading + view.yaw;
  const flat = Math.cos(view.pitch) * view.distance;
  target.copy(rover.object.position).y += 5;
  wantedCamera.set(target.x - Math.sin(angle) * flat, target.y + Math.sin(view.pitch) * view.distance, target.z - Math.cos(angle) * flat);
  wantedCamera.y = Math.max(wantedCamera.y, active.heightAt(wantedCamera.x, wantedCamera.z) + 4);
  if (view.snap) camera.position.copy(wantedCamera); else camera.position.lerp(wantedCamera, Math.min(1, dt * 6));
  view.snap = false;
  camera.lookAt(target);
}

let last = performance.now(), frameMs = 16, sinceReadout = 0, slowFor = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (document.hidden || !active) { last = now; return; }
  const elapsed = now - last;
  last = now;
  const dt = Math.min(elapsed / 1000, 0.05);
  drive(dt);
  if (game) game.update(dt, state);
  follow(dt);
  renderer.render(scene, camera);

  // If the machine cannot keep up, render fewer pixels instead of dropping frames.
  frameMs += (elapsed - frameMs) * 0.05;
  // Below about 38 fps drop to one pixel per screen pixel; below 25 fps go under that.
  const floor = frameMs > 40 ? 0.75 : 1;
  slowFor = frameMs > 26 && pixelRatio > floor ? slowFor + elapsed : 0;
  if (slowFor > 2500) {
    pixelRatio = Math.max(floor, pixelRatio - 0.25);
    renderer.setPixelRatio(pixelRatio);
    slowFor = 0;
  }

  sinceReadout += elapsed;
  if (sinceReadout > 150) {
    sinceReadout = 0;
    const { lat, lon } = active.latLon(state.x, state.z);
    ui.lat.textContent = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
    ui.lon.textContent = `${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;
    ui.elevation.textContent = `${Math.round(active.elevationAt(state.x, state.z)).toLocaleString('en')} m`;
    ui.fps.textContent = `${Math.round(1000 / frameMs)} fps`;
  }
}

// ---- input -----------------------------------------------------------------

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
};
window.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement && !event.code.startsWith('Key')) return;   // let arrows move the slider
  if (KEYMAP[event.code]) { keys.add(KEYMAP[event.code]); event.preventDefault(); }
  if (event.code === 'KeyR' && active) { Object.assign(state, startFor(active), { speed: 0 }); view.snap = true; view.yaw = 0; }
});
window.addEventListener('keyup', (event) => { if (KEYMAP[event.code]) keys.delete(KEYMAP[event.code]); });
window.addEventListener('blur', () => keys.clear());

for (const button of document.querySelectorAll('[data-drive]')) {
  const name = button.dataset.drive;
  const release = () => keys.delete(name);
  button.addEventListener('pointerdown', (event) => { keys.add(name); button.setPointerCapture(event.pointerId); event.preventDefault(); });
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
}

const canvas = renderer.domElement;
let dragging = null;
canvas.addEventListener('pointerdown', (event) => { dragging = { x: event.clientX, y: event.clientY }; canvas.setPointerCapture(event.pointerId); });
canvas.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  view.yaw -= (event.clientX - dragging.x) * 0.006;
  view.pitch = THREE.MathUtils.clamp(view.pitch + (event.clientY - dragging.y) * 0.004, 0.06, 1.35);
  dragging = { x: event.clientX, y: event.clientY };
});
canvas.addEventListener('pointerup', () => { dragging = null; });
canvas.addEventListener('pointercancel', () => { dragging = null; });
canvas.addEventListener('wheel', (event) => {
  view.distance = THREE.MathUtils.clamp(view.distance * (event.deltaY > 0 ? 1.12 : 0.89), 28, 900);
  event.preventDefault();
}, { passive: false });

ui.toggle.addEventListener('click', () => { if (ui.toggle.dataset.target) show(ui.toggle.dataset.target); ui.toggle.blur(); });
const showSpeed = () => { ui.speedValue.textContent = `${ui.speed.value}×`; };
ui.speed.addEventListener('input', showSpeed);
showSpeed();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---- start -----------------------------------------------------------------

// Add ?debug to the address to reach the renderer from the browser console.
if (new URLSearchParams(location.search).has('debug')) window.roverDebug = { renderer, scene, camera, state, view, terrains };

try {
  const sites = await loadSites(TERRAIN_URL);
  const built = await Promise.all(sites.map((site) => buildTerrain(site, TERRAIN_URL)));
  for (const terrain of built) {
    terrain.group.visible = false;
    scene.add(terrain.group);
    terrains[terrain.site.id] = terrain;
  }
  // The fact hunt needs data/analogs.json. Without it the page still works as a plain drive.
  try {
    game = createGame(scene, terrains, await loadFacts(), gameUi);
  } catch (error) {
    console.warn('Fact hunt switched off:', error);
    for (const node of document.querySelectorAll('.game-only')) node.hidden = true;
  }
  show('salda');
  ui.status.hidden = true;
  requestAnimationFrame(frame);
} catch (error) {
  console.error(error);
  ui.status.textContent = `Could not load the terrain: ${error.message}. Open this page through a web server, not as a file.`;
}
