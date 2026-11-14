// Lake Salda vs Jezero page: maps, elevation profiles, evidence and field cards.
// AI-generated: written by Claude (Anthropic, Claude Code) on 2026-11-14. Review before use.

const load = async (name) => {
  const reply = await fetch(new URL(`../../data/${name}`, import.meta.url), { cache: 'no-cache' });
  if (!reply.ok) throw new Error(`data/${name} answered ${reply.status}`);
  return reply.json();
};
const $ = (id) => document.getElementById(id);

// Text always goes in as text, never as HTML: names and notes come from outside sources.
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else node.setAttribute(key, value);
  }
  for (const child of children.flat(Infinity)) if (child !== null && child !== undefined && child !== false) node.append(child);
  return node;
}
const link = (url, text) => el('a', { href: url, target: '_blank', rel: 'noopener', text });
const host = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } };
const coord = (lat, lon) => `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`;

function maps(site, jezero) {
  const earth = L.map('map-salda', { zoomControl: true, attributionControl: true });
  earth.fitBounds([[site.lat - 0.07, site.lon - 0.09], [site.lat + 0.07, site.lon + 0.09]]);   // whole lake and its shore
  L.tileLayer('https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg', {
    maxNativeZoom: 14, maxZoom: 16,
    attribution: '<a href="https://s2maps.eu">Sentinel-2 cloudless 2020</a> by EOX, contains modified Copernicus Sentinel data (CC BY-NC-SA 4.0)',
  }).addTo(earth);
  L.control.scale({ imperial: false }).addTo(earth);

  // Mars Trek tiles use an equirectangular grid with two tiles across at zoom 0, which matches EPSG:4326.
  // Leaflet would measure distances on Earth's radius, so this map has no scale bar.
  const mars = L.map('map-jezero', { crs: L.CRS.EPSG4326, zoomControl: true });
  mars.fitBounds([[jezero.lat - 0.5, jezero.lon - 0.5], [jezero.lat + 0.5, jezero.lon + 0.5]]);   // the whole 47 km crater and its rim
  const trek = (id, ext, options) => L.tileLayer(`https://trek.nasa.gov/tiles/Mars/EQ/${id}/1.0.0/default/default028mm/{z}/{y}/{x}.${ext}`,
    { tileSize: 256, noWrap: true, ...options });
  trek('Mars_MGS_MOLA_ClrShade_merge_global_463m', 'jpg', { maxNativeZoom: 7, maxZoom: 14,
    attribution: '<a href="https://trek.nasa.gov/mars/">NASA Mars Trek</a>: MGS MOLA (NASA/JPL/GSFC)' }).addTo(mars);
  trek('Jezero_CTX_BlockAdj_dd', 'png', { maxNativeZoom: 12, maxZoom: 14, bounds: [[15.9058, 75.1538], [19.4453, 78.8717]],
    attribution: 'MRO CTX (NASA/JPL-Caltech/MSSS)' }).addTo(mars);
  L.circleMarker([18.4447, 77.4508], { radius: 5, color: '#fff', weight: 2, fillColor: '#a3380d', fillOpacity: 1 })
    .bindTooltip('Perseverance landing site', { direction: 'top' }).addTo(mars);
}

function profile(twin) {
  // Both profiles relative to their own lowest point, on one vertical scale, so the basins compare by shape.
  const W = 960, H = 280, padL = 46, padB = 26, padT = 12;
  const series = [
    { key: 'salda', color: '#2f8fb0', label: 'Lake Salda (SRTM)' },
    { key: 'jezero', color: '#a3380d', label: 'Jezero Crater (MOLA)' },
  ].map((s) => {
    const points = twin[s.key].points;
    const low = Math.min(...points.map((p) => p.m));
    return { ...s, points: points.map((p) => ({ km: p.km, h: p.m - low })) };
  });
  const maxKm = Math.max(...series.flatMap((s) => s.points.map((p) => Math.abs(p.km))));
  const maxH = Math.max(...series.flatMap((s) => s.points.map((p) => p.h)));
  const x = (km) => padL + ((km + maxKm) / (2 * maxKm)) * (W - padL - 10);
  const y = (h) => H - padB - (h / maxH) * (H - padB - padT);
  const svg = [`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="West-east elevation profiles of Lake Salda and Jezero Crater">`];
  for (let h = 0; h <= maxH; h += 200) svg.push(`<line class="axis" x1="${padL}" x2="${W - 10}" y1="${y(h)}" y2="${y(h)}"/><text x="4" y="${y(h) + 4}">${h} m</text>`);
  for (let km = -30; km <= 30; km += 10) if (Math.abs(km) <= maxKm) svg.push(`<text x="${x(km) - 12}" y="${H - 6}">${km} km</text>`);
  for (const s of series) {
    const d = s.points.map((p, i) => `${i ? 'L' : 'M'}${x(p.km).toFixed(1)},${y(p.h).toFixed(1)}`).join('');
    svg.push(`<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.2"/>`);
  }
  svg.push(`<g transform="translate(${padL + 10},${padT + 6})"><rect width="12" height="3" y="4" fill="#2f8fb0"/><text x="18" y="9">Lake Salda (SRTM)</text>`
    + `<rect width="12" height="3" y="22" fill="#a3380d"/><text x="18" y="27">Jezero Crater (MOLA)</text></g></svg>`);
  $('profile').innerHTML = svg.join('');   // built only from numbers above
  $('profile-note').textContent = 'West to east through each site centre, heights above each profile\'s lowest point. '
    + 'Jezero is the wider basin. Salda\'s floor shows the flat lake surface, since SRTM measures the water, not the lake bed: '
    + 'the lake itself is about 180 m deep.';
  $('profile').append(el('figcaption', { text: 'Sources: NASA SRTM 1 arc second and MGS MOLA MEGDR, as used in the 3D terrain page.' }));
}

function evidence(data, site, target) {
  const rows = Object.entries(data.variables).map(([key, v]) => {
    const fact = (site.judged || {})[key];
    const value = (site.values || {})[key];
    const here = v.kind === 'judged' ? (fact ? fact.note : 'No study found') : (value ?? 'n/a') + (v.unit && v.unit !== 'match' ? ` ${v.unit}` : '');
    const there = v.kind === 'judged' ? (target.judged_reference || {})[key] || '' : `${target.features[key] ?? 'no value'}${target.features[key] != null ? ` ${v.unit}` : ''}`;
    const match = site.feature_match[key];
    return [v.label, here, there, match === undefined ? 'not scored' : match.toFixed(2), fact && fact.source];
  });
  $('evidence').replaceChildren(
    el('thead', {}, el('tr', {}, ['Variable', 'Lake Salda', 'Jezero Crater', 'Match'].map((t, i) => el('th', { class: i === 3 ? 'num' : '', text: t })))),
    el('tbody', {}, rows.map(([label, here, there, match, source]) => el('tr', {},
      el('td', { text: label }),
      el('td', {}, here, source ? [' ', link(source, host(source))] : null),
      el('td', { class: 'skip', text: there }),
      el('td', { class: 'num', text: match })))));
}

function fieldCard(card) {
  const a = card.access;
  const stat = (big, small) => el('div', {}, el('b', { text: big }), el('span', { text: small }));
  $('access').replaceChildren(
    stat(`${a.airport.distance_km} km`, `to ${a.airport.name} (${a.airport.iata})`),
    stat(`${a.city.distance_km} km`, `to ${a.city.name}, the nearest town of 100,000 or more`),
    stat(card.season.field_season.length ? card.season.field_season.map((m) => m.slice(0, 3)).join(', ') : 'none', 'field season, from NASA POWER climate'));
  $('tests').replaceChildren(...card.tests.map((t) => el('li', {}, el('b', { text: t.evidence }), t.test, ' ',
    el('span', { class: 'muted', text: `Based on: ${t.based_on}. ` }), link(t.source, host(t.source)))));
  $('tests-note').textContent = `${card.tests_note} ${card.not_analog_for}`;
  $('gaps').replaceChildren(...card.gaps.map((g) => el('li', {}, el('b', { text: g.variable }), `: ${g.why}.`)));
}

function others(cards) {
  $('others').replaceChildren(
    el('thead', {}, el('tr', {}, ['Rank', 'Site', 'Airport', 'Town', 'Field season', 'Tests it supports', 'Unchecked'].map((t) => el('th', { text: t })))),
    el('tbody', {}, cards.map((c) => el('tr', {},
      el('td', { class: 'num', text: String(c.rank) }),
      el('td', {}, el('a', { href: `index.html#${c.name.toLocaleLowerCase('en').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').replace(/[^a-z0-9.]+/g, '-')}-${c.lat.toFixed(2)}`, text: c.name })),
      el('td', { text: `${c.access.airport.iata} · ${c.access.airport.distance_km} km` }),
      el('td', { text: `${c.access.city.name} · ${c.access.city.distance_km} km` }),
      el('td', { text: c.season.field_season.map((m) => m.slice(0, 3)).join(', ') || 'none' }),
      el('td', { text: c.tests.map((t) => t.evidence).join('; ') || 'none yet' }),
      el('td', { text: c.gaps.filter((g) => g.why.startsWith('no published')).map((g) => g.variable).join(', ') || 'none' })))));
}

try {
  const [data, cards, twin] = await Promise.all([load('analogs.json'), load('site_cards.json'), load('twin_salda.json')]);
  const target = data.targets[0];
  const places = data.analogs.filter((a) => a.target_id === target.id);
  const salda = places.find((a) => a.name === 'Lake Salda');
  $('rank').textContent = places.indexOf(salda) + 1;
  $('salda-coord').textContent = coord(salda.lat, salda.lon);
  $('jezero-coord').textContent = coord(target.lat, target.lon);
  maps(salda, target);
  profile(twin);
  evidence(data, salda, target);
  fieldCard(cards.cards.find((c) => c.name === 'Lake Salda'));
  others(cards.cards.filter((c) => c.name !== 'Lake Salda'));
} catch (error) {
  console.error(error);
  document.querySelector('main').prepend(el('p', { class: 'ask', text: `Could not load the data: ${error.message}.` }));
}
