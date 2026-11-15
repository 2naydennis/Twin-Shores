// Sources page: builds the list of published studies from the pipeline's output files,
// so the list always matches the evidence behind the scores.
// AI-generated: written by Claude (Anthropic, Claude Code) on 2026-11-15. Review before use.

const load = async (name) => {
  const reply = await fetch(new URL(`../../data/${name}`, import.meta.url), { cache: 'no-cache' });
  if (!reply.ok) throw new Error(`data/${name} answered ${reply.status}`);
  return reply.json();
};

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

// The `checked` field is free text written when each source was opened; reduce it to three levels.
const RANK = { read: 3, opened: 2, summary: 1 };
function level(checked = '') {
  const c = checked.toLowerCase();
  if (c.startsWith('read') || c === 'team data') return 'read';
  if (c.startsWith('source opened') || c.includes('not confirm')) return 'opened';
  return 'summary';
}

function linkText(url) {
  try {
    const u = new URL(url);
    const path = decodeURIComponent(u.pathname).replace(/\/$/, '');
    const tail = path.length > 46 ? `${path.slice(0, 44)}…` : path;
    return u.hostname.replace(/^www\./, '') + tail;
  } catch { return url; }
}

const tag = (lvl) => el('b', { class: `tag ${lvl}`, text: lvl });

function stat(value, label) {
  return el('div', {}, el('b', { text: String(value) }), el('span', { text: label }));
}

async function main() {
  const [analogs, report] = await Promise.all([load('analogs.json'), load('salda_report.json')]);
  const labels = Object.fromEntries(Object.entries(analogs.variables).map(([k, v]) => [k, v.label]));

  // One row per source URL, with every place and variable it supports.
  const byUrl = new Map();
  for (const site of analogs.analogs) {
    for (const [variable, entry] of Object.entries(site.judged || {})) {
      const lvl = level(entry.checked);
      const urls = [entry.source, ...(entry.also || []).map((a) => (typeof a === 'string' ? a : a?.source))].filter(Boolean);
      for (const url of urls) {
        const row = byUrl.get(url) || { url, places: new Set(), variables: new Set(), level: 'summary' };
        row.places.add(site.name);
        row.variables.add(labels[variable] || variable);
        if (RANK[lvl] > RANK[row.level]) row.level = lvl;
        byUrl.set(url, row);
      }
    }
  }
  const rows = [...byUrl.values()].sort((a, b) =>
    RANK[b.level] - RANK[a.level] || b.places.size - a.places.size || a.url.localeCompare(b.url));
  const count = (lvl) => rows.filter((r) => r.level === lvl).length;
  const places = new Set(rows.flatMap((r) => [...r.places]));

  document.getElementById('study-table').replaceChildren(
    el('thead', {}, el('tr', {}, ['Source', 'Places', 'Variables', 'Read'].map((t) => el('th', { text: t })))),
    el('tbody', {}, rows.map((r) => el('tr', {},
      el('td', {}, el('a', { href: r.url, target: '_blank', rel: 'noopener', title: r.url, text: linkText(r.url) })),
      el('td', { text: [...r.places].join(', ') }),
      el('td', { text: [...r.variables].join(', ') }),
      el('td', {}, tag(r.level))))));
  document.getElementById('study-caption').textContent =
    `${rows.length} sources behind the judged variables of ${places.size} places: ${count('read')} read, ` +
    `${count('opened')} opened but not confirmed, ${count('summary')} seen only as a summary. ` +
    `Built from data/analogs.json, generated ${analogs.generated_at.slice(0, 10)}.`;

  const reportRows = Object.values(report.sources);
  document.getElementById('report-table').replaceChildren(
    el('thead', {}, el('tr', {}, ['Source', 'Read'].map((t) => el('th', { text: t })))),
    el('tbody', {}, reportRows.map((s) => el('tr', {},
      el('td', {}, el('a', { href: s.url, target: '_blank', rel: 'noopener', text: s.label })),
      el('td', {}, s.checked === 'team data' ? el('b', { class: 'tag read', text: 'our data' }) : tag(level(s.checked)))))));

  document.getElementById('source-stats').replaceChildren(
    stat(9, 'NASA datasets and services'),
    stat(2, 'ESA Copernicus datasets'),
    stat(rows.length + reportRows.length, 'study and source links'),
    stat(count('read'), 'study sources opened, read and supporting'));
}

main().catch((error) => {
  document.getElementById('study-caption').textContent = `Could not load the source list: ${error.message}`;
});
