"""Score Earth candidates against Moon and Mars targets and write data/analogs.json.

AI-generated: written by Claude (Anthropic) on 2026-11-14. Review before use.
The variables, weights, targets and candidates are the team's choices and live
in pipeline/config.json. This script only measures and compares.

Standard library only. Run from the repo root:

    python3 pipeline/score.py

How a score is made:

  measured variable  similarity = 1 - |candidate - target| / spread, where
                     spread is the gap between the largest and smallest value
                     of that variable among the target and all candidates.
  judged variable    the 0 to 1 match the team entered in config.json.
  total score        weighted average over the variables that have a value on
                     both sides. "coverage" says how many variables that was.

Measurements are cached in pipeline/raw/measurements.json, so a second run
only fetches what is new.
"""

import json
import math
import time
import urllib.parse
from datetime import datetime, timezone

from fetch_nasa import POWER_URL, RAW, ROOT, http_get, read_int16

CONFIG = ROOT / "pipeline" / "config.json"
CACHE = RAW / "measurements.json"
OUT = ROOT / "data" / "analogs.json"

GRID_N = 10          # slope is measured on a 10 x 10 grid of points...
GRID_STEP_M = 900    # ...900 m apart, the same on Earth and Mars
EARTH_RADIUS_M = 6371000.0
MARS_RADIUS_M = 3396190.0

ELEVATION_API = "https://api.opentopodata.org/v1/aster30m"
MOLA = {
    "url": "https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg128/megt44n000hb.img",
    "ppd": 128, "lat_top": 44.0, "lat_bottom": 0.0, "lon_left": 0.0, "lon_right": 90.0, "cols": 11520,
}


def grid_points(lat, lon, radius_m):
    """Latitude and longitude of each point of the slope grid, row by row from the north."""
    m_per_deg_lat = 2 * math.pi * radius_m / 360
    m_per_deg_lon = m_per_deg_lat * math.cos(math.radians(lat))
    half = (GRID_N - 1) / 2
    return [(lat + (half - j) * GRID_STEP_M / m_per_deg_lat,
             lon + (i - half) * GRID_STEP_M / m_per_deg_lon)
            for j in range(GRID_N) for i in range(GRID_N)]


def mean_slope_deg(heights):
    """Average slope over the grid, from the height difference between neighbours."""
    slopes = []
    for j in range(1, GRID_N - 1):
        for i in range(1, GRID_N - 1):
            around = [heights[j * GRID_N + i - 1], heights[j * GRID_N + i + 1],
                      heights[(j - 1) * GRID_N + i], heights[(j + 1) * GRID_N + i]]
            if None in around:
                continue
            dx = (around[1] - around[0]) / (2 * GRID_STEP_M)
            dy = (around[2] - around[3]) / (2 * GRID_STEP_M)
            slopes.append(math.degrees(math.atan(math.hypot(dx, dy))))
    return round(sum(slopes) / len(slopes), 2) if slopes else None


def earth_slope(lat, lon):
    points = grid_points(lat, lon, EARTH_RADIUS_M)
    locations = "|".join(f"{a:.5f},{b:.5f}" for a, b in points)
    time.sleep(1.1)  # the public API allows one request per second
    reply = json.loads(http_get(f"{ELEVATION_API}?locations={locations}"))
    return mean_slope_deg([r["elevation"] for r in reply["results"]])


def mars_slope(lat, lon):
    if not (MOLA["lat_bottom"] + 1 < lat < MOLA["lat_top"] - 1 and MOLA["lon_left"] + 1 < lon < MOLA["lon_right"] - 1):
        return None  # outside the one MOLA tile this script knows about
    ppd, cols = MOLA["ppd"], MOLA["cols"]
    points = grid_points(lat, lon, MARS_RADIUS_M)
    first = int((MOLA["lat_top"] - max(p[0] for p in points)) * ppd) - 2
    last = int((MOLA["lat_top"] - min(p[0] for p in points)) * ppd) + 2
    start, end = first * cols * 2, (last + 1) * cols * 2 - 1
    values = read_int16(http_get(MOLA["url"], headers={"Range": f"bytes={start}-{end}"}), big_endian=True)

    def height(point):
        row = (MOLA["lat_top"] - point[0]) * ppd - 0.5 - first
        col = (point[1] - MOLA["lon_left"]) * ppd - 0.5
        r0, c0 = int(row), int(col)
        fr, fc = row - r0, col - c0
        top = values[r0 * cols + c0] * (1 - fc) + values[r0 * cols + c0 + 1] * fc
        bottom = values[(r0 + 1) * cols + c0] * (1 - fc) + values[(r0 + 1) * cols + c0 + 1] * fc
        return top * (1 - fr) + bottom * fr

    return mean_slope_deg([height(p) for p in points])


def earth_climate(lat, lon):
    query = urllib.parse.urlencode({"parameters": "T2M,PS,EVLAND", "community": "AG",
                                    "latitude": lat, "longitude": lon, "format": "JSON"})
    annual = {k: v["ANN"] for k, v in json.loads(http_get(f"{POWER_URL}?{query}"))["properties"]["parameter"].items()}
    clean = {k: (None if v is None or v <= -999 else v) for k, v in annual.items()}
    return {"temperature": clean["T2M"], "pressure": clean["PS"], "evaporation": clean["EVLAND"]}


def measure(place, body, cache):
    """Measured variables for one place, from the cache when possible."""
    key = f"{body}:{place['lat']}:{place['lon']}"
    if key not in cache:
        print(f"  measuring {place['name']}")
        if body == "earth":
            cache[key] = {**earth_climate(place["lat"], place["lon"]),
                          "slope": earth_slope(place["lat"], place["lon"])}
        elif body == "mars":
            cache[key] = {"slope": mars_slope(place["lat"], place["lon"])}
        else:
            cache[key] = {}
        CACHE.parent.mkdir(parents=True, exist_ok=True)
        CACHE.write_text(json.dumps(cache, indent=2))
    return dict(cache[key])


def main():
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    variables = config["variables"]
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}

    print("Candidates")
    candidates = [{**c, "values": measure(c, "earth", cache)} for c in config["candidates"]]

    print("Targets")
    targets = []
    for target in config["targets"]:
        values = measure(target, target["body"], cache)
        for name, entry in target.get("measured", {}).items():
            values[name] = entry["value"]  # values the team entered win over measured ones
        targets.append({**target, "values": values})

    analogs = []
    for target in targets:
        for candidate in candidates:
            matches = {}
            for name, spec in variables.items():
                if spec["kind"] == "judged":
                    entry = candidate.get("judged", {}).get(name)
                    if entry is not None:
                        matches[name] = entry["match"]
                    continue
                t, c = target["values"].get(name), candidate["values"].get(name)
                if t is None or c is None:
                    continue
                pool = [x["values"].get(name) for x in candidates] + [t]
                pool = [v for v in pool if v is not None]
                spread = max(pool) - min(pool)
                matches[name] = round(1 - abs(c - t) / spread, 3) if spread else 1.0
            weight = sum(variables[n]["weight"] for n in matches)
            score = sum(variables[n]["weight"] * m for n, m in matches.items()) / weight if weight else 0.0
            analogs.append({
                "target_id": target["id"],
                "name": candidate["name"],
                "country": candidate["country"],
                "lat": candidate["lat"],
                "lon": candidate["lon"],
                "score": round(score, 3),
                "coverage": f"{len(matches)} of {len(variables)} variables",
                "feature_match": matches,
                "values": candidate["values"],
                "judged": candidate.get("judged", {}),
                "known_analog": bool(candidate.get("known_analog")),
            })
    analogs.sort(key=lambda a: (a["target_id"], -a["score"]))

    OUT.write_text(json.dumps({
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "produced_by": "pipeline/score.py from pipeline/config.json",
        "features": list(variables),
        "variables": variables,
        "targets": [{"id": t["id"], "name": t["name"], "body": t["body"], "lat": t["lat"], "lon": t["lon"],
                     "features": t["values"], "notes": t.get("measured", {}),
                     "judged_reference": t.get("judged_reference", {})} for t in targets],
        "analogs": analogs,
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}\n")

    for target in targets:
        print(f"{target['name']}: {target['values']}")
        for rank, a in enumerate((x for x in analogs if x["target_id"] == target["id"]), 1):
            flag = "known" if a["known_analog"] else "NEW"
            print(f"  {rank:2}. {a['name']:24} {a['score']:.3f}  {a['coverage']:18} {flag:5} {a['values']}")


if __name__ == "__main__":
    main()
