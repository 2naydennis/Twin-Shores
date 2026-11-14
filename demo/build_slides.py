"""Build the 7-slide demo deck from the scored results.

AI-generated: written by Claude (Anthropic) on 2026-11-14. Review before use.

Run from the repo root:

    python3 demo/build_slides.py

It reads data/analogs.json and writes demo/slides.html, so the numbers and
charts on the slides always match the data. Fill in TEAM and MEMBERS below
first. Slides must stay at seven or fewer.
"""

import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEAM = "[TEAM NAME]"
MEMBERS = "Tunay Dennis Diederich, Karan Kaya, Ayşegül Çağlayan; teacher: Adrina Shakeri Bahador"
COUNTRY = "Türkiye"
PROJECT = "Analog Finder"
CHALLENGE = "Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars"

data = json.loads((ROOT / "data" / "analogs.json").read_text(encoding="utf-8"))
rows = [a for a in data["analogs"] if a["target_id"] == "jezero"]
lakes = [a for a in rows if a["country"] == "Türkiye"]
known = [a for a in rows if a["known_analog"]]
top = rows[:8]


def esc(text):
    return html.escape(str(text))


def shade(score):
    """Light to dark orange for low to high score."""
    t = max(0.0, min(1.0, (score - 0.2) / 0.5))
    r, g, b = (round(a + (c - a) * t) for a, c in zip((246, 222, 200), (176, 58, 16)))
    return f"rgb({r},{g},{b})"


def bar_chart():
    width, row_h, left = 860, 46, 230
    parts = [f'<svg viewBox="0 0 {width} {row_h * len(top) + 10}" role="img" aria-label="Top scores">']
    for i, a in enumerate(top):
        y = i * row_h + 6
        bar = (width - left - 150) * a["score"]
        fill = "#5a6472" if a["known_analog"] else "#b03a10"
        tag = "known analog" if a["known_analog"] else a["coverage"].replace(" variables", "")
        parts.append(f'<text x="{left - 12}" y="{y + 24}" text-anchor="end" class="lab">{esc(a["name"])}</text>')
        parts.append(f'<rect x="{left}" y="{y}" width="{bar:.0f}" height="32" rx="3" fill="{fill}"/>')
        parts.append(f'<text x="{left + bar + 10:.0f}" y="{y + 24}" class="val">{a["score"]:.3f}'
                     f'<tspan class="note">  {esc(tag)}</tspan></text>')
    parts.append("</svg>")
    return "".join(parts)


def lake_map():
    w, h, lon0, lon1, lat0, lat1 = 860, 400, 25.5, 45.0, 35.5, 42.5

    def xy(a):
        return ((a["lon"] - lon0) / (lon1 - lon0) * w, (lat1 - a["lat"]) / (lat1 - lat0) * h)

    parts = [f'<svg viewBox="0 0 {w} {h}" role="img" aria-label="Lakes scored, by position">',
             f'<rect width="{w}" height="{h}" fill="#f6f3ee" stroke="#d9d3c8"/>']
    for lon in range(26, 45, 2):
        x = (lon - lon0) / (lon1 - lon0) * w
        parts.append(f'<line x1="{x:.0f}" y1="0" x2="{x:.0f}" y2="{h}" class="grid"/>'
                     f'<text x="{x + 3:.0f}" y="{h - 5}" class="tick">{lon}°E</text>')
    for lat in range(36, 43):
        y = (lat1 - lat) / (lat1 - lat0) * h
        parts.append(f'<line x1="0" y1="{y:.0f}" x2="{w}" y2="{y:.0f}" class="grid"/>'
                     f'<text x="4" y="{y - 4:.0f}" class="tick">{lat}°N</text>')
    for a in sorted(lakes, key=lambda item: item["score"]):
        x, y = xy(a)
        parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{4 + 9 * max(0, a["score"] - 0.3):.1f}" '
                     f'fill="{shade(a["score"])}" stroke="#fff" stroke-width="0.8"/>')
    for i, a in enumerate([item for item in rows if item["country"] == "Türkiye"][:6]):
        x, y = xy(a)
        anchor, dx = ("end", -11) if x > w * 0.7 else ("start", 11)
        dy = -9 if i % 2 == 0 else 19  # alternate above and below so neighbours do not overlap
        parts.append(f'<text x="{x + dx:.0f}" y="{y + dy:.0f}" text-anchor="{anchor}" class="pin">{esc(a["name"])}</text>')
    parts.append("</svg>")
    return "".join(parts)


def rank_of(name):
    return next(i for i, a in enumerate(rows, 1) if a["name"] == name)


def robustness_chart():
    """Top-3 and top-5 shares under random weights for the first three places."""
    path = ROOT / "data" / "sensitivity.json"
    if not path.exists():
        return ""
    test = json.loads(path.read_text(encoding="utf-8"))["random_weights"]
    rows_html = "".join(
        f'<tr><td>{esc(p["name"])}</td><td><span class="pbar"><i style="width:{p["top3_pct"]}%"></i></span>{p["top3_pct"]:.0f}%</td>'
        f'<td><span class="pbar grey"><i style="width:{p["top5_pct"]}%"></i></span>{p["top5_pct"]:.0f}%</td></tr>'
        for p in test["places"][:4])
    return (f'<p class="small" style="margin-top:14px">Weights redrawn at random {test["draws"]:,} times: share of draws in the top 3 and top 5</p>'
            f'<table class="rob"><tr><th></th><th>Top 3</th><th>Top 5</th></tr>{rows_html}</table>')


def robustness_line():
    """One bullet from the sensitivity test, or nothing if it has not been run."""
    path = ROOT / "data" / "sensitivity.json"
    if not path.exists():
        return ""
    test = json.loads(path.read_text(encoding="utf-8"))["random_weights"]
    leaders = test["places"][:3]
    names = ", ".join(p["name"].replace("Lake ", "") for p in leaders)
    floor = min(p["top5_pct"] for p in leaders)
    return (f"<li>With the weights redrawn at random {test['draws']:,} times, {esc(names)} "
            f"stay in the top five in at least {floor:.0f}% of cases.</li>")


FOOT = "Drafted with AI assistance (Claude). Charts are drawn by code from the project data."

slides = [
    f"""<h1>{esc(PROJECT)}</h1>
<p class="lead">Searching Earth's lakes for twins of Jezero Crater, Mars</p>
<p class="meta"><b>Team:</b> {esc(TEAM)}<br><b>Members:</b> {esc(MEMBERS)}<br><b>Country:</b> {esc(COUNTRY)}<br>
<b>Challenge:</b> {esc(CHALLENGE)}<br>NASA Space Apps Challenge 2026, Universal Event</p>""",

    """<h2>The problem</h2>
<ul>
<li>Mission teams rehearse on Earth, at analog sites, before they fly.</li>
<li>Jezero Crater was a lake about 3.5 billion years ago. Perseverance is searching it for signs of ancient life.</li>
<li>NASA's Planetary Analog Explorer pairs Jezero with one Earth lake: Lake Salda in Türkiye.</li>
<li>The challenge asks for <b>new</b> analogs, identified and characterized with open data.</li>
</ul>
<p class="ask">Are there more lakes like Salda, and can open data find them?</p>""",

    """<h2>How it works</h2>
<div class="cols"><div>
<h3>Measured from space-agency data</h3>
<ul><li>Temperature, air pressure, evaporation: NASA POWER</li>
<li>Terrain slope: ASTER (NASA and METI) on Earth, MOLA on Mars, same 900 m grid</li></ul>
</div><div>
<h3>Read from published studies</h3>
<ul><li>Water pH</li><li>Mineral deposits</li><li>Water body</li><li>Sediment layers</li></ul>
<p class="small">Each entered as a 0 to 1 match, with its source.</p>
</div></div>
<p class="ask">Score = weighted average of the variables available. Every score shows how many variables it rests on.</p>""",

    f"""<h2>The search: every natural lake in Türkiye, on a live map</h2>
<img class="shot" src="img/map.jpg" alt="The Analog Finder map page with Lake Erçek selected">
<p class="small">{len(lakes)} lakes from Wikidata, each scored against Jezero, on ESA Sentinel-2 imagery. Pick a lake to see every
variable next to Jezero's value and the published evidence with its source. 2naydennis.github.io/analog-finder</p>""",

    f"""<h2>What we found</h2>
{bar_chart()}
<p class="small">Grey: analog already listed by NASA. Orange: candidates, with the number of variables behind each score.
Lake Van and Lake Erçek are closed-basin soda lakes with pH near 9.7; Van has carbonate microbialite towers.</p>""",

    f"""<h2>Does it work, and where does it stop?</h2>
<div class="cols"><div>
<h3>Check</h3>
<ul><li>Lake Salda, NASA's own Jezero analog, ranks <b>{rank_of("Lake Salda")} of {len(rows)}</b>.</li>
<li>On climate and slope alone, Salda falls to 45th: chemistry and geology carry the match.</li></ul>
{robustness_chart()}
</div><div>
<h3>Limits</h3>
<ul><li>Earth has over 100 times Mars's air pressure everywhere.</li>
<li>Jezero's ancient lake has no measured pH.</li>
<li>Lakes are scored on 3 to 7 variables, so close scores are not strictly comparable.</li>
<li>Lake Van is already studied in a Mars context. We cover Mars only, not the Moon.</li></ul>
</div></div>""",

    """<h2>Explore the sites in 3D</h2>
<div class="strip"><figure><img src="img/3d-boat-crop.jpg" alt="Rover on a survey boat on Lake Salda"><figcaption>Lake Salda, by boat</figcaption></figure>
<figure><img src="img/3d-ercek-crop.jpg" alt="Rover on the shore of Lake Erçek"><figcaption>Lake Erçek, our candidate</figcaption></figure>
<figure><img src="img/3d-jezero-crop.jpg" alt="Rover in Jezero Crater"><figcaption>Jezero Crater, Mars</figcaption></figure></div>
<p class="small">Terrain from NASA SRTM and MOLA elevation data. Drive between published-evidence points and compare each lake with Jezero.
The boat, rocks and trees are illustrative. Open data: NASA POWER, MOLA, ASTER, SRTM, Planetary Analog Explorer; Copernicus EU-DEM and
Sentinel-2 (ESA). Next: a field check of Lake Erçek, lakes beyond Türkiye, a Moon version. AI tools wrote much of the code and drafted
text; every use is listed in the repository.</p>""",
]
_unused = [
    """<h2>Data, tools and what comes next</h2>
<div class="cols"><div>
<h3>Open data</h3>
<ul><li>NASA: POWER, MOLA, ASTER GDEM, SRTM, Planetary Analog Explorer, Mars Fact Sheet</li>
<li>Copernicus EU-DEM (European Union and ESA): second elevation model, agrees with ASTER on slope (correlation 0.99 over 149 lakes)</li>
<li>Wikidata lake list; published studies for each lake</li></ul>
</div><div>
<h3>Next</h3>
<ul><li>Field check of Lake Erçek, the least studied candidate</li>
<li>Lakes beyond Türkiye</li>
<li>A Moon version with its own variables</li></ul>
</div></div>
<p class="small">Code and data: github.com/2naydennis/analog-finder. AI tools wrote much of the code and drafted text;
every use is listed in the repository.</p>""",
]

assert len(slides) <= 7, "Space Apps allows at most seven slides"

CSS = """
@page { size: 1280px 720px; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; font-family: Helvetica, Arial, sans-serif; color: #1d2430; background: #cfd3d8; }
.slide { width: 1280px; height: 720px; padding: 56px 72px 60px; background: #fff; position: relative;
         page-break-after: always; overflow: hidden; margin: 0 auto 16px; }
h1 { font-size: 76px; margin: 110px 0 12px; letter-spacing: -1.5px; }
h2 { font-size: 40px; margin: 0 0 26px; letter-spacing: -0.5px; }
h3 { font-size: 23px; margin: 0 0 10px; color: #b03a10; }
p, li { font-size: 25px; line-height: 1.4; }
ul { margin: 0; padding-left: 26px; } li { margin-bottom: 12px; }
.lead { font-size: 32px; color: #b03a10; margin: 0 0 56px; }
.meta { font-size: 22px; line-height: 1.7; color: #3c4656; }
.ask { margin-top: 26px; padding: 16px 22px; background: #f6f3ee; border-left: 6px solid #b03a10; font-size: 26px; }
.small { font-size: 19px; color: #4a5565; margin-top: 12px; }
.cols { display: flex; gap: 52px; } .cols > div { flex: 1; }
svg { display: block; width: 100%; max-height: 420px; }
.lab { font-size: 21px; fill: #1d2430; } .val { font-size: 21px; font-weight: 700; fill: #1d2430; }
.note { font-size: 16px; font-weight: 400; fill: #5a6472; }
.grid { stroke: #e2ddd3; stroke-width: 1; } .tick { font-size: 12px; fill: #8a8377; }
.pin { font-size: 15px; font-weight: 700; fill: #1d2430; paint-order: stroke; stroke: #f6f3ee; stroke-width: 4px; }
.foot { position: absolute; left: 72px; right: 72px; bottom: 20px; font-size: 13px; color: #8a909a;
        display: flex; justify-content: space-between; }
.shot { display: block; width: 100%; max-height: 470px; object-fit: cover; object-position: top; border: 1px solid #d9d3c8; }
.strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.strip figure { margin: 0; }
.strip img { width: 100%; height: 230px; object-fit: cover; border: 1px solid #d9d3c8; display: block; }
.strip figcaption { font-size: 18px; font-weight: 600; margin-top: 6px; }
table.rob { border-collapse: collapse; width: 100%; font-size: 19px; margin-top: 6px; }
table.rob th { text-align: left; font-size: 14px; color: #4a5565; font-weight: 600; padding: 2px 0; }
table.rob td { padding: 5px 10px 5px 0; border-top: 1px solid #ebe8e2; white-space: nowrap; }
.pbar { display: inline-block; width: 90px; height: 9px; background: #ebe8e2; margin-right: 8px; vertical-align: middle; }
.pbar i { display: block; height: 100%; background: #b03a10; }
.pbar.grey i { background: #5a6472; }
@media print { body { background: #fff; } .slide { margin: 0; } }
"""

pages = "".join(
    f'<section class="slide">{body}<div class="foot"><span>{esc(FOOT)}</span><span>{i} / {len(slides)}</span></div></section>'
    for i, body in enumerate(slides, 1))
out = ROOT / "demo" / "slides.html"
out.write_text(f'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{esc(PROJECT)}: demo slides</title>'
               f'<style>{CSS}</style></head><body>{pages}</body></html>\n', encoding="utf-8")
print(f"wrote {out.relative_to(ROOT)} with {len(slides)} slides")
