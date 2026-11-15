// Lake Salda study page: scientific report, comparative map and assessment.
// AI-generated: written by Claude (Anthropic, Claude Code) on 2026-11-15. Review before use.
//
// Nothing is typed in here per fact. The page reads:
//   data/salda_report.json   the report text, with an evidence class and sources for every statement
//   data/salda_study.json    our basin analysis of both sites (pipeline/salda_study.py)
//   data/analogs.json, data/nasa/earth_climate.json, web/rover/terrain/   scores, climate and heightmaps
// Numbers written as {{S.lake.area_km2}} in the report are filled in from those files.

const DATA = new URL('../../data/', import.meta.url);
const TERRAIN = new URL('../rover/terrain/', import.meta.url);
const json = async (url) => {
  const reply = await fetch(url, { cache: 'no-cache' });
  if (!reply.ok) throw new Error(`${url.pathname.split('/').pop()} answered ${reply.status}`);
  return reply.json();
};
const $ = (id) => document.getElementById(id);
const SVG = 'http://www.w3.org/2000/svg';

// Text always goes in as text, never as HTML.
function el(tag, props = {}, ...children) {
  const svg = ['svg', 'path', 'line', 'rect', 'circle', 'text', 'g', 'title', 'polygon'].includes(tag);
  const node = svg ? document.createElementNS(SVG, tag) : document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'text') node.textContent = value;
    else if (key === 'class' && !svg) node.className = value;
    else node.setAttribute(key, value);
  }
  for (const child of children.flat(Infinity)) if (child !== null && child !== undefined && child !== false) node.append(child);
  return node;
}
const fmt = (n, digits = 0) => Number(n).toLocaleString('en', { maximumFractionDigits: digits, minimumFractionDigits: digits });

// ---- filling in numbers -------------------------------------------------------

function fill(text, context) {
  return text.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    let value = context;
    for (const key of path.trim().split('.')) value = value === undefined || value === null ? undefined : value[key];
    if (value === undefined || value === null) return '(no value)';
    if (typeof value !== 'number') return String(value);
    return value.toLocaleString('en', { maximumFractionDigits: Math.abs(value) < 10 ? 2 : 1 });
  });
}

// ---- evidence labels and sources ----------------------------------------------

let report = null;
function chip(name) {
  const c = report.classes[name];
  return el('span', { class: `chip chip-${name}`, title: c.what }, el('span', { 'aria-hidden': 'true', text: c.mark }), ` ${c.label}`);
}
const CHECKED = { read: 'source read', summary: 'source not opened', 'team data': 'team data', ours: 'our analysis' };
function sources(ids) {
  if (!ids || !ids.length) return null;
  return el('span', { class: 'src' }, ids.map((id, index) => {
    const s = report.sources[id];
    return [index ? ' · ' : '', el('a', { href: s.url, target: '_blank', rel: 'noopener', text: s.label }), ` (${CHECKED[s.checked] || s.checked})`];
  }));
}
function statement(side, context) {
  return el('td', { 'data-ev': side.class }, chip(side.class), el('p', { text: fill(side.text, context) }), sources(side.sources));
}

// ---- section 1: the report ------------------------------------------------------

function renderReport(context) {
  $('question').textContent = report.question;
  $('legend').replaceChildren(...Object.keys(report.classes).map((name) =>
    el('li', {}, chip(name), el('span', { text: ` ${report.classes[name].what}` }))));
  $('report').replaceChildren(...report.sections.map((section) => el('div', { class: 'block' },
    el('h4', { text: section.title }),
    section.note ? el('p', { class: 'muted', text: section.note }) : null,
    el('table', { class: 'report' },
      el('thead', {}, el('tr', {}, el('th', { text: 'Topic' }), el('th', { text: 'Lake Salda, Earth' }), el('th', { text: 'Jezero Crater, Mars' }))),
      el('tbody', {}, section.rows.map((row) => el('tr', {},
        el('td', {}, el('b', { text: row.topic }), el('span', { class: 'frame', text: report.frames[row.frame] })),
        statement(row.salda, context), statement(row.jezero, context))))))));
}

// ---- section 2: the two maps ----------------------------------------------------

async function heights(site) {
  const reply = await fetch(new URL(site.file, TERRAIN), { cache: 'no-cache' });
  if (!reply.ok) throw new Error(`${site.file} answered ${reply.status}`);
  return new Uint16Array(await reply.arrayBuffer());
}
function maskOf(basin) {
  const bytes = Uint8Array.from(atob(basin.mask.base64), (c) => c.charCodeAt(0));
  const n = basin.grid, out = new Uint8Array(n * n);
  for (let k = 0; k < n * n; k++) out[k] = (bytes[k >> 2] >> ((k & 3) * 2)) & 3;
  return out;
}

const MARS_RADIUS_KM = 3396, LANDING = { lat: 18.4447, lon: 77.4508 };   // Perseverance's landing site, as used on the 3D page

function baseImage(basin, packed, mask) {
  const n = basin.grid;
  const image = new ImageData(n, n);
  let low = 65535, high = 0;
  for (const v of packed) { if (v < low) low = v; if (v > high) high = v; }
  const metresPerCount = (basin.relief.highest_m - basin.relief.lowest_m) / 65535, cell = basin.cell_m;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      const west = packed[j * n + Math.max(0, i - 1)], east = packed[j * n + Math.min(n - 1, i + 1)];
      const north = packed[Math.max(0, j - 1) * n + i], south = packed[Math.min(n - 1, j + 1) * n + i];
      // Light from the north-west; relief exaggerated so gentle Jezero still reads.
      const shade = Math.min(1.3, Math.max(0.45, 1 - (((west - east) + (north - south)) * metresPerCount / (2 * cell)) * (basin.body === 'mars' ? 9 : 2.2)));
      const t = (packed[k] - low) / (high - low);
      let r = 150 + t * 70, g = 146 + t * 68, b = 136 + t * 66;         // neutral ground, paler with height
      if (mask[k] === 1) { r *= 0.93; g *= 0.98; b *= 0.9; }              // catchment keeps full strength
      else if (mask[k] === 0) { r = r * 0.55 + 110; g = g * 0.55 + 110; b = b * 0.55 + 110; }   // land outside it is washed out
      if (mask[k] === 2) { r = 62; g = 126; b = 196; image.data.set([r, g, b, 255], k * 4); continue; }
      image.data.set([r * shade, g * shade, b * shade, 255], k * 4);
    }
  }
  const base = document.createElement('canvas');
  base.width = base.height = n;
  base.getContext('2d').putImageData(image, 0, 0);
  return base;
}

function drawMap(canvas, basin, packed, zones) {
  const n = basin.grid, size = canvas.width, ctx = canvas.getContext('2d');
  const mask = maskOf(basin), base = baseImage(basin, packed, mask);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(base, 0, 0, size, size);

  // Where to stand each zone letter.
  let lx = 0, ly = 0, lakeCells = 0, far = null, farBest = -1, west = null;
  for (let k = 0; k < n * n; k++) if (mask[k] === 2) { lx += k % n; ly += Math.floor(k / n); lakeCells++; }
  lx /= lakeCells; ly /= lakeCells;
  for (let j = Math.round(n * 0.08); j < n * 0.92; j += 3) {
    for (let i = Math.round(n * 0.08); i < n * 0.92; i += 3) {
      if (mask[j * n + i] !== 1) continue;
      const d = Math.hypot(i - lx, j - ly);
      if (d > farBest) { farBest = d; far = { x: i / (n - 1), y: j / (n - 1) }; }
    }
  }
  for (let i = 0; i < n; i++) if (mask[Math.round(ly) * n + i] === 2) { west = { x: (i - n * 0.012) / (n - 1), y: ly / (n - 1) }; break; }
  const spots = { A: { x: lx / (n - 1), y: ly / (n - 1) }, B: west, D: far, E: basin.spill };
  const p = (v) => v * size, ink = '#16202b', accent = '#a3380d';
  ctx.lineJoin = 'round';

  const label = (text, x, y, fill, color, r = size * 0.026) => {
    ctx.beginPath(); ctx.arc(p(x), p(y), r, 0, Math.PI * 2);
    ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = size * 0.004; ctx.strokeStyle = ink; ctx.stroke();
    ctx.fillStyle = color; ctx.font = `600 ${r * 1.15}px "IBM Plex Mono", ui-monospace, monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, p(x), p(y) + r * 0.06);
  };
  // Inlets: small numbered squares, largest first.
  for (const inlet of basin.inlets) {
    const r = size * 0.017;
    ctx.fillStyle = ink; ctx.fillRect(p(inlet.x) - r, p(inlet.y) - r, r * 2, r * 2);
    ctx.fillStyle = '#fff'; ctx.font = `600 ${r * 1.5}px "IBM Plex Mono", ui-monospace, monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(inlet.rank), p(inlet.x), p(inlet.y) + r * 0.1);
  }
  for (const zone of zones) {
    if (zone.letter === 'C') continue;                       // the inlets carry their own numbers
    const at = spots[zone.letter];
    if (at) label(zone.letter, at.x, at.y, zone.letter === 'E' ? accent : '#fff', zone.letter === 'E' ? '#fff' : ink);
  }
  if (basin.body === 'mars') {                               // Perseverance's landing site
    const kmPerDeg = (2 * Math.PI * MARS_RADIUS_KM) / 360, site = basin.site;
    const x = 0.5 + ((LANDING.lon - site.lon) * kmPerDeg * Math.cos((site.lat * Math.PI) / 180)) / basin.width_km;
    const y = 0.5 - ((LANDING.lat - site.lat) * kmPerDeg) / basin.width_km;
    ctx.beginPath(); ctx.arc(p(x), p(y), size * 0.009, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = size * 0.004; ctx.strokeStyle = ink; ctx.stroke();
    ctx.font = `500 ${size * 0.026}px "IBM Plex Mono", ui-monospace, monospace`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.lineWidth = size * 0.008; ctx.strokeStyle = '#fff'; ctx.strokeText('landing site', p(x) + size * 0.018, p(y));
    ctx.fillStyle = ink; ctx.fillText('landing site', p(x) + size * 0.018, p(y));
  }
  // Scale bar and north.
  const km = [20, 10, 5, 2, 1].find((v) => v <= basin.width_km / 4), bar = (km / basin.width_km) * size;
  ctx.font = `500 ${size * 0.028}px "IBM Plex Mono", ui-monospace, monospace`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.lineWidth = size * 0.008; ctx.strokeStyle = '#fff';
  ctx.strokeText(`${km} km`, size * 0.03, size * 0.95); ctx.fillStyle = ink; ctx.fillText(`${km} km`, size * 0.03, size * 0.95);
  ctx.fillStyle = '#fff'; ctx.fillRect(size * 0.03 - 1, size * 0.962 - 1, bar + 2, size * 0.012 + 2);
  ctx.fillStyle = ink; ctx.fillRect(size * 0.03, size * 0.962, bar, size * 0.012);
  ctx.strokeText('N ↑', size * 0.9, size * 0.06); ctx.fillText('N ↑', size * 0.9, size * 0.06);
}

// Lake Salda's outline placed inside the modelled Jezero lake, both at one scale.
// Added 2026-11-15 by Claude (AI). Salda's outline is the SRTM lake surface; the Jezero lake is our model.
function drawScale(canvas, S, J, jezeroPacked) {
  const size = canvas.width, ctx = canvas.getContext('2d'), ink = '#16202b';
  const jm = maskOf(J), sm = maskOf(S), jn = J.grid, sn = S.grid;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(baseImage(J, jezeroPacked, jm), 0, 0, size, size);

  const centre = (mask, n) => {
    let x = 0, y = 0, cells = 0, top = n, bottom = 0;
    for (let k = 0; k < n * n; k++) if (mask[k] === 2) { const j = Math.floor(k / n); x += k % n; y += j; cells++; if (j < top) top = j; if (j > bottom) bottom = j; }
    return { x: x / cells / (n - 1), y: y / cells / (n - 1), top: top / (n - 1), bottom: bottom / (n - 1) };
  };
  const jc = centre(jm, jn), sc = centre(sm, sn);
  const side = (S.width_km / J.width_km) * size;             // Salda's whole map, in pixels of this one
  const x0 = jc.x * size - sc.x * side, y0 = jc.y * size - sc.y * side;

  const shape = (r, g, b) => {
    const image = new ImageData(sn, sn);
    for (let k = 0; k < sn * sn; k++) if (sm[k] === 2) image.data.set([r, g, b, 255], k * 4);
    const c = document.createElement('canvas');
    c.width = c.height = sn;
    c.getContext('2d').putImageData(image, 0, 0);
    return c;
  };
  const dark = shape(22, 32, 43), light = shape(255, 255, 255), edge = size * 0.004;
  for (let a = 0; a < 8; a++) ctx.drawImage(dark, x0 + Math.cos(a * Math.PI / 4) * edge, y0 + Math.sin(a * Math.PI / 4) * edge, side, side);
  ctx.drawImage(light, x0, y0, side, side);

  const write = (lines, x, y, px) => {
    ctx.font = `500 ${px}px "IBM Plex Mono", ui-monospace, monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    lines.forEach((line, i) => {
      ctx.lineWidth = px * 0.3; ctx.strokeStyle = '#fff'; ctx.strokeText(line, x, y + i * px * 1.25);
      ctx.fillStyle = ink; ctx.fillText(line, x, y + i * px * 1.25);
    });
  };
  const px = size * 0.03;
  write(['Lake Salda today', `${fmt(S.lake.area_km2, 1)} km²`], jc.x * size, y0 + sc.bottom * side + px * 1.4, px);
  write(['Jezero lake (model)', `${fmt(J.lake.area_km2, 0)} km²`], jc.x * size, y0 + sc.top * side - px * 2.6, px);

  const km = 10, bar = (km / J.width_km) * size;
  ctx.font = `500 ${size * 0.028}px "IBM Plex Mono", ui-monospace, monospace`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.lineWidth = size * 0.008; ctx.strokeStyle = '#fff';
  ctx.strokeText(`${km} km`, size * 0.03, size * 0.95); ctx.fillStyle = ink; ctx.fillText(`${km} km`, size * 0.03, size * 0.95);
  ctx.fillStyle = '#fff'; ctx.fillRect(size * 0.03 - 1, size * 0.962 - 1, bar + 2, size * 0.012 + 2);
  ctx.fillStyle = ink; ctx.fillRect(size * 0.03, size * 0.962, bar, size * 0.012);
  ctx.strokeText('N ↑', size * 0.9, size * 0.06); ctx.fillText('N ↑', size * 0.9, size * 0.06);
}

// ---- the observations-only switch -------------------------------------------------
// Hides every statement labelled model or hypothesis, and the figures built on our basin model.
// The hiding itself is CSS on body.observed; this counts what is left and says so.
function setUpSwitch() {
  const box = $('observed-only'), tally = $('observed-tally');
  const cells = [...document.querySelectorAll('td[data-ev]')];
  const count = (name) => cells.filter((c) => c.dataset.ev === name).length;
  for (const cell of cells) cell.dataset.evLabel = report.classes[cell.dataset.ev].label.toLowerCase();
  const kept = count('measured') + count('remote');
  const say = () => {
    document.body.classList.toggle('observed', box.checked);
    tally.textContent = box.checked
      ? `Showing ${kept} of ${cells.length} labelled statements: ${count('measured')} measured and ${count('remote')} from remote sensing. `
        + `Hidden: ${count('model')} models, ${count('unknown')} hypotheses or unknowns, and the maps and curves built on our basin model.`
      : `${cells.length} labelled statements: ${count('measured')} measured, ${count('remote')} from remote sensing, ${count('model')} models, ${count('unknown')} hypotheses or unknowns.`;
  };
  box.addEventListener('change', say);
  box.disabled = false;
  say();
}

function renderZones(context) {
  $('zones').replaceChildren(
    el('thead', {}, el('tr', {}, el('th', { text: '' }), el('th', { text: 'Zone' }), el('th', { text: 'Lake Salda' }), el('th', { text: 'Jezero Crater' }), el('th', { text: 'Why the pair matters' }))),
    el('tbody', {}, report.zones.map((zone) => el('tr', {},
      el('td', {}, el('span', { class: zone.letter === 'E' ? 'letter letter-e' : 'letter', text: zone.letter === 'C' ? '1…' : zone.letter })),
      el('td', {}, el('b', { text: zone.title })),
      el('td', { 'data-ev': zone.salda_class }, chip(zone.salda_class), el('p', { text: fill(zone.salda, context) })),
      el('td', { 'data-ev': zone.jezero_class }, chip(zone.jezero_class), el('p', { text: fill(zone.jezero, context) })),
      el('td', { text: fill(zone.why, context) })))));
}

function renderInlets(context) {
  const row = (basin) => basin.inlets.map((inlet) => el('tr', {},
    el('td', { text: basin.name }), el('td', { class: 'num', text: inlet.rank }),
    el('td', { class: 'num', text: `${Math.abs(inlet.lat).toFixed(3)}° N, ${inlet.lon.toFixed(3)}° E` }),
    el('td', { class: 'num', text: `${fmt(inlet.upstream_km2, 1)} km²` })));
  $('inlets').replaceChildren(
    el('thead', {}, el('tr', {}, el('th', { text: 'Site' }), el('th', { class: 'num', text: 'Inlet' }), el('th', { class: 'num', text: 'Position' }), el('th', { class: 'num', text: 'Area upstream, inside the map' }))),
    el('tbody', {}, row(context.S), row(context.J)));
}

// ---- charts -----------------------------------------------------------------------

// One series per chart, so no legend: the title says what is drawn.
function lineChart(points, { x, y, xLabel, yLabel, marks = [] }) {
  const W = 420, H = 230, m = { l: 52, r: 30, t: 14, b: 38 };
  const xs = points.map(x), ys = points.map(y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y1 = Math.max(...ys) * 1.06;
  const px = (v) => m.l + ((v - x0) / (x1 - x0 || 1)) * (W - m.l - m.r), py = (v) => H - m.b - (v / y1) * (H - m.t - m.b);
  const ticks = (a, b, count) => Array.from({ length: count + 1 }, (_, i) => a + ((b - a) * i) / count);
  return el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `${yLabel} against ${xLabel}` },
    ticks(0, y1, 4).map((v) => [el('line', { x1: m.l, x2: W - m.r, y1: py(v), y2: py(v), class: 'grid' }),
      el('text', { x: m.l - 6, y: py(v) + 4, 'text-anchor': 'end', text: fmt(v, v < 10 ? 1 : 0) })]),
    ticks(x0, x1, 4).map((v) => el('text', { x: px(v), y: H - m.b + 15, 'text-anchor': 'middle', text: fmt(v, 0) })),
    el('text', { x: (m.l + W - m.r) / 2, y: H - 4, 'text-anchor': 'middle', class: 'axis-title', text: xLabel }),
    el('text', { x: 12, y: (m.t + H - m.b) / 2, 'text-anchor': 'middle', class: 'axis-title', transform: `rotate(-90 12 ${(m.t + H - m.b) / 2})`, text: yLabel }),
    el('path', { d: points.map((pt, i) => `${i ? 'L' : 'M'}${px(x(pt)).toFixed(1)} ${py(y(pt)).toFixed(1)}`).join(' '), class: 'line' }),
    points.map((pt) => el('circle', { cx: px(x(pt)), cy: py(y(pt)), r: 7, class: 'hit' }, el('title', { text: `${fmt(x(pt), 0)} m: ${fmt(y(pt), 1)} km²` }))),
    marks.map((mark) => [el('line', { x1: px(mark.at), x2: px(mark.at), y1: m.t, y2: H - m.b, class: 'mark' }),
      el('text', { x: px(mark.at) + (mark.left ? -5 : 5), y: m.t + 10, 'text-anchor': mark.left ? 'end' : 'start', class: 'mark-label', text: mark.label })]));
}

function barChart(items, { label, value, unit, max, title }) {
  const W = 420, row = 24, m = { l: 96, r: 54, t: 6 }, H = m.t + items.length * row + 6;
  const top = max || Math.max(...items.map(value)) * 1.05;
  return el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': title },
    items.map((item, i) => {
      const w = (value(item) / top) * (W - m.l - m.r), y = m.t + i * row;
      return [el('text', { x: m.l - 8, y: y + 15, 'text-anchor': 'end', text: label(item) }),
        el('rect', { x: m.l, y: y + 4, width: Math.max(1, w), height: row - 9, rx: 2, class: 'bar' }, el('title', { text: `${label(item)}: ${fmt(value(item), 1)}${unit}` })),
        el('text', { x: m.l + w + 6, y: y + 15, class: 'value', text: `${fmt(value(item), value(item) < 10 ? 1 : 0)}${unit}` })];
    }));
}

function renderCharts(context, climate) {
  const { S, J } = context;
  $('curve-jezero').replaceChildren(lineChart(J.curve, { x: (p) => p.level_m, y: (p) => p.area_km2, xLabel: 'Water level, m (MOLA)', yLabel: 'Lake area, km²',
    marks: [{ at: J.lake.level_m, label: `3D view ${fmt(J.lake.level_m)} m`, left: true }] }));
  $('curve-salda').replaceChildren(lineChart(S.curve, { x: (p) => p.level_m, y: (p) => p.area_km2, xLabel: 'Water level, m above sea level', yLabel: 'Lake area, km²',
    marks: [{ at: S.lake.level_m, label: 'today' }, { at: S.spill.level_m, label: 'overflow', left: true }] }));
  const slopeLabel = (c) => (c.to_deg === null ? `${c.from_deg}° and over` : `${c.from_deg} to ${c.to_deg}°`);
  for (const [id, basin] of [['slope-salda', S], ['slope-jezero', J]]) {
    $(id).replaceChildren(barChart(basin.slope.classes, { label: slopeLabel, value: (c) => c.share * 100, unit: '%', max: 40, title: `Share of land in each slope class, ${basin.name}` }));
  }
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const name = (mo) => mo[0] + mo.slice(1).toLowerCase();
  $('climate-temp').replaceChildren(barChart(months.map((mo) => ({ mo, v: climate.monthly.T2M[mo] })), { label: (d) => name(d.mo), value: (d) => d.v, unit: ' °C', title: 'Monthly mean temperature at Lake Salda' }));
  $('climate-rain').replaceChildren(barChart(months.map((mo) => ({ mo, v: climate.monthly.PRECTOTCORR[mo] })), { label: (d) => name(d.mo), value: (d) => d.v, unit: ' mm/day', title: 'Monthly precipitation at Lake Salda' }));
}

// ---- section 3: the assessment ------------------------------------------------------

function renderAssessment(context, analogs) {
  $('assessment').replaceChildren(
    el('thead', {}, el('tr', {}, el('th', { text: 'Feature of Lake Salda' }), el('th', { text: 'What it can help with' }), el('th', { text: 'How well supported' }), el('th', { text: 'Where it stops' }))),
    el('tbody', {}, report.assessment.map((item) => el('tr', {},
      el('td', {}, el('b', { text: item.feature })),
      el('td', { text: fill(item.helps, context) }),
      el('td', {}, el('span', { class: `support support-${item.support}`, text: report.support[item.support] }), el('p', { text: fill(item.why, context) }), sources(item.sources)),
      el('td', { text: fill(item.limit, context) })))));
  $('cannot').replaceChildren(...report.cannot.map((text) => el('li', { text })));
  $('recommendations').replaceChildren(...report.recommendations.map((text) => el('li', { text })));

  // The lakes around Salda, from our own ranking.
  const all = analogs.analogs, salda = all.find((a) => a.name === 'Lake Salda');
  const km = (a, b) => {
    const p1 = (a.lat * Math.PI) / 180, p2 = (b.lat * Math.PI) / 180, dl = ((b.lon - a.lon) * Math.PI) / 180;
    return 2 * 6371 * Math.asin(Math.sqrt(Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2));
  };
  const near = all.map((a, index) => ({ a, rank: index + 1, d: km(salda, a) })).filter((x) => x.a !== salda && x.d <= 110).sort((x, y) => x.d - y.d);
  const labelOf = (key) => (analogs.variables[key] || {}).label || key;
  $('near-count').textContent = `${near.length} lakes within 110 km of Lake Salda are in our ranking of ${all.length} places. ${near.filter((x) => !Object.keys(x.a.judged || {}).length).length} of them have no published evidence entered.`;
  $('nearby').replaceChildren(
    el('thead', {}, el('tr', {}, el('th', { text: 'Lake' }), el('th', { class: 'num', text: 'From Salda' }), el('th', { class: 'num', text: 'Rank' }), el('th', { class: 'num', text: 'Score' }), el('th', { text: 'Published evidence entered' }))),
    el('tbody', {}, near.map(({ a, rank, d }) => {
      const keys = Object.keys(a.judged || {});
      return el('tr', {}, el('td', {}, el('b', { text: a.name })), el('td', { class: 'num', text: `${Math.round(d)} km` }),
        el('td', { class: 'num', text: `${rank} of ${all.length}` }), el('td', { class: 'num', text: a.score.toFixed(2) }),
        el('td', { class: keys.length ? '' : 'skip', text: keys.length ? keys.map(labelOf).join(', ') : 'none: not researched' }));
    })));
}

// ---- start ------------------------------------------------------------------------------

try {
  const [study, analogs, climateAll, terrain] = await Promise.all([
    json(new URL('salda_study.json', DATA)), json(new URL('analogs.json', DATA)),
    json(new URL('nasa/earth_climate.json', DATA)), json(new URL('sites.json', TERRAIN))]);
  report = await json(new URL('salda_report.json', DATA));
  const S = study.basins.find((b) => b.id === 'salda'), J = study.basins.find((b) => b.id === 'jezero');
  const climate = climateAll.sites.find((s) => s.name === 'Lake Salda');
  const target = analogs.targets.find((t) => t.id === 'jezero');
  for (const basin of [S, J]) { basin.curve_end = basin.curve[basin.curve.length - 1]; basin.site = terrain.sites.find((s) => s.id === basin.id); }
  const context = { S, J, ratio: { area: Math.round(J.lake.area_km2 / S.lake.area_km2) },
    C: { ...climate.annual, rain_year: Math.round(climate.annual.PRECTOTCORR * 365 / 10) * 10 }, M: target.features };

  renderReport(context);
  renderZones(context);
  renderInlets(context);
  renderCharts(context, climate);
  renderAssessment(context, analogs);
  const [saldaHeights, jezeroHeights] = await Promise.all([heights(S.site), heights(J.site)]);
  drawMap($('map-salda'), S, saldaHeights, report.zones);
  drawMap($('map-jezero'), J, jezeroHeights, report.zones);
  drawScale($('map-scale'), S, J, jezeroHeights);
  $('scale-note').textContent = `Lake Salda's outline today (${fmt(S.lake.area_km2, 1)} km², from ${S.dataset.split(',')[0]}) placed inside the lake our model gives Jezero `
    + `when filled to ${fmt(J.lake.level_m, 0)} m (${fmt(J.lake.area_km2, 0)} km²), both drawn at one scale. The Jezero lake is about ${context.ratio.area} times larger. `
    + `Salda's outline is observed; the Jezero lake is a model, not a measured shoreline.`;
  setUpSwitch();
  $('map-note').textContent = `Elevation: ${S.dataset} (one reading every ${Math.round(S.cell_m)} m) and ${J.dataset} (every ${Math.round(J.cell_m)} m). `
    + `The maps are not at the same scale: Salda's is ${S.width_km} km across, Jezero's ${J.width_km} km.`;
  $('generated').textContent = `Basin analysis run ${study.generated_at.slice(0, 10)} by ${study.produced_by}. ${report.produced_by}`;
  $('status').hidden = true;
} catch (error) {
  console.error(error);
  $('status').textContent = `Could not load the study: ${error.message}. Open this page through a web server started in the repo root.`;
}
