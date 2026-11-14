// The fact hunt: info points scattered over each map. Drive to one to read a fact.
// AI-generated: written by Claude (Anthropic, Claude Code) on 2026-11-14. Review before use.
//
// Every fact comes from data/analogs.json: Lake Salda's entry for the Jezero
// target, and the Jezero target itself. Nothing is written here per fact, so a
// new variable, a newly researched fact, or an entry in a site's `facts` list
// becomes a new info point as soon as the pipeline writes it.
//
// What is NOT data: where the points stand. The data has no coordinates for
// individual facts, so the points are spread around each map for the game.
// The fact card says so.

import * as THREE from 'three';
import { WORLD } from './terrain.js';

const DATA_URL = new URL('../../data/analogs.json', import.meta.url);
const ANALOG_NAME = { salda: 'Lake Salda' };      // which analogs.json entry belongs to which map
const TARGET_ID = 'jezero';
const REACH = 26;                                 // scene units: how close the rover must get

// Roughly where each kind of fact goes, so water facts need the boat and
// shoreline facts sit on the shore. Unknown variables go on open land.
const ZONE = {
  water: 'lake', ph: 'lake', evaporation: 'lake',
  minerals: 'shore', sediments: 'shore',
  temperature: 'land', pressure: 'land', slope: 'hill',
};
const pretty = (key) => String(key).replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
const isLink = (text) => typeof text === 'string' && /^https?:\/\//.test(text);

function describe(data, name) {
  const info = (data.variables || {})[name] || {};
  return { label: info.label || pretty(name), unit: info.unit && info.unit !== 'match' ? info.unit : '', source: info.source };
}
const amount = (value, unit) => `${value}${unit ? (unit === '°' ? unit : ` ${unit}`) : ''}`;

// What the data says about one variable at the Earth site, or null if nothing.
function earthFact(data, analog, name) {
  const v = describe(data, name);
  const judged = (analog.judged || {})[name];
  if (judged && judged.note) return { text: judged.note, source: judged.source };
  const value = (analog.values || {})[name];
  if (value !== undefined && value !== null) return { text: `${v.label}: ${amount(value, v.unit)} at ${analog.name}.`, source: v.source };
  return null;
}

// What the data says about one variable at the Mars target, or null if nothing.
function targetFact(data, target, name) {
  const v = describe(data, name);
  const note = (target.notes || {})[name];
  const reference = (target.judged_reference || {})[name];
  if (reference) return { text: reference, source: note && note.source };
  const value = (target.features || {})[name];
  if (value !== undefined && value !== null) {
    return { text: `${v.label}: ${amount(value, v.unit)}.${note && note.note ? ` ${note.note}.` : ''}`, source: (note && note.source) || v.source };
  }
  if (note && note.note) return { text: `${note.note}.`, source: note.source };
  return null;
}

// Free-form facts: a `facts` list on the site, each a string or { title, note, source }.
function extraFacts(list, place, zoneStart) {
  if (!Array.isArray(list)) return [];
  return list.map((item, index) => {
    const fact = typeof item === 'string' ? { note: item } : item || {};
    const text = fact.note || fact.text;
    if (!text) return null;
    return { key: `fact-${index}`, label: fact.title || fact.label || 'Did you know?', text: String(text), source: fact.source || fact.url,
      zone: ['land', 'shore', 'hill', 'lake'][(zoneStart + index) % 4], here: place };
  }).filter(Boolean);
}

export async function loadFacts() {
  const reply = await fetch(DATA_URL);
  if (!reply.ok) throw new Error(`data/analogs.json answered ${reply.status}`);
  const data = await reply.json();
  const target = (data.targets || []).find((t) => t.id === TARGET_ID);
  const analog = (data.analogs || []).find((a) => a.target_id === TARGET_ID && a.name === ANALOG_NAME.salda);
  if (!target || !analog) throw new Error('Lake Salda or Jezero is missing from data/analogs.json');

  const salda = [], jezero = [];
  for (const name of data.features || []) {
    const v = describe(data, name);
    const earth = earthFact(data, analog, name), mars = targetFact(data, target, name);
    const match = (analog.feature_match || {})[name];
    const zone = ZONE[name] || 'land';
    if (earth) salda.push({ key: name, label: v.label, zone, here: analog.name, ...earth,
      other: mars && { place: target.name, text: mars.text }, match });
    if (mars) jezero.push({ key: name, label: v.label, zone, here: target.name, ...mars,
      other: earth && { place: analog.name, text: earth.text }, match });
  }
  salda.push(...extraFacts(analog.facts, analog.name, 0));
  jezero.push(...extraFacts(target.facts, target.name, 2));
  return { salda, jezero };
}

// ---- where the points stand -------------------------------------------------

// Distance from the map centre to the lake shore along one direction, or null if there is no lake.
function shoreDistance(terrain, angle) {
  if (!terrain.isWater(0, 0)) return null;
  const step = WORLD / (terrain.site.grid - 1);
  for (let r = 0; r < WORLD / 2; r += step) {
    if (!terrain.isWater(Math.sin(angle) * r, Math.cos(angle) * r)) return r;
  }
  return null;
}

function place(terrain, zone, angle) {
  const step = WORLD / (terrain.site.grid - 1);
  const shore = shoreDistance(terrain, angle);
  let centreX = 0, r;
  if (shore !== null) {
    r = { lake: shore * 0.55, shore: shore + step * 2.5, land: shore + step * 13, hill: shore + step * 30 }[zone];
  } else {
    centreX = 110;                                   // Jezero's floor sits a little east of the map centre
    r = { lake: 120, shore: 250, land: 380, hill: 540 }[zone];
  }
  const limit = WORLD / 2 - 90;
  const x = THREE.MathUtils.clamp(centreX + Math.sin(angle) * r, -limit, limit);
  const z = THREE.MathUtils.clamp(Math.cos(angle) * r, -limit, limit);
  return { x, z };
}

// ---- the game ---------------------------------------------------------------

export function createGame(scene, terrains, facts, ui) {
  const gem = new THREE.OctahedronGeometry(6, 0);
  const beam = new THREE.CylinderGeometry(1.1, 1.1, 150, 8, 1, true).translate(0, 75, 0);
  const look = (color, opacity) => ({
    gem: new THREE.MeshBasicMaterial({ color, fog: false }),
    beam: new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, fog: false,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
  });
  const waiting = look(0xffc940, 0.42), found = look(0x7fe0a8, 0.14);

  const sites = {};
  for (const [id, terrain] of Object.entries(terrains)) {
    const group = new THREE.Group();
    group.visible = false;
    const list = facts[id] || [];
    const points = list.map((fact, index) => {
      const { x, z } = place(terrain, fact.zone, (index / list.length) * Math.PI * 2 + 0.6);
      const marker = new THREE.Group();
      const gemMesh = new THREE.Mesh(gem, waiting.gem), beamMesh = new THREE.Mesh(beam, waiting.beam);
      gemMesh.position.y = 16;
      marker.add(gemMesh, beamMesh);
      marker.position.set(x, terrain.heightAt(x, z) + 1, z);
      group.add(marker);
      return { fact, x, z, gemMesh, beamMesh, found: false, inside: false, phase: index * 1.3 };
    });
    scene.add(group);
    sites[id] = { group, points, terrain, celebrated: false };
  }

  let current = null, open = null, clock = 0, sinceHud = 1;

  function showCard(point, site) {
    open = point;
    const { fact } = point;
    const number = site.points.filter((p) => p.found).length;
    ui.kicker.textContent = `${fact.here} · fact ${number} of ${site.points.length}`;
    ui.title.textContent = fact.label;
    ui.text.textContent = fact.text;
    ui.other.hidden = !fact.other;
    if (fact.other) ui.other.textContent = `At ${fact.other.place}: ${fact.other.text}`;
    ui.match.hidden = fact.match === undefined;
    if (fact.match !== undefined) {
      ui.matchValue.textContent = `${Number(fact.match).toFixed(2)} out of 1`;
      ui.matchBar.style.width = `${THREE.MathUtils.clamp(fact.match, 0, 1) * 100}%`;
    }
    ui.source.hidden = !fact.source;
    if (fact.source) {
      ui.source.replaceChildren('Source: ');
      if (isLink(fact.source)) {
        const link = document.createElement('a');
        link.href = fact.source; link.target = '_blank'; link.rel = 'noopener';
        link.textContent = new URL(fact.source).hostname.replace(/^www\./, '');
        ui.source.append(link);
      } else ui.source.append(String(fact.source));
    }
    const left = site.points.length - number;
    ui.done.hidden = left > 0;
    if (!left) ui.done.textContent = `All ${site.points.length} facts found at ${fact.here}. Switch site to compare.`;
    ui.card.hidden = false;
  }

  function hud(state) {
    const site = sites[current];
    const got = site.points.filter((p) => p.found).length;
    ui.found.textContent = `${got} / ${site.points.length}`;
    let nearest = null, best = Infinity;
    for (const point of site.points) {
      if (point.found) continue;
      const d = Math.hypot(point.x - state.x, point.z - state.z);
      if (d < best) { best = d; nearest = point; }
    }
    if (!nearest) { ui.nearest.textContent = 'all found'; ui.arrow.hidden = true; return; }
    const km = (best * site.terrain.metresPerUnit) / 1000;
    ui.nearest.textContent = `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
    // Angle of the point from the rover's nose; a left turn is anticlockwise on screen.
    const bearing = Math.atan2(nearest.x - state.x, nearest.z - state.z) - state.heading;
    ui.arrow.hidden = false;
    ui.arrow.style.transform = `rotate(${-bearing}rad)`;
  }

  ui.close.addEventListener('click', () => { ui.card.hidden = true; open = null; });

  return {
    setSite(id) {
      if (current) sites[current].group.visible = false;
      current = id;
      sites[id].group.visible = true;
      ui.card.hidden = true;
      open = null;
      sinceHud = 1;
    },
    update(dt, state) {
      const site = sites[current];
      if (!site) return;
      clock += dt;
      for (const point of site.points) {
        point.gemMesh.rotation.y = clock * 1.2 + point.phase;
        point.gemMesh.position.y = 16 + Math.sin(clock * 2 + point.phase) * 2;
        // Arriving at a point opens its card; coming back to a found one opens it again.
        const inside = Math.hypot(point.x - state.x, point.z - state.z) < REACH;
        if (inside && !point.inside) {
          point.found = true;
          point.gemMesh.material = found.gem;
          point.beamMesh.material = found.beam;
          showCard(point, site);
          sinceHud = 1;
        }
        point.inside = inside;
      }
      sinceHud += dt;
      if (sinceHud > 0.15) { sinceHud = 0; hud(state); }
    },
  };
}
