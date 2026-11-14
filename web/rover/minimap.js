// A small north-up map of the active 3D site: terrain, the rover and the evidence points.
// AI-generated: written by Claude (Anthropic, Claude Code) on 2026-11-14. Review before use.
//
// The picture is baked once per site from the same colours and heights the 3D
// ground uses, so it always agrees with the scene. Only the rover arrow and the
// markers are redrawn, a few times a second.

import { WORLD } from './terrain.js';

const INK = '#16202b', ACCENT = '#a3380d', PAPER = '#ffffff';
const toByte = (c) => Math.round(255 * Math.min(1, Math.max(0, c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)));

// One image per site and view: the ground colours with a little hill shading (light from the north-west).
function bake(map, colours) {
  const { n, heights } = map;
  const image = new ImageData(n, n);
  const cell = WORLD / (n - 1);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      const west = heights[j * n + Math.max(0, i - 1)], east = heights[j * n + Math.min(n - 1, i + 1)];
      const north = heights[Math.max(0, j - 1) * n + i], south = heights[Math.min(n - 1, j + 1) * n + i];
      const shade = Math.min(1.35, Math.max(0.55, 1 - ((west - east) + (north - south)) / (2 * cell) * 0.9));
      image.data[k * 4] = toByte(colours[k * 3] * shade);
      image.data[k * 4 + 1] = toByte(colours[k * 3 + 1] * shade);
      image.data[k * 4 + 2] = toByte(colours[k * 3 + 2] * shade);
      image.data[k * 4 + 3] = 255;
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = n;
  canvas.getContext('2d').putImageData(image, 0, 0);
  return canvas;
}

const niceKm = (width) => [50, 20, 10, 5, 2, 1].find((km) => km <= width / 3) || 1;

export function createMinimap(canvas, caption) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;                       // backing pixels; CSS shows it at half this for sharpness
  const baked = new Map();                         // terrain -> { today, ancient }
  let terrain = null;
  const at = (v) => (v / WORLD + 0.5) * size;      // scene x or z to canvas x or y (north is up)

  return {
    setTerrain(next) {
      terrain = next;
      if (!baked.has(next)) {
        baked.set(next, { today: bake(next.map, next.map.today), ancient: next.map.ancient ? bake(next.map, next.map.ancient) : null });
      }
    },
    // points: [{ x, z, found }]. ancient: draw the simulated lake instead of today's ground.
    draw(state, points, ancient) {
      if (!terrain) return;
      const layers = baked.get(terrain);
      const simulated = ancient && layers.ancient;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(simulated ? layers.ancient : layers.today, 0, 0, size, size);

      // Scale bar and north mark.
      const km = niceKm(terrain.site.width_km), bar = (km / terrain.site.width_km) * size;
      ctx.font = `500 ${size * 0.058}px "IBM Plex Mono", ui-monospace, monospace`;
      ctx.textBaseline = 'alphabetic';
      ctx.lineWidth = size * 0.012;
      ctx.strokeStyle = PAPER; ctx.fillStyle = INK;
      const text = (label, x, y) => { ctx.strokeText(label, x, y); ctx.fillText(label, x, y); };
      ctx.lineJoin = 'round';
      text(`${km} km`, size * 0.05, size * 0.925);
      ctx.fillStyle = PAPER; ctx.fillRect(size * 0.05 - 1, size * 0.945 - 1, bar + 2, size * 0.02 + 2);
      ctx.fillStyle = INK; ctx.fillRect(size * 0.05, size * 0.945, bar, size * 0.02);
      text('N', size * 0.9, size * 0.1);

      // Evidence points: white until read, rust once read.
      for (const point of points) {
        ctx.beginPath();
        ctx.arc(at(point.x), at(point.z), size * 0.018, 0, Math.PI * 2);
        ctx.fillStyle = point.found ? ACCENT : PAPER;
        ctx.fill();
        ctx.lineWidth = size * 0.007;
        ctx.strokeStyle = point.found ? PAPER : INK;
        ctx.stroke();
      }

      // The rover: an arrow pointing the way it faces.
      ctx.save();
      ctx.translate(at(state.x), at(state.z));
      ctx.rotate(Math.PI - state.heading);
      const r = size * 0.045;
      ctx.beginPath();
      ctx.moveTo(0, -r); ctx.lineTo(r * 0.72, r * 0.8); ctx.lineTo(0, r * 0.38); ctx.lineTo(-r * 0.72, r * 0.8);
      ctx.closePath();
      ctx.fillStyle = ACCENT; ctx.fill();
      ctx.lineWidth = size * 0.012; ctx.strokeStyle = PAPER; ctx.stroke();
      ctx.restore();

      if (caption) caption.textContent = simulated ? 'Map · north up · simulated lake' : 'Map · north up';
    },
  };
}
