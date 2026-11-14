"""Cross-check terrain slope with a second, independent elevation model.

AI-generated: written by Claude (Anthropic) on 2026-11-14. Review before use.

The scores use slope from ASTER GDEM (NASA and Japan's METI). This script
measures slope again, on the same 900 m grid, from EU-DEM, the Copernicus
elevation model (European Union and ESA), and compares the two. EU-DEM only
covers Europe and Türkiye, so the check is limited to candidates in Türkiye.

Run from the repo root, after score.py:

    python3 pipeline/crosscheck_slope.py

Writes data/slope_crosscheck.json. Results are cached in pipeline/raw/.
"""

import json
import time
from datetime import datetime, timezone

import score
from fetch_nasa import RAW, ROOT, http_get

API = "https://api.opentopodata.org/v1/eudem25m"
CACHE = RAW / "slope_eudem.json"
OUT = ROOT / "data" / "slope_crosscheck.json"


def eudem_slope(lat, lon):
    points = score.grid_points(lat, lon, score.EARTH_RADIUS_M)
    locations = "|".join(f"{a:.5f},{b:.5f}" for a, b in points)
    time.sleep(1.1)  # the public API allows one request per second
    reply = json.loads(http_get(f"{API}?locations={locations}"))
    return score.mean_slope_deg([r["elevation"] for r in reply["results"]])


def pearson(xs, ys):
    n = len(xs)
    mx, my = sum(xs) / n, sum(ys) / n
    cov = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    return cov / (sum((x - mx) ** 2 for x in xs) ** 0.5 * sum((y - my) ** 2 for y in ys) ** 0.5)


def ranks(values):
    order = sorted(range(len(values)), key=lambda i: values[i])
    result = [0] * len(values)
    for position, index in enumerate(order):
        result[index] = position
    return result


def main():
    analogs = json.loads((ROOT / "data" / "analogs.json").read_text(encoding="utf-8"))
    places = [a for a in analogs["analogs"] if a["target_id"] == "jezero" and a["country"] == "Türkiye"]
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}

    rows = []
    for place in places:
        key = f"{place['lat']}:{place['lon']}"
        if key not in cache:
            print(f"  measuring {place['name']}")
            cache[key] = eudem_slope(place["lat"], place["lon"])
            CACHE.write_text(json.dumps(cache, indent=2))
        aster, eudem = place["values"].get("slope"), cache[key]
        if aster is not None and eudem is not None:
            rows.append({"name": place["name"], "lat": place["lat"], "lon": place["lon"],
                         "slope_aster_deg": aster, "slope_eudem_deg": eudem,
                         "difference_deg": round(eudem - aster, 2)})

    aster = [r["slope_aster_deg"] for r in rows]
    eudem = [r["slope_eudem_deg"] for r in rows]
    diffs = sorted(abs(r["difference_deg"]) for r in rows)
    summary = {
        "places_compared": len(rows),
        "correlation": round(pearson(aster, eudem), 3),
        "rank_correlation": round(pearson(ranks(aster), ranks(eudem)), 3),
        "mean_absolute_difference_deg": round(sum(diffs) / len(diffs), 2),
        "median_absolute_difference_deg": diffs[len(diffs) // 2],
        "largest_difference_deg": diffs[-1],
    }
    OUT.write_text(json.dumps({
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "produced_by": "pipeline/crosscheck_slope.py",
        "method": "Mean slope on the same 10 x 10 grid of points 900 m apart, from two elevation models.",
        "sources": {
            "aster": "ASTER GDEM (NASA and METI), through the OpenTopoData API",
            "eudem": "EU-DEM v1.1, Copernicus Land Monitoring Service (European Union, ESA), through the OpenTopoData API",
        },
        "summary": summary,
        "places": sorted(rows, key=lambda r: -abs(r["difference_deg"])),
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}")
    print(json.dumps(summary, indent=2))
    print("largest disagreements:")
    for r in sorted(rows, key=lambda r: -abs(r["difference_deg"]))[:5]:
        print(f"  {r['name']:24} ASTER {r['slope_aster_deg']:6}  EU-DEM {r['slope_eudem_deg']:6}")


if __name__ == "__main__":
    main()
