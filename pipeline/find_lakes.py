"""Add Türkiye's natural lakes to pipeline/config.json as candidates.

AI-generated: written by Claude (Anthropic) on 2026-11-14. Review before use.
Searching Türkiye's lakes was the team's choice. Taking the whole list from
Wikidata, instead of hand-picking lakes, keeps the search unbiased.

Standard library only. Run from the repo root:

    python3 pipeline/find_lakes.py

It asks Wikidata (open data, CC0) for everything in Türkiye classed as a lake,
leaves out reservoirs and other artificial lakes, and adds each one that is
not already in the config. Existing candidates are never changed or removed.
"""

import json
import re
import urllib.parse

from fetch_nasa import ROOT, http_get

CONFIG = ROOT / "pipeline" / "config.json"
ENDPOINT = "https://query.wikidata.org/sparql"

# Q43 Türkiye, Q23397 lake, Q131681 reservoir, Q3253281 artificial lake
QUERY = """
SELECT ?lake ?lakeLabel ?typeLabel ?coord ?area ?articles WHERE {
  ?lake wdt:P17 wd:Q43 ; wdt:P31 ?type ; wdt:P625 ?coord ; wikibase:sitelinks ?articles .
  ?type wdt:P279* wd:Q23397 .
  OPTIONAL { ?lake wdt:P2046 ?area }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,tr" }
}
"""
ARTIFICIAL = re.compile(r"reservoir|artificial|dam|pond|baraj|gölet", re.IGNORECASE)


def main():
    url = f"{ENDPOINT}?{urllib.parse.urlencode({'query': QUERY, 'format': 'json'})}"
    rows = json.loads(http_get(url))["results"]["bindings"]

    artificial = {row["lake"]["value"] for row in rows
                  if ARTIFICIAL.search(row["typeLabel"]["value"] + " " + row["lakeLabel"]["value"])}
    lakes = {}
    for row in rows:
        point = re.match(r"Point\(([-\d.]+) ([-\d.]+)\)", row["coord"]["value"])
        name = row["lakeLabel"]["value"]
        if not point or re.fullmatch(r"Q\d+", name) or row["lake"]["value"] in artificial:
            continue  # no usable coordinate, no name in English or Turkish, or man-made
        entity = row["lake"]["value"].rsplit("/", 1)[-1]
        lakes[entity] = {
            "name": name,
            "country": "Türkiye",
            "lat": round(float(point.group(2)), 4),
            "lon": round(float(point.group(1)), 4),
            "known_analog": False,
            "source": f"https://www.wikidata.org/wiki/{entity}",
            "wikipedia_articles": int(row["articles"]["value"]),
        }
        if "area" in row:
            lakes[entity]["area_km2"] = round(float(row["area"]["value"]), 1)

    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    existing = config["candidates"]
    added = 0
    for lake in sorted(lakes.values(), key=lambda x: x["name"]):
        near = any(abs(c["lat"] - lake["lat"]) < 0.1 and abs(c["lon"] - lake["lon"]) < 0.1 for c in existing)
        if not near:
            existing.append(lake)
            added += 1
    CONFIG.write_text(json.dumps(config, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wikidata returned {len(lakes)} natural lakes in Türkiye; added {added} new candidates")
    for lake in sorted(lakes.values(), key=lambda x: -x["wikipedia_articles"])[:15]:
        print(f"  {lake['name']:28} {lake['lat']:8} {lake['lon']:8}  articles: {lake['wikipedia_articles']}")


if __name__ == "__main__":
    main()
