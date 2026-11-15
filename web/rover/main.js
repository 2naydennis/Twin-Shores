// Drive a rover across Lake Salda (Earth) and Jezero Crater (Mars).
// AI-generated: written by Claude (Anthropic, Claude Code) on 2026-11-14. Review before use.

import * as THREE from 'three';
import { WORLD, loadSites, buildTerrain } from './terrain.js';
import { createRover, createBoat } from './rover-model.js';
import { loadFacts, createGame } from './game.js?v=1115d';
import { createSky, createScatter, setScatterDensity } from './scenery.js';
import { createMinimap } from './minimap.js';

const TERRAIN_URL = new URL('./terrain', import.meta.url).href;
const ROVER_SCALE = 4;              // scene units per rover metre: a 3 m rover is drawn 12 units long
const SPEED_STEP = 14;              // scene units per second for each step of the speed slider
const TURN_RATE = 1.5;              // radians per second
const BOAT_LIFT = 1.9;              // scene units the rover's wheels ride above the lake on the boat deck

// Where the rover starts. Jezero: near Perseverance's landing site (Octavia E.
// Butler Landing). Coordinates entered by the AI from memory; check before citing.
const START = {
  jezero: { lat: 18.4447, lon: 77.4508, heading: 2.2 },
  salda: { shoreWalk: [0, 1], heading: 2.2 },  // walk south from the lake centre to the shore
  van: { lake: 1, shoreWalk: [-1, 0], heading: Math.PI / 2 },  // walk west from Lake Erçek's centre to its shore, face the lake
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
const minimap = $('minimap-canvas') ? createMinimap($('minimap-canvas'), $('minimap-caption')) : null;
const drawMinimap = () => {
  if (!minimap || !active) return;
  const alternative = (active.ancient && active.ancient.amount > 0.5) || (active.future && active.future.amount > 0.5);
  minimap.draw(state, game ? game.points() : [], !!alternative);
};
// The falling-lake scenario for Lake Salda: a what-if, driven by a slider, never a forecast.
const futureUi = { box: $('future'), button: $('future-toggle'), note: $('future-note'), badge: $('future-badge'),
  drop: $('drop'), dropValue: $('drop-value'), badgeDrop: $('badge-drop'), area: $('f-area'), lost: $('f-lost'), retreat: $('f-retreat') };
let futureTarget = 0;               // 0 = the lake today, 1 = the level has fallen by the slider's amount
const eraUi = { box: $('era'), button: $('terraform'), note: $('sim'), badge: $('sim-badge'), level: $('sim-level'), area: $('sim-area') };
const FLOOD_SECONDS = 3.5;          // how long the ancient lake takes to fill or drain
let eraTarget = 0;                  // 0 = Mars today, 1 = the "Terraform" view of ancient Jezero

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
// Graphics detail. High: sun shadows, all rocks and trees. Low: no shadows, a third of the
// scenery, one pixel per screen pixel. Touch devices and machines with few cores start on Low.
const weakDevice = matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4;
const detail = { level: weakDevice ? 'low' : 'high', autoLowered: false };
const scatters = [];
renderer.setPixelRatio(pixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color();
scene.fog = new THREE.Fog(0xffffff, 700, 2700);
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 4500);
const skyLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
const sun = new THREE.DirectionalLight(0xffffff, 2);
const SUN_DIRECTION = new THREE.Vector3(-0.55, 0.75, 0.35).normalize();
sun.position.copy(SUN_DIRECTION);
// A shadow box that travels with the rover: sharp shadows nearby, none far away.
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -140, right: 140, top: 140, bottom: -140, near: 10, far: 1600 });
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.6;
scene.add(skyLight, sun, sun.target);
const skies = {};                   // id -> sky dome
const pmrem = new THREE.PMREMGenerator(renderer);
const environments = {};            // id -> reflection map made from that site's sky

const rover = createRover();
rover.object.scale.setScalar(ROVER_SCALE);
rover.object.rotation.order = 'YXZ';
const shadow = new THREE.Mesh(
  new THREE.CircleGeometry(1.9, 20).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.14, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
shadow.position.y = 0.03;
rover.object.add(shadow);
const boat = createBoat();
rover.object.add(boat.object);
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
  let { x, z } = start.lake !== undefined ? terrain.toScene(terrain.site.lakes[start.lake].lat, terrain.site.lakes[start.lake].lon) : { x: 0, z: 0 };
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
  const firstVisit = !saved[id];
  Object.assign(state, saved[id] || startFor(active), { speed: 0 });
  view.snap = true;

  const { look, site } = active;
  for (const [key, dome] of Object.entries(skies)) dome.visible = key === id;
  scene.environment = environments[id] || null;
  applyLook();
  showEra();
  showFuture();

  const CAVEAT = {
    salda: "Lake Salda matches Jezero's ancient lake and carbonate setting, not Mars as a whole.",
    van: 'Two closed-basin soda lakes, pH about 9.7: candidates from our search, not analogs NASA lists. Van (west) has carbonate microbialite towers; Erçek (east) is little studied.',
    jezero: "Jezero once held a lake; today it is dry, cold and under 1% of Earth's air pressure.",
  };
  if ($('site-caveat')) $('site-caveat').textContent = CAVEAT[id] || '';
  ui.site.textContent = site.name;
  ui.place.textContent = site.place;
  ui.width.textContent = `${site.width_km} km across`;
  ui.relief.textContent = `Heights drawn ${look.exaggeration}× taller than real`;
  ui.cell.textContent = `One elevation reading every ${Math.round(site.source_cell_m)} m`;
  ui.data.textContent = site.dataset;
  ui.data.href = site.url;
  ui.toggle.value = id;
  ui.roverScale.textContent = Math.round((ROVER_SCALE * active.metresPerUnit));
  if (game) {
    game.setSite(id);
    game.refresh();
    // On a first visit, point the rover at the nearest beacon so the game is obvious.
    const heading = firstVisit ? game.headingToNearest(state.x, state.z) : null;
    if (heading !== null) state.heading = heading;
  }
  document.body.dataset.site = id;
  if (minimap) { minimap.setTerrain(active); drawMinimap(); }
}

// Sky, fog and light for the active site. Where a site has an ancient view,
// blend towards it by how far the lake has filled.
const shade = new THREE.Color(), shadeTo = new THREE.Color();
function applyLook() {
  const { look } = active;
  const old = active.ancient ? look.ancient : null;
  const t = old ? active.ancient.amount : 0;
  const blend = (now, then) => shade.set(now).lerp(shadeTo.set(old ? then : now), t);
  const between = (now, then) => now + ((old ? then : now) - now) * t;
  scene.background.copy(blend(look.sky, old && old.sky));
  // The gradient sky dome has its own three colours; keep the originals so the view can be undone.
  const dome = skies[active.site.id];
  if (dome && old && old.dome) {
    const colours = dome.material.uniforms;
    dome.userData.today ??= { top: colours.top.value.clone(), horizon: colours.horizon.value.clone(), ground: colours.ground.value.clone() };
    for (const key of ['top', 'horizon', 'ground']) {
      colours[key].value.copy(dome.userData.today[key]).lerp(shadeTo.set(old.dome[key]), t);
    }
  }
  scene.fog.color.copy(blend(look.fog, old && old.fog));
  sun.color.copy(blend(look.sun, old && old.sun));
  skyLight.color.copy(blend(look.skyLight, old && old.skyLight));
  skyLight.groundColor.copy(blend(look.groundLight, old && old.groundLight));
  sun.intensity = between(look.sunStrength, old && old.sunStrength);
  skyLight.intensity = between(look.ambient, old && old.ambient);
}

// The Terraform button and its notice exist only on a site with an ancient view.
function showEra() {
  const old = active.ancient;
  const on = !!old && eraTarget === 1;
  // The button shows on every map: elsewhere it jumps to Jezero and fills the lake.
  eraUi.box.hidden = false;
  eraUi.note.hidden = eraUi.badge.hidden = !on;
  eraUi.button.setAttribute('aria-pressed', String(on));
  const [title, sub, arrow] = on
    ? ['Back to Mars today', 'Drain the lake and return to the dry crater', '↺']
    : old ? ['See Jezero 3.5 billion years ago', 'Fill the crater with its ancient lake', '→']
      : ['Jump to ancient Jezero', 'See the Mars crater as a lake, 3.5 billion years ago', '→'];
  const tag = Object.assign(document.createElement('span'), { className: 't-tag', textContent: 'Simulation' });
  eraUi.button.replaceChildren(
    Object.assign(document.createElement('span'), { className: 't-title', textContent: title }),
    Object.assign(document.createElement('span'), { className: 't-sub', textContent: sub }),
    Object.assign(document.createElement('span'), { className: 't-arrow', textContent: arrow }));
  if (!on) eraUi.button.firstChild.append(tag);
  if (old) {
    eraUi.level.textContent = `${old.level_m.toLocaleString('en')} m`;
    eraUi.area.textContent = `${old.area_km2.toLocaleString('en')} km²`;
  }
  document.body.dataset.era = on ? 'ancient' : 'today';
  if (game) game.setEra(on);
}

// Fill or drain the ancient lake a little each frame until it reaches the chosen state.
function flood(dt) {
  const old = active.ancient;
  if (!old || old.amount === eraTarget) return;
  const step = dt / FLOOD_SECONDS;
  old.set(eraTarget > old.amount ? Math.min(1, old.amount + step) : Math.max(0, old.amount - step));
  applyLook();
  if (game) game.refresh();
}

// The falling-lake button, slider and figures exist only on a site with a `future` scenario.
function showFuture() {
  const scenario = active.future;
  if (!futureUi.box) return;
  const on = !!scenario && futureTarget === 1;
  futureUi.box.hidden = !scenario;
  futureUi.note.hidden = futureUi.badge.hidden = !on;
  futureUi.button.setAttribute('aria-pressed', String(on));
  futureUi.button.querySelector('.t-title').textContent = on ? 'Back to the lake today' : 'See Lake Salda if its water keeps falling';
  futureUi.button.querySelector('.t-sub').textContent = on ? 'Refill to the level NASA measured' : 'A what-if scenario, not a forecast';
  if (!scenario) return;
  const drop = Number(futureUi.drop.value);
  const s = scenario.stats(drop);
  futureUi.dropValue.textContent = `${drop} m`;
  futureUi.badgeDrop.textContent = drop;
  futureUi.area.textContent = `${s.area_then_km2.toFixed(1)} km²`;
  futureUi.lost.textContent = `${(s.area_today_km2 - s.area_then_km2).toFixed(1)} km² (${Math.round((1 - s.area_then_km2 / s.area_today_km2) * 100)}%)`;
  futureUi.retreat.textContent = `${Math.round(s.retreat_m / 10) * 10} m`;
}

// Lower or refill the lake a little each frame until it reaches the chosen state.
function recede(dt) {
  const scenario = active.future;
  if (!scenario) return;
  const drop = Number(futureUi.drop.value);
  if (scenario.amount === futureTarget && (scenario.drop_m === drop || scenario.amount === 0)) return;
  const step = dt / FLOOD_SECONDS;
  scenario.set(futureTarget > scenario.amount ? Math.min(1, scenario.amount + step) : Math.max(0, scenario.amount - step), drop);
  if (game) game.refresh();
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
  // The boat rises from under the water as the rover rolls onto the lake, and sinks away on the far shore.
  boat.object.visible = state.afloat > 0.02;
  boat.object.position.y = (state.afloat - 1) * 1.4;
  boat.update(state.speed / ROVER_SCALE, dt, state.clock);
  shadow.visible = state.afloat < 0.5;
  if (active.water) {                                  // ripples drift across the lake
    const ripples = active.water.material.normalMap;
    ripples.offset.x = (state.clock * 0.004) % 1;
    ripples.offset.y = (state.clock * 0.0025) % 1;
  }

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
  const ground = onWater ? active.surfaceAt(state.x, state.z) : (front + back + left + right) / 4;
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
  wantedCamera.y = Math.max(wantedCamera.y, active.surfaceAt(wantedCamera.x, wantedCamera.z) + 4);
  if (view.snap) camera.position.copy(wantedCamera); else camera.position.lerp(wantedCamera, Math.min(1, dt * 6));
  view.snap = false;
  camera.lookAt(target);
  // Keep the sky round the camera and the sun's shadow box centred on the rover.
  for (const dome of Object.values(skies)) dome.position.copy(camera.position);
  sun.target.position.copy(rover.object.position);
  sun.position.copy(rover.object.position).addScaledVector(SUN_DIRECTION, 700);
}

let last = performance.now(), frameMs = 16, sinceReadout = 0, slowFor = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (document.hidden || !active) { last = now; return; }
  const elapsed = now - last;
  last = now;
  const dt = Math.min(elapsed / 1000, 0.05);
  flood(dt);
  recede(dt);
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
  // Still slow at High after a few seconds: drop to Low once, and say so on the button.
  if (detail.level === 'high' && !detail.autoLowered && frameMs > 40 && state.clock > 4) {
    detail.autoLowered = true;
    setDetail('low', 'switched to Low because the page ran slowly');
  }

  sinceReadout += elapsed;
  if (sinceReadout > 150) {
    sinceReadout = 0;
    const { lat, lon } = active.latLon(state.x, state.z);
    ui.lat.textContent = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
    ui.lon.textContent = `${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;
    ui.elevation.textContent = `${Math.round(active.elevationAt(state.x, state.z)).toLocaleString('en')} m`;
    ui.fps.textContent = `${Math.round(1000 / frameMs)} fps`;
    drawMinimap();
  }
}

function setDetail(level, reason) {
  detail.level = level;
  const high = level === 'high';
  sun.castShadow = high;
  for (const scatter of scatters) setScatterDensity(scatter, high ? 1 : 0.33);
  if (!high) { pixelRatio = 1; renderer.setPixelRatio(1); }
  else { pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5); renderer.setPixelRatio(pixelRatio); }
  const button = $('detail');
  if (button) {
    button.textContent = `Graphics: ${high ? 'High' : 'Low'}`;
    button.title = reason || (high ? 'Shadows and full scenery. Click for Low.' : 'No shadows, less scenery. Click for High.');
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

$('detail')?.addEventListener('click', (event) => { setDetail(detail.level === 'high' ? 'low' : 'high'); event.currentTarget.blur(); });
ui.toggle.addEventListener('change', () => { show(ui.toggle.value); ui.toggle.blur(); });
eraUi.button.addEventListener('click', () => {
  if (!active.ancient) {                               // on Earth: go to Jezero and fill the lake there
    eraTarget = 1;
    show('jezero');
  } else {
    eraTarget = eraTarget ? 0 : 1;
    showEra();
  }
  eraUi.button.blur();
});
if (futureUi.button) {
  futureUi.button.addEventListener('click', () => { futureTarget = futureTarget ? 0 : 1; showFuture(); futureUi.button.blur(); });
  futureUi.drop.addEventListener('input', showFuture);
}
// Phones: one button clears the panels off the view and brings them back.
const uiToggle = $('ui-toggle');
if (uiToggle) {
  uiToggle.addEventListener('click', () => {
    const bare = document.body.classList.toggle('bare');
    uiToggle.setAttribute('aria-pressed', String(bare));
    uiToggle.textContent = bare ? 'Show panels' : 'Hide panels';
    uiToggle.blur();
  });
}
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
if (new URLSearchParams(location.search).has('debug')) window.roverDebug = { renderer, scene, camera, state, view, terrains, applyLook, refresh: () => game && game.refresh(), game: () => game };

try {
  const sites = await loadSites(TERRAIN_URL);
  const built = await Promise.all(sites.map((site) => buildTerrain(site, TERRAIN_URL)));
  for (const terrain of built) {
    terrain.group.visible = false;
    const scatter = createScatter(terrain);
    scatters.push(scatter);
    terrain.group.add(scatter);
    scene.add(terrain.group);
    terrains[terrain.site.id] = terrain;
    const id = terrain.site.id;
    skies[id] = createSky(id);
    skies[id].visible = false;
    scene.add(skies[id]);
    // Reflections on the lake, the rover's metal and the boat come from the site's own sky.
    const skyScene = new THREE.Scene();
    skyScene.add(createSky(id));
    environments[id] = pmrem.fromScene(skyScene, 0.02).texture;
  }
  // The fact hunt needs data/analogs.json. Without it the page still works as a plain drive.
  try {
    game = createGame(scene, terrains, await loadFacts(), gameUi);
  } catch (error) {
    console.warn('Fact hunt switched off:', error);
    for (const node of document.querySelectorAll('.game-only')) node.hidden = true;
  }
  ui.toggle.replaceChildren(...Object.values(terrains).map((t) => new Option(t.site.name, t.site.id)));
  setDetail(detail.level, weakDevice ? 'Low on this device to keep it smooth. Click for High.' : undefined);
  show('salda');
  ui.status.hidden = true;
  requestAnimationFrame(frame);
} catch (error) {
  console.error(error);
  ui.status.textContent = `Could not load the terrain: ${error.message}. Open this page through a web server, not as a file.`;
}
