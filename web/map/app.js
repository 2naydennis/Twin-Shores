// Map page: ranks Earth sites against a Moon or Mars target and shows why each matches.
// AI-generated: written by Claude (Anthropic, Claude Code) on 2026-11-14. Review before use.
//
// Everything on the page is read from data/analogs.json (shape in data/SCHEMA.md).
// Nothing is hard-coded per site, so new candidates, new variables and new
// fields appear here as soon as the pipeline writes them:
//   - a new variable in `features` gets its own row in "How it matches"
//   - a new judged variable (minerals, water, ...) gets its own fact
//   - any other field added to a site is listed under "More about this site"

const DATA_URL = new URL('../../data/analogs.json', import.meta.url);

// One hue, light to dark: a darker marker is a closer match. Checked with the
// dataviz palette validator (ordinal ramp, light surface).
const STEPS = ['#f6dcc6', '#eab08a', '#d97e4c', '#b9501f', '#7a2c0a'];
const LABELLED = 5;                  // how many top sites carry a permanent name label on the map
// Fields the page already shows somewhere; anything else on a site is "extra".
const KNOWN_FIELDS = new Set(['target_id', 'name', 'country', 'lat', 'lon', 'score', 'coverage',
  'feature_match', 'values', 'judged', 'known_analog']);
// Sites that have a 3D page of their own.
const ROVER_PAGES = { 'Lake Salda': 'rover.html' };

const $ = (id) => document.getElementById(id);
const state = { data: null, targetId: null, selected: null, query: '', researchedOnly: false };
let map, markerLayer, legend;
const markers = new Map();          // analog -> Leaflet marker

// Build an element. Text always goes in as text, never as HTML, because site
// names and notes come from outside sources.
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

function sourceLink(url, label) {
  let host = null;
  try { const parsed = new URL(url); if (/^https?:$/.test(parsed.protocol)) host = parsed.hostname.replace(/^www\./, ''); } catch { /* not a link */ }
  if (!host) return url ? el('span', { text: String(url) }) : null;
  return el('a', { href: url, target: '_blank', rel: 'noopener', text: label || host });
}

const pretty = (key) => String(key).replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
const fmtScore = (n) => Number(n).toFixed(2);
const fmtCoord = (lat, lon) => `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`;
const hasFacts = (site) => site.judged && Object.keys(site.judged).length > 0;

function variable(name) {
  const info = (state.data.variables || {})[name] || {};
  return { label: info.label || pretty(name), unit: info.unit && info.unit !== 'match' ? info.unit : '', kind: info.kind, source: info.source };
}
// Degrees sit against the number (1.89°); other units take a thin gap (12.14 °C).
const withUnit = (value, unit) => (value === null || value === undefined ? null
  : `${typeof value === 'number' ? Number(value.toFixed(2)) : value}${unit === '°' ? '°' : unit ? ` ${unit}` : ''}`);
const slug = (site) => `${site.name}-${site.lat.toFixed(2)}`.toLocaleLowerCase('en').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/ı/g, 'i').replace(/[^a-z0-9.]+/g, '-').replace(/^-|-$/g, '');
const coverageShort = (site) => (site.coverage || '').replace(/ of /, '/').replace(/ variables?/, '');

// What kind of look the AI had at the source behind a researched fact.
function evidenceTags(fact) {
  const tags = [];
  const direct = /^read directly/i.test(fact.checked || '');
  const unconfirmed = /entry not confirmed/i.test(fact.checked || '');   // the source was opened and does not support all of it
  tags.push(el('span', { class: direct ? 'tag ok' : 'tag todo', title: fact.checked || '',
    text: direct ? 'Source read directly' : unconfirmed ? 'Source opened: not confirmed' : 'From a summary, to verify' }));
  if (/^AI/i.test(fact.proposed_by || '')) tags.push(el('span', { class: 'tag todo', title: fact.proposed_by, text: 'Match proposed by AI' }));
  return tags;
}

const target = () => state.data.targets.find((t) => t.id === state.targetId);
const sitesForTarget = () => state.data.analogs.filter((a) => a.target_id === state.targetId);

function scoreRange() {
  const scores = sitesForTarget().map((a) => a.score);
  return { low: Math.min(...scores), high: Math.max(...scores) };
}
function colorFor(score) {
  const { low, high } = scoreRange();
  if (high === low) return STEPS[STEPS.length - 1];
  return STEPS[Math.min(STEPS.length - 1, Math.floor(((score - low) / (high - low)) * STEPS.length))];
}

// ---- key figures ------------------------------------------------------------

function renderFigures() {
  const sites = sitesForTarget();
  const candidates = sites.filter((s) => !s.known_analog);
  const withEvidence = sites.filter(hasFacts).length;
  const best = candidates[0];
  const figure = (value, label) => el('div', {}, el('b', { text: value }), el('span', { text: label }));
  $('figures').replaceChildren(
    figure(String(sites.length), 'places compared with ' + target().name),
    figure(String((state.data.features || []).length), 'variables: climate, terrain, water chemistry, geology'),
    figure(String(withEvidence), 'places with published evidence entered'),
    figure(best ? `${best.name} ${fmtScore(best.score)}` : 'n/a', 'closest candidate not yet a listed analog'));
}

// ---- target panel -----------------------------------------------------------

function renderTarget() {
  const t = target();
  const box = $('target');
  box.replaceChildren();
  box.append(el('div', { class: 'eyebrow', text: 'Compared with' }));
  if (state.data.targets.length > 1) {
    const select = el('select', { 'aria-label': 'Target site' },
      state.data.targets.map((item) => el('option', { value: item.id, selected: item.id === t.id, text: item.name })));
    select.addEventListener('change', () => { state.targetId = select.value; state.selected = null; renderAll(true); });
    box.append(select);
  } else {
    box.append(el('h2', { text: t.name }));
  }
  box.append(el('div', { class: 'muted', text: `${pretty(t.body)} · ${fmtCoord(t.lat, t.lon)}` }));

  const facts = [];
  for (const [name, text] of Object.entries(t.judged_reference || {})) facts.push([variable(name).label, text, null]);
  for (const [name, note] of Object.entries(t.notes || {})) {
    const v = variable(name);
    const value = withUnit(note.value, v.unit);
    facts.push([v.label, [value, note.note].filter(Boolean).join('. '), note.source]);
  }
  if (facts.length) {
    box.append(el('details', {},
      el('summary', { text: `What we know about ${t.name}` }),
      el('dl', {}, facts.map(([label, text, source]) => [
        el('dt', { text: label }),
        el('dd', {}, text, source ? [' ', sourceLink(source)] : null),
      ]))));
  }
}

// ---- ranked list ------------------------------------------------------------

function visibleSites() {
  const query = state.query.trim().toLocaleLowerCase('tr');
  return sitesForTarget().filter((site) =>
    (!state.researchedOnly || hasFacts(site)) &&
    (!query || `${site.name} ${site.country}`.toLocaleLowerCase('tr').includes(query)));
}

function renderList() {
  const all = sitesForTarget();
  const shown = visibleSites();
  const rank = new Map(all.map((site, index) => [site, index + 1]));   // rank among all sites, whatever the filter
  $('count').textContent = `${shown.length} of ${all.length} sites, closest match first`;
  $('list').replaceChildren(...shown.map((site) => {
    const button = el('button', { type: 'button', 'aria-pressed': String(site === state.selected) },
      el('span', { class: 'rank', text: rank.get(site) }),
      el('span', { class: 'name', text: site.name }),
      el('span', { class: 'score', text: fmtScore(site.score) }),
      el('span', { class: 'sub' },
        el('span', { class: 'meter' }, el('i', { style: `width:${Math.max(0, Math.min(1, site.score)) * 100}%` })),
        el('span', { text: `${site.country} · ${coverageShort(site)} variables` }),
        site.known_analog ? el('span', { class: 'tag known', text: 'Listed analog' }) : null));
    button.addEventListener('click', () => select(site, true));
    return el('li', {}, button);
  }));
  for (const [site, marker] of markers) {
    const visible = shown.includes(site);
    if (visible && !markerLayer.hasLayer(marker)) markerLayer.addLayer(marker);
    if (!visible && markerLayer.hasLayer(marker)) markerLayer.removeLayer(marker);
  }
}

// ---- map --------------------------------------------------------------------

function markerStyle(site) {
  const chosen = site === state.selected;
  return {
    radius: (site.known_analog ? 6.5 : 4.5) + (chosen ? 3 : 0),
    fillColor: colorFor(site.score), fillOpacity: 1,
    color: site.known_analog || chosen ? '#16202b' : '#ffffff',     // listed analogs wear a dark ring
    weight: chosen ? 2.5 : 1.2,
  };
}

function buildMap() {
  map = L.map('map', { preferCanvas: true, worldCopyJump: true, minZoom: 2 });
  const streets = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' });
  const blueMarble = L.tileLayer(
    'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg',
    { maxNativeZoom: 8, maxZoom: 12, attribution: 'Imagery: NASA Blue Marble, served by <a href="https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api">NASA GIBS</a>' });
  // Sentinel-2 imagery shows the lakes themselves down to about 10 m per pixel.
  const sentinel = L.tileLayer('https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg', {
    maxNativeZoom: 14, maxZoom: 16, attribution: '<a href="https://s2maps.eu">Sentinel-2 cloudless 2020</a> by EOX, contains modified Copernicus Sentinel data (CC BY-NC-SA 4.0)' });
  sentinel.addTo(map);
  L.control.layers({ 'Satellite (ESA Sentinel-2)': sentinel, 'Satellite (NASA Blue Marble)': blueMarble, 'Map (OpenStreetMap)': streets },
    null, { collapsed: window.innerWidth < 820 }).addTo(map);   // folded away on phones to leave room for the map
  markerLayer = L.layerGroup().addTo(map);
  L.control.scale({ imperial: false }).addTo(map);
}

function renderMarkers(fit) {
  markerLayer.clearLayers();
  markers.clear();
  const sites = sitesForTarget();
  // Draw weaker matches first so the closest ones end up on top.
  for (const site of [...sites].reverse()) {
    const marker = L.circleMarker([site.lat, site.lon], markerStyle(site));
    const rank = sites.indexOf(site);
    if (rank < LABELLED) {
      // Alternate sides so labels of neighbouring lakes do not sit on top of each other.
      marker.bindTooltip(`${rank + 1}  ${site.name}`, { permanent: true, className: 'pin', direction: rank % 2 ? 'left' : 'right', offset: [rank % 2 ? -8 : 8, 0] });
    } else {
      marker.bindTooltip(`${site.name} · ${fmtScore(site.score)}${site.known_analog ? ' · listed analog' : ''}`, { direction: 'top' });
    }
    marker.on('click', () => select(site, false));
    markers.set(site, marker);
    markerLayer.addLayer(marker);
  }
  if (fit && sites.length) {
    // Open on the region where most candidates are, not on the whole world.
    const byCountry = new Map();
    for (const site of sites) byCountry.set(site.country, (byCountry.get(site.country) || 0) + 1);
    const main = [...byCountry.entries()].sort((a, b) => b[1] - a[1])[0][0];
    map.fitBounds(L.latLngBounds(sites.filter((s) => s.country === main).map((s) => [s.lat, s.lon])).pad(0.12));
  }

  if (legend) legend.remove();
  const { low, high } = scoreRange();
  legend = L.control({ position: 'bottomright' });
  legend.onAdd = () => {
    const box = el('div', { class: 'legend' },
      el('b', { text: 'Match score' }),
      el('div', { class: 'steps' }, STEPS.map((hex) => el('span', { style: `background:${hex}` }))),
      el('div', { class: 'ends' }, el('span', { text: `${fmtScore(low)} weaker` }), el('span', { text: `closer ${fmtScore(high)}` })),
      el('div', { class: 'key' }, el('span', { class: 'dot known' }), 'Analog already listed by NASA'),
      el('div', { class: 'key' }, el('span', { class: 'dot' }), 'Candidate'));
    L.DomEvent.disableClickPropagation(box);
    return box;
  };
  legend.addTo(map);
}

// ---- detail card ------------------------------------------------------------

function matchRow(name, site, t) {
  const v = variable(name);
  const match = (site.feature_match || {})[name];
  const own = withUnit((site.values || {})[name], v.unit);
  const theirs = withUnit((t.features || {})[name], v.unit);
  const judged = (site.judged || {})[name];
  const measured = v.kind !== 'judged';
  const here = measured ? (own || 'n/a') : (judged ? 'see evidence' : 'not researched');
  const there = measured ? (theirs || 'no value') : 'see evidence';
  const cell = match === undefined
    ? el('td', { class: 'num skip', text: 'not scored' })
    : el('td', { class: 'num', title: `${v.label}: match ${fmtScore(match)} out of 1` },
      el('span', { class: 'cellbar' }, el('i', { style: `width:${Math.max(0, Math.min(1, match)) * 100}%` })), fmtScore(match));
  if (!measured) {
    // No number exists on either side: the match comes from a study, listed under "Published evidence".
    return el('tr', {}, el('td', { text: v.label }),
      el('td', { class: 'skip', colspan: '2', text: judged ? 'from a published study, below' : 'no study entered yet' }), cell);
  }
  return el('tr', {},
    el('td', { text: v.label }),
    el('td', { class: 'num', text: here }),
    el('td', { class: 'num', text: there }),
    cell);
}

// Shows a field the page has no special layout for, whatever shape it has.
function extraValue(value) {
  if (value === null || value === undefined) return el('span', { class: 'muted', text: 'No value' });
  if (Array.isArray(value)) return el('ul', {}, value.map((item) => el('li', {}, extraValue(item))));
  if (typeof value === 'object') {
    const { note, text, value: inner, source, url, ...rest } = value;
    const parts = [];
    const main = [inner, note || text].filter((x) => x !== undefined && x !== null).join('. ');
    if (main) parts.push(el('span', { text: main }));
    for (const [key, item] of Object.entries(rest)) parts.push(el('div', {}, el('b', { text: `${pretty(key)}: ` }), extraValue(item)));
    if (source || url) parts.push(' ', sourceLink(source || url));
    return el('span', {}, parts);
  }
  const link = typeof value === 'string' && /^https?:\/\//.test(value) ? sourceLink(value) : null;
  return link || el('span', { text: String(value) });
}

function renderDetail() {
  const pane = $('detail');
  const site = state.selected;
  const t = target();
  if (!site) {
    pane.replaceChildren(el('p', { class: 'muted', text: 'Pick a site from the list or the map to see how it compares.' }));
    return;
  }
  const all = sitesForTarget();
  const features = state.data.features || Object.keys(site.feature_match || {});
  const facts = Object.entries(site.judged || {});
  const extras = Object.entries(site).filter(([key]) => !KNOWN_FIELDS.has(key));

  // replaceChildren does not skip empty entries or unpack lists, so tidy them first.
  pane.replaceChildren(...[
    el('div', { class: 'eyebrow', text: `Rank ${all.indexOf(site) + 1} of ${all.length} · compared with ${t.name}` }),
    el('h2', { text: site.name }),
    el('div', { class: 'where' },
      el('span', { text: site.country }), el('span', { class: 'num', text: fmtCoord(site.lat, site.lon) }),
      el('span', { class: site.known_analog ? 'tag known' : 'tag', text: site.known_analog ? 'Analog listed by NASA' : 'Candidate' })),
    el('div', { class: 'scoreline' },
      el('span', { class: 'number', text: fmtScore(site.score) }),
      el('span', { class: 'of' }, 'Match score out of 1, from ', el('b', { text: site.coverage || 'the variables available' }),
        '. Scores built on different numbers of variables are not strictly comparable.')),
    el('div', { class: 'links' },
      el('a', { href: `https://worldview.earthdata.nasa.gov/?v=${(site.lon - 1.2).toFixed(2)},${(site.lat - 0.7).toFixed(2)},${(site.lon + 1.2).toFixed(2)},${(site.lat + 0.7).toFixed(2)}`,
        target: '_blank', rel: 'noopener', text: 'Open in NASA Worldview' }),
      el('a', { href: `https://www.openstreetmap.org/?mlat=${site.lat}&mlon=${site.lon}#map=11/${site.lat}/${site.lon}`, target: '_blank', rel: 'noopener', text: 'OpenStreetMap' }),
      ROVER_PAGES[site.name] ? el('a', { href: ROVER_PAGES[site.name], text: '3D terrain' }) : null),

    el('h3', { text: 'Variable by variable' }),
    el('table', {},
      el('thead', {}, el('tr', {}, el('th', { text: 'Variable' }), el('th', { class: 'num', text: 'Here' }),
        el('th', { class: 'num', text: t.name.split(' ')[0] }), el('th', { class: 'num', text: 'Match' }))),
      el('tbody', {}, features.map((name) => matchRow(name, site, t)))),
    el('p', { class: 'caveat', text: 'Measured values: NASA POWER, ASTER GDEM and MOLA. A variable marked "not scored" is left out of the score, not counted as zero.' }),

    (() => {
      // What would make this score firmer: variables with nothing entered for this site.
      const missing = features.filter((name) => (site.feature_match || {})[name] === undefined).map((name) => {
        const v = variable(name);
        return el('li', {}, el('b', { text: v.label }), v.kind === 'judged' ? ': no published study entered yet' : `: no value at ${t.name} to compare with`);
      });
      return missing.length ? [el('h3', { text: 'Not yet checked' }), el('ul', { class: 'gaps' }, missing)] : null;
    })(),
    el('h3', { text: 'Published evidence' }),
    facts.length
      ? el('div', {}, facts.map(([name, fact]) => el('div', { class: 'fact' },
        el('div', { class: 'head' }, el('span', { class: 'label', text: variable(name).label }),
          el('span', { class: 'num', text: `match ${fmtScore(fact.match)}` })),
        el('p', {}, fact.note || 'No note recorded.'),
        (t.judged_reference || {})[name] ? el('p', { class: 'ref', text: `At ${t.name}: ${t.judged_reference[name]}` }) : null,
        fact.source ? el('p', { class: 'ref' }, 'Source: ', sourceLink(fact.source)) : null,
        el('div', { class: 'tags' }, evidenceTags(fact)))))
      : el('p', { class: 'muted', text: 'No published evidence has been entered for this site, so its score rests on the measured variables only.' }),

    extras.length ? [
      el('h3', { text: 'More about this site' }),
      el('dl', { class: 'extra' }, extras.map(([key, value]) => [el('dt', { text: pretty(key) }), el('dd', {}, extraValue(value))])),
    ] : null,
  ].flat().filter(Boolean));
  pane.scrollTop = 0;
}

function select(site, fly) {
  const previous = state.selected;
  state.selected = site;
  for (const item of [previous, site]) if (item && markers.has(item)) markers.get(item).setStyle(markerStyle(item));
  if (markers.has(site)) {
    markers.get(site).bringToFront();
    if (fly) map.flyTo([site.lat, site.lon], Math.max(map.getZoom(), 8), { duration: 0.8 });
  }
  renderList();
  renderDetail();
  history.replaceState(null, '', `#${slug(site)}`);   // the address now points at this site, so it can be shared
}

function renderAll(fit) {
  renderFigures();
  renderTarget();
  renderMarkers(fit);
  renderList();
  renderDetail();
}

// ---- start ------------------------------------------------------------------

$('search').addEventListener('input', (event) => { state.query = event.target.value; renderList(); });
$('researched').addEventListener('change', (event) => { state.researchedOnly = event.target.checked; renderList(); });

try {
  const reply = await fetch(DATA_URL, { cache: 'no-cache' });
  if (!reply.ok) throw new Error(`data/analogs.json answered ${reply.status}`);
  state.data = await reply.json();
  if (!state.data.targets?.length || !Array.isArray(state.data.analogs)) throw new Error('data/analogs.json has no targets or analogs');
  state.targetId = state.data.targets[0].id;
  buildMap();
  renderAll(true);
  const wanted = decodeURIComponent(location.hash.slice(1));
  const linked = wanted && sitesForTarget().find((site) => slug(site) === wanted);
  const first = linked || sitesForTarget()[0];
  if (first) select(first, Boolean(linked));
} catch (error) {
  console.error(error);
  $('detail').replaceChildren(el('p', { text:
    `Could not load the data: ${error.message}. Open this page through a web server started in the repo root, not as a file.` }));
}
