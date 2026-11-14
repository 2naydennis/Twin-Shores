// Method page: fills the tables from the pipeline's output files.
// AI-generated: written by Claude (Anthropic, Claude Code) on 2026-11-14. Review before use.

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

function table(id, head, rows) {
  document.getElementById(id).replaceChildren(
    el('thead', {}, el('tr', {}, head.map(([text, cls]) => el('th', { class: cls, text })))),
    el('tbody', {}, rows.map((cells) => el('tr', {}, cells.map((cell, i) =>
      (cell instanceof Node ? el('td', { class: head[i][1] }, cell) : el('td', { class: head[i][1], text: cell })))))));
}
const bar = (pct, cls = '') => el('span', {}, el('span', { class: `pct ${cls}` }, el('i', { style: `width:${pct}%` })), `${Math.round(pct)}%`);
const short = (name) => name.replace(/^Lake /, '');

try {
  const [analogs, sensitivity, slope] = await Promise.all([load('analogs.json'), load('sensitivity.json'), load('slope_crosscheck.json')]);
  const target = analogs.targets[0];
  const places = analogs.analogs.filter((a) => a.target_id === target.id);
  document.getElementById('n-places').textContent = places.length;
  document.getElementById('n-draws').textContent = sensitivity.random_weights.draws.toLocaleString('en');

  table('top-table',
    [['Rank', 'num'], ['Place', ''], ['Score', 'num'], ['Variables', 'num'], ['Status', '']],
    places.slice(0, 10).map((p, i) => [String(i + 1), p.name, p.score.toFixed(3), p.coverage.replace(' variables', ''),
      p.known_analog ? el('span', { class: 'tag known', text: 'Listed by NASA' }) : el('span', { class: 'tag', text: 'Candidate' })]));

  table('var-table',
    [['Variable', ''], ['Kind', ''], [target.name, 'num'], ['Source', '']],
    Object.entries(analogs.variables).map(([key, v]) => {
      const value = target.features[key];
      const shown = v.kind === 'judged' ? 'from studies' : (value === null || value === undefined ? 'no value' : `${value} ${v.unit}`);
      return [v.label, v.kind === 'judged' ? 'Published studies' : 'Measured', shown, v.source || 'Match entered from a cited study'];
    }));

  table('weights-table',
    [['Place', ''], ['In the top 3', ''], ['In the top 5', '']],
    sensitivity.random_weights.places.slice(0, 8).map((p) => [p.name, bar(p.top3_pct), bar(p.top5_pct, 'grey')]));

  table('loo-table',
    [['Variable removed', ''], ['Top five that remain', '']],
    Object.entries(sensitivity.leave_one_variable_out.top5).map(([key, names]) =>
      [(analogs.variables[key] || {}).label || key, names.map(short).join(' · ')]));

  // Live re-ranking with the visitor's own weights, same rule as pipeline/score.py:
  // a weighted average of the matches each place has.
  const variables = analogs.variables;
  const weights = Object.fromEntries(Object.keys(variables).map((k) => [k, variables[k].weight ?? 1]));
  const baseOrder = places.map((p) => p.name);
  const rerank = () => {
    const scored = places.map((p) => {
      let total = 0, sum = 0;
      for (const [k, m] of Object.entries(p.feature_match)) { total += weights[k]; sum += weights[k] * m; }
      return { p, score: total ? sum / total : 0 };
    }).sort((a, b) => b.score - a.score);
    table('live-table', [['Rank', 'num'], ['Place', ''], ['Score', 'num'], ['Change', 'num']],
      scored.slice(0, 10).map(({ p, score }, i) => {
        const moved = baseOrder.indexOf(p.name) - i;
        return [String(i + 1), p.name, score.toFixed(3),
          el('span', { class: 'moved', text: moved > 0 ? `▲ ${moved}` : moved < 0 ? `▼ ${-moved}` : '·' })];
      }));
  };
  document.getElementById('sliders').replaceChildren(...Object.entries(variables).map(([k, v]) => {
    const input = el('input', { type: 'range', min: '0', max: '3', step: '0.5', value: String(weights[k]), 'aria-label': `Weight of ${v.label}` });
    const out = el('output', { text: String(weights[k]) });
    input.addEventListener('input', () => { weights[k] = Number(input.value); out.textContent = input.value; rerank(); });
    return el('label', {}, el('span', { text: v.label }), input, out);
  }));
  rerank();

  const s = slope.summary;
  const stat = (value, label) => el('div', {}, el('b', { text: value }), el('span', { text: label }));
  document.getElementById('slope-stats').replaceChildren(
    stat(String(s.places_compared), 'lakes measured with both models'),
    stat(s.correlation.toFixed(3), 'correlation between the two'),
    stat(`${s.median_absolute_difference_deg}°`, 'median difference in slope'),
    stat(`${s.largest_difference_deg}°`, 'largest difference, at a coastal lagoon'));

  const measuredOnly = (p) => ['temperature', 'pressure', 'slope'].reduce((sum, k) => sum + (p.feature_match[k] ?? 0), 0) / 3;
  const byMeasured = [...places].sort((a, b) => measuredOnly(b) - measuredOnly(a));
  table('known-table',
    [['Known analog', ''], ['Rank, all variables', 'num'], ['Rank, climate and slope only', 'num']],
    places.filter((p) => p.known_analog).map((p) => [p.name, `${places.indexOf(p) + 1} of ${places.length}`, `${byMeasured.indexOf(p) + 1} of ${places.length}`]));
} catch (error) {
  console.error(error);
  document.querySelector('main').prepend(el('p', { class: 'formula', text:
    `Could not load the results: ${error.message}. Open this page through a web server started in the repo root.` }));
}
