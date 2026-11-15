"""Run the same basin analysis on Lake Salda and Jezero Crater and write data/salda_study.json.

AI-generated: written by Claude (Anthropic) on 2026-11-15. Review before use.

Standard library only. Run from the repo root:

    python3 pipeline/salda_study.py

Input: the two heightmaps the 3D page uses (web/rover/terrain/), which are NASA
elevation data resampled to a square grid: SRTM for Lake Salda, MOLA for Jezero.

For each basin, with one method on both worlds:

  lake         Salda: the flat lake surface in SRTM. Jezero: the basin filled to
               JEZERO_LEVEL_M, the level the 3D page's ancient-lake view uses.
  spill        How high water must stand before it leaves the basin, and where.
               Found by "priority flooding" from the map edge: water rises from
               the edges inward, always through the lowest unvisited cell, so the
               level at which it first reaches the lake is the overflow level.
  catchment    The cells that drain into the lake, found by flooding again from
               the lake and the map edge together. Only the part inside the map.
  inlets       Where the largest drainage lines enter the lake, with the area
               upstream of each (again inside the map only).
  curve        Lake area and volume at each water level up to the spill level.
               SRTM has no lake bed, so Salda's curve starts at today's level.
  slope        Share of the land in each slope class, on a baseline of about
               half a kilometre on both worlds.

Everything here is computed, not measured in the field: it is a model on
elevation grids of very different resolution (39 m cells for Salda, 250 m for
Jezero). No published value is used except the two lake levels.
"""

import base64
import heapq
import json
import math
import struct
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TERRAIN = ROOT / "web" / "rover" / "terrain"
OUT = ROOT / "data" / "salda_study.json"

RADIUS_KM = {"earth": 6371.0, "mars": 3396.0}
JEZERO_LEVEL_M = -2430          # same as LOOK.jezero.ancient.level_m in web/rover/terrain.js
SLOPE_BASELINE_M = 250          # spacing of the points slope is measured between
SLOPE_BINS = [0, 1, 2, 5, 10, 20]   # degrees; the last class is "20 and over"
NEIGHBOURS = [(-1, -1), (0, -1), (1, -1), (-1, 0), (1, 0), (-1, 1), (0, 1), (1, 1)]


def load(site):
    n = site["grid"]
    raw = (TERRAIN / site["file"]).read_bytes()
    span = site["max_m"] - site["min_m"]
    return [site["min_m"] + v / 65535 * span for v in struct.unpack(f"<{n * n}H", raw)]


def around(k, n):
    i, j = k % n, k // n
    for di, dj in NEIGHBOURS:
        x, y = i + di, j + dj
        if 0 <= x < n and 0 <= y < n:
            yield y * n + x


def priority_flood(height, n, seeds):
    """Flood upward from the seed cells. Returns the water level at which each cell is
    reached, the cell it was reached from, which seed group it belongs to, and the order."""
    level = [None] * (n * n)
    parent = [-1] * (n * n)
    group = [None] * (n * n)
    heap, order = [], []
    for k, name in seeds.items():
        level[k], group[k] = height[k], name
        heap.append((height[k], k))
    heapq.heapify(heap)
    while heap:
        at, k = heapq.heappop(heap)
        order.append(k)
        for nb in around(k, n):
            if level[nb] is None:
                level[nb] = max(height[nb], at)
                parent[nb], group[nb] = k, group[k]
                heapq.heappush(heap, (level[nb], nb))
    return level, parent, group, order


def connected(n, start, inside):
    """Cells reachable from `start` through cells for which inside(k) is true."""
    if not inside(start):
        return set()
    seen, stack = {start}, [start]
    while stack:
        k = stack.pop()
        i = k % n
        for nb in (k - 1, k + 1, k - n, k + n):
            if 0 <= nb < n * n and nb not in seen and abs(nb % n - i) <= 1 and inside(nb):
                seen.add(nb)
                stack.append(nb)
    return seen


def analyse(site):
    n, body = site["grid"], site["body"]
    height = load(site)
    cell_m = site["width_km"] * 1000 / (n - 1)
    cell_km2 = (cell_m / 1000) ** 2
    km_per_deg = 2 * math.pi * RADIUS_KM[body] / 360
    centre = (n // 2) * n + n // 2
    edge = {k for k in range(n * n) if k % n in (0, n - 1) or k // n in (0, n - 1)}

    def place(k):
        i, j = k % n, k // n
        lat = site["lat"] + (0.5 - j / (n - 1)) * site["width_km"] / km_per_deg
        lon = site["lon"] + (i / (n - 1) - 0.5) * site["width_km"] / (km_per_deg * math.cos(math.radians(site["lat"])))
        return {"lat": round(lat, 4), "lon": round(lon, 4), "x": round(i / (n - 1), 4), "y": round(j / (n - 1), 4)}

    # 1. Spill level: flood from the map edge until the water reaches the basin's centre.
    level, parent, _, _ = priority_flood(height, n, {k: "edge" for k in edge})
    spill_level = level[centre]
    basin = connected(n, centre, lambda k: level[k] == spill_level)      # every cell that fills before the overflow
    k = centre
    while parent[k] != -1 and height[k] < spill_level - 1e-6:            # walk out of the basin to the sill itself
        k = parent[k]
    sill = k

    # 2. The lake.
    if body == "earth":
        lake_level = site["lake_level_m"]
        lake = connected(n, centre, lambda c: abs(height[c] - lake_level) < 0.75)
        lake_note = "the flat lake surface recorded by SRTM"
    else:
        lake_level = JEZERO_LEVEL_M
        lake = connected(n, centre, lambda c: height[c] <= lake_level)
        lake_note = f"the basin filled to {lake_level} m, the level used by the 3D page's ancient-lake view; a model, not a measured shoreline"

    # 3. Catchment and inlets: flood from the lake and the map edge together.
    seeds = {c: "edge" for c in edge}
    seeds.update({c: "lake" for c in lake})
    _, parent2, group, order = priority_flood(height, n, seeds)
    upstream = [1] * (n * n)
    for c in reversed(order):
        if parent2[c] != -1:
            upstream[parent2[c]] += upstream[c]
    catchment = [c for c in range(n * n) if group[c] == "lake" and c not in lake]
    touches_edge = any(group[nb] == "edge" for c in catchment for nb in around(c, n))
    mouths = sorted((c for c in catchment if parent2[c] in lake), key=lambda c: -upstream[c])
    inlets, apart = [], 0.07 * n
    for c in mouths:
        if upstream[c] * cell_km2 < 0.02 * len(catchment) * cell_km2 or len(inlets) == 5:
            break
        if all(math.hypot(c % n - m % n, c // n - m // n) > apart for m in (x["cell"] for x in inlets)):
            inlets.append({"cell": c, "upstream_km2": round(upstream[c] * cell_km2, 1), **place(c)})
    for rank, inlet in enumerate(inlets, 1):
        inlet["rank"] = rank
        del inlet["cell"]

    # 4. Lake area and volume against water level, up to the spill level.
    lowest = lake_level if body == "earth" else min(height[c] for c in basin)
    steps = 40
    curve = []
    for s in range(steps + 1):
        at = lowest + (spill_level - lowest) * s / steps
        under = [c for c in basin if height[c] <= at]
        curve.append({"level_m": round(at, 1), "area_km2": round(len(under) * cell_km2, 2),
                      "volume_km3": round(sum(at - height[c] for c in under) * cell_km2 / 1000, 3)})

    # 5. Slope classes on land, measured between points about SLOPE_BASELINE_M apart.
    step = max(1, round(SLOPE_BASELINE_M / cell_m))
    slopes = []
    for j in range(step, n - step, step):
        for i in range(step, n - step, step):
            c = j * n + i
            if body == "earth" and c in lake:
                continue
            dx = (height[c + step] - height[c - step]) / (2 * step * cell_m)
            dy = (height[c + step * n] - height[c - step * n]) / (2 * step * cell_m)
            slopes.append(math.degrees(math.atan(math.hypot(dx, dy))))
    slopes.sort()
    shares = []
    for b, low in enumerate(SLOPE_BINS):
        high = SLOPE_BINS[b + 1] if b + 1 < len(SLOPE_BINS) else None
        count = sum(1 for s in slopes if s >= low and (high is None or s < high))
        shares.append({"from_deg": low, "to_deg": high, "share": round(count / len(slopes), 4)})

    # 6. A map of the lake and its catchment for the web page: 0 other, 1 catchment, 2 lake, two bits per cell.
    lake_set, catch_set = lake, set(catchment)
    packed = bytearray((n * n + 3) // 4)
    for c in range(n * n):
        value = 2 if c in lake_set else 1 if c in catch_set else 0
        packed[c // 4] |= value << ((c % 4) * 2)

    return {
        "id": site["id"], "name": site["name"], "body": body, "grid": n, "width_km": site["width_km"],
        "cell_m": round(cell_m, 1), "dataset": site["dataset"],
        "lake": {"level_m": lake_level, "area_km2": round(len(lake) * cell_km2, 1), "what": lake_note},
        "spill": {"level_m": round(spill_level, 1), "above_lake_m": round(spill_level - lake_level, 1),
                  "lake_area_at_spill_km2": curve[-1]["area_km2"], **place(sill)},
        "catchment": {"area_km2": round(len(catchment) * cell_km2, 1),
                      "times_lake_area": round(len(catchment) / len(lake), 1),
                      "cut_by_map_edge": touches_edge},
        "inlets": inlets,
        "curve": curve,
        "slope": {"baseline_m": round(2 * step * cell_m), "median_deg": round(slopes[len(slopes) // 2], 2),
                  "points": len(slopes), "classes": shares},
        "relief": {"lowest_m": round(min(height), 0), "highest_m": round(max(height), 0),
                   "basin_floor_m": round(sorted(height[c] for c in basin)[len(basin) // 2], 0)},
        "mask": {"encoding": "two bits per cell, row by row from the north-west corner, least significant bits first; "
                             "0 = other land, 1 = catchment, 2 = lake", "base64": base64.b64encode(bytes(packed)).decode()},
    }


def main():
    sites = {s["id"]: s for s in json.loads((TERRAIN / "sites.json").read_text(encoding="utf-8"))["sites"]}
    result = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "produced_by": "pipeline/salda_study.py",
        "note": "Computed from elevation grids with one method on both worlds. Model results, not field measurements. "
                "Catchments and upstream areas count only the part inside each map. The two grids differ in "
                "resolution (see cell_m), so small features on Jezero are not resolved.",
        "basins": [analyse(sites["salda"]), analyse(sites["jezero"])],
    }
    OUT.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}")
    for b in result["basins"]:
        print(f"\n{b['name']}  ({b['grid']} x {b['grid']}, {b['cell_m']} m cells)")
        print(f"  lake       {b['lake']['area_km2']} km2 at {b['lake']['level_m']} m")
        print(f"  spill      {b['spill']['level_m']} m, {b['spill']['above_lake_m']} m above the lake, at "
              f"{b['spill']['lat']}, {b['spill']['lon']} (map x {b['spill']['x']}, y {b['spill']['y']}); "
              f"lake would cover {b['spill']['lake_area_at_spill_km2']} km2")
        print(f"  catchment  {b['catchment']['area_km2']} km2 = {b['catchment']['times_lake_area']} x the lake; "
              f"cut by the map edge: {b['catchment']['cut_by_map_edge']}")
        for inlet in b["inlets"]:
            print(f"  inlet {inlet['rank']}    {inlet['upstream_km2']} km2 upstream, at {inlet['lat']}, {inlet['lon']} "
                  f"(map x {inlet['x']}, y {inlet['y']})")
        print(f"  slope      median {b['slope']['median_deg']} deg over {b['slope']['baseline_m']} m; "
              + ", ".join(f"{c['from_deg']}+: {c['share'] * 100:.0f}%" for c in b["slope"]["classes"]))
        print(f"  volume at spill {b['curve'][-1]['volume_km3']} km3; basin floor {b['relief']['basin_floor_m']} m")


if __name__ == "__main__":
    main()
