"""Build field-test cards for the top sites and the Lake Erçek vs Jezero comparison.

AI-generated: written by Claude (Anthropic) on 2026-11-14. Review before use.

Standard library only. Run from the repo root, after score.py:

    python3 pipeline/site_cards.py

Writes:

    data/site_cards.json   for each top site: how to get there (nearest airport
                           and provincial capital, from Wikidata), when to go
                           (NASA POWER monthly climate), what could be tested
                           there (derived from the site's published evidence),
                           and which variables are still unchecked
    data/twin_salda.json   west-east elevation profiles across Lake Salda (SRTM)
                           and Jezero Crater (MOLA), from the 3D page's terrain

Everything is computed from data, except the test suggestions, which are
written rules applied to the evidence and are marked as AI suggestions.
"""

import json
import math
import struct
import urllib.parse
from datetime import datetime, timezone

from fetch_nasa import POWER_URL, RAW, ROOT, http_get

ANALOGS = ROOT / "data" / "analogs.json"
OUT = ROOT / "data" / "site_cards.json"
TWIN = ROOT / "data" / "twin_salda.json"
TERRAIN = ROOT / "web" / "rover" / "terrain"
CACHE = RAW / "site_cards_cache.json"
FOCUS = 6                 # how many of the top places get a card
WIKIDATA = "https://query.wikidata.org/sparql"
MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August",
               "September", "October", "November", "December"]

AIRPORTS = """
SELECT ?item ?itemLabel ?iata ?coord WHERE {
  ?item wdt:P31/wdt:P279* wd:Q1248784 ; wdt:P17 wd:Q43 ; wdt:P238 ?iata ; wdt:P625 ?coord .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
}"""
CAPITALS = """
SELECT ?item ?itemLabel ?coord (MAX(?pop) AS ?population) WHERE {
  VALUES ?type { wd:Q515 wd:Q1549591 wd:Q1637706 wd:Q200250 }
  ?item wdt:P31 ?type ; wdt:P17 wd:Q43 ; wdt:P1082 ?pop ; wdt:P625 ?coord .
  FILTER(?pop >= 100000)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
} GROUP BY ?item ?itemLabel ?coord"""

# For sites outside Türkiye: airports and large towns within a radius of the site itself.
# Added 2026-11-14 (AI-generated, Claude) when lakes from other countries joined the candidates.
AROUND = """
SELECT ?item ?itemLabel ?iata ?coord WHERE {{
  SERVICE wikibase:around {{ ?item wdt:P625 ?coord . bd:serviceParam wikibase:center "Point({lon} {lat})"^^geo:wktLiteral ; wikibase:radius "{radius}" . }}
  {what}
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en" }}
}}"""
AIRPORT_NEAR = "?item wdt:P31/wdt:P279* wd:Q1248784 ; wdt:P238 ?iata ."
TOWN_NEAR = ("VALUES ?type { wd:Q515 wd:Q1549591 wd:Q1637706 wd:Q200250 } "
             "?item wdt:P31 ?type ; wdt:P1082 ?pop . FILTER(?pop >= 100000)")


def nearby(site, what):
    """Places of one kind near a site, widening the search until something is found."""
    for radius in (250, 600, 1500):
        places = sparql(AROUND.format(lat=site["lat"], lon=site["lon"], radius=radius, what=what))
        if places:
            return places
    raise SystemExit(f"nothing found within 1500 km of {site['name']}")


def sparql(query):
    url = f"{WIKIDATA}?{urllib.parse.urlencode({'query': query, 'format': 'json'})}"
    rows = json.loads(http_get(url))["results"]["bindings"]
    places = {}
    for row in rows:
        lon, lat = (float(v) for v in row["coord"]["value"][6:-1].split())
        name = row["itemLabel"]["value"]
        places[row["item"]["value"]] = {"name": name, "lat": lat, "lon": lon, "iata": row.get("iata", {}).get("value"),
                                        "source": row["item"]["value"].replace("http://", "https://")}
    return list(places.values())


def km(a, b):
    """Great-circle distance in km between two {lat, lon} points."""
    p1, p2 = math.radians(a["lat"]), math.radians(b["lat"])
    dp, dl = p2 - p1, math.radians(b["lon"] - a["lon"])
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * 6371 * math.asin(math.sqrt(h))


def nearest(site, places):
    best = min(places, key=lambda p: km(site, p))
    return {**best, "distance_km": round(km(site, best))}


def climate(site, cache):
    key = f"{site['lat']}:{site['lon']}"
    if key not in cache:
        query = urllib.parse.urlencode({"parameters": "T2M,PRECTOTCORR,T2M_MIN", "community": "AG",
                                        "latitude": site["lat"], "longitude": site["lon"], "format": "JSON"})
        cache[key] = json.loads(http_get(f"{POWER_URL}?{query}"))["properties"]["parameter"]
    p = cache[key]
    rain_mean = p["PRECTOTCORR"]["ANN"]
    # Field season: mean temperature 10 °C or more, nights above freezing, rain at or below the yearly mean.
    good = [MONTH_NAMES[i] for i, m in enumerate(MONTHS)
            if p["T2M"][m] >= 10 and p["T2M_MIN"][m] > 0 and p["PRECTOTCORR"][m] <= rain_mean]
    return {
        "field_season": good,
        "rule": "Months with a mean temperature of 10 °C or more, minimum above 0 °C, and precipitation at or below the yearly mean (NASA POWER climatology).",
        "monthly_mean_temp_c": {MONTH_NAMES[i]: p["T2M"][m] for i, m in enumerate(MONTHS)},
        "monthly_precip_mm_day": {MONTH_NAMES[i]: p["PRECTOTCORR"][m] for i, m in enumerate(MONTHS)},
    }


# Written rules: which kind of mission rehearsal each kind of evidence supports.
TESTS = {
    "minerals": ("Carbonate deposits", "Rehearse coring and sample caching in carbonate rock, as Perseverance does at Jezero's margin."),
    "sediments": ("Layered sediments or microbialites", "Test close-range instruments (X-ray and Raman spectrometers, microscopic imagers) on layered structures that could hold biosignatures."),
    "ph": ("Alkaline water", "Calibrate instruments that look for traces of life in alkaline, carbonate-rich settings, where Jezero's carbonates may have formed."),
    "water": ("Closed-basin lake and shoreline", "Practise rover driving and terrain mapping on soft shoreline deposits and old lake terraces, then compare with Jezero's delta and margin."),
}
NOT_ANALOG = ("Not analog for: Mars's air pressure (under 1% of Earth's), cold, dryness or radiation. "
              "Equipment tests here cover geology, chemistry and handling, not the Martian environment.")


def card(site, rank, airports, capitals, cache, variables):
    if site.get("country") != "Türkiye":      # the lists passed in cover Türkiye only
        airports, capitals = nearby(site, AIRPORT_NEAR), nearby(site, TOWN_NEAR)
    judged = site.get("judged", {})
    tests = []
    for key, (title, text) in TESTS.items():
        if key in judged and judged[key]["match"] >= 0.5:
            tests.append({"evidence": title, "test": text, "based_on": judged[key]["note"], "source": judged[key]["source"]})
    gaps = [{"variable": variables[key]["label"], "why": "no published study entered yet"}
            for key, spec in variables.items() if spec["kind"] == "judged" and key not in judged]
    gaps += [{"variable": variables[key]["label"], "why": "no value at Jezero to compare with"}
             for key, spec in variables.items() if spec["kind"] == "measured" and key not in site["feature_match"]]
    return {
        "rank": rank, "name": site["name"], "lat": site["lat"], "lon": site["lon"], "score": site["score"],
        "coverage": site["coverage"], "known_analog": site["known_analog"],
        "access": {"airport": nearest(site, airports), "city": nearest(site, capitals),
                   "note": "Straight-line distances from Wikidata coordinates; road distances are longer."},
        "season": climate(site, cache),
        "tests": tests,
        "tests_note": "Suggested by AI from the site's published evidence using fixed rules; for the team to review.",
        "not_analog_for": NOT_ANALOG,
        "gaps": gaps,
    }


def heightmap(site_id):
    meta = next(s for s in json.loads((TERRAIN / "sites.json").read_text())["sites"] if s["id"] == site_id)
    n = meta["grid"]
    raw = (TERRAIN / meta["file"]).read_bytes()
    values = struct.unpack(f"<{n * n}H", raw)
    scale = (meta["max_m"] - meta["min_m"]) / 65535
    return meta, n, lambda i, j: meta["min_m"] + values[j * n + i] * scale


def profile(site_id, lat, lon, half_km):
    """West-east profile through (lat, lon), half_km each side, from the 3D page's heightmap."""
    meta, n, at = heightmap(site_id)
    radius = 6371.0 if meta["body"] == "earth" else 3396.0
    km_per_deg = 2 * math.pi * radius / 360
    row = round((0.5 - (lat - meta["lat"]) * km_per_deg / meta["width_km"]) * (n - 1))
    centre = ((lon - meta["lon"]) * km_per_deg * math.cos(math.radians(meta["lat"])) / meta["width_km"] + 0.5) * (n - 1)
    cell_km = meta["width_km"] / (n - 1)
    steps = int(half_km / cell_km)
    points = []
    for k in range(-steps, steps + 1):
        i = round(centre + k)
        if 0 <= i < n:
            points.append({"km": round(k * cell_km, 2), "m": round(at(i, row), 1)})
    return {"dataset": meta["dataset"], "url": meta["url"], "points": points}


def main():
    data = json.loads(ANALOGS.read_text(encoding="utf-8"))
    variables = data["variables"]
    sites = [a for a in data["analogs"] if a["target_id"] == "jezero"][:FOCUS]
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    print("Wikidata: airports and towns of 100,000 or more in Türkiye")
    airports, capitals = sparql(AIRPORTS), sparql(CAPITALS)
    print(f"  {len(airports)} airports with an IATA code, {len(capitals)} towns of 100,000 or more")
    cards = []
    for rank, site in enumerate(sites, 1):
        print(f"  card for {site['name']}")
        cards.append(card(site, rank, airports, capitals, cache, variables))
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    CACHE.write_text(json.dumps(cache))
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    OUT.write_text(json.dumps({"generated_at": stamp, "produced_by": "pipeline/site_cards.py",
                               "sources": {"access": "Wikidata (CC0)", "season": "NASA POWER climatology API",
                                           "tests": "Rules in pipeline/site_cards.py applied to the evidence in data/analogs.json"},
                               "cards": cards}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}")

    salda = next(a for a in data["analogs"] if a["name"] == "Lake Salda")
    target = data["targets"][0]
    TWIN.write_text(json.dumps({
        "generated_at": stamp, "produced_by": "pipeline/site_cards.py",
        "note": "West-east elevation profiles, 0 km at the site centre. Salda: SRTM, one reading every 39 m in the 3D heightmap. "
                "Jezero: MOLA, one reading every 250 m.",
        "salda": {"name": "Lake Salda", "lat": salda["lat"], "lon": salda["lon"], **profile("salda", salda["lat"], salda["lon"], 10)},
        "jezero": {"name": target["name"], "lat": target["lat"], "lon": target["lon"], **profile("jezero", target["lat"], target["lon"], 30)},
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {TWIN.relative_to(ROOT)}")
    for c in cards:
        a, cap = c["access"]["airport"], c["access"]["city"]
        print(f"  {c['rank']}. {c['name']:12} airport {a['name']} ({a['iata']}) {a['distance_km']} km · "
              f"{cap['name']} {cap['distance_km']} km · season {', '.join(m[:3] for m in c['season']['field_season'])} · "
              f"{len(c['tests'])} tests · {len(c['gaps'])} gaps")


if __name__ == "__main__":
    main()
