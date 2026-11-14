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
MEMBERS = "[Member names]"
PROJECT = "Mars Twin Finder"
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


FOOT = "Drafted with AI assistance (Claude). Charts are drawn by code from the project data."

slides = [
    f"""<h1>{esc(PROJECT)}</h1>
<p class="lead">Searching Earth's lakes for twins of Jezero Crater, Mars</p>
<p class="meta"><b>Team:</b> {esc(TEAM)}<br><b>Members:</b> {esc(MEMBERS)}<br>
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

    f"""<h2>The search: every natural lake in Türkiye</h2>
{lake_map()}
<p class="small">{len(lakes)} lakes from Wikidata, each scored against Jezero. Darker and larger means a closer match.
[Add a screenshot of the website here.]</p>""",

    f"""<h2>What we found</h2>
{bar_chart()}
<p class="small">Grey: analog already listed by NASA. Orange: candidates, with the number of variables behind each score.
Lake Van and Lake Erçek are closed-basin soda lakes with pH near 9.7; Van has carbonate microbialite towers.</p>""",

    f"""<h2>Does it work, and where does it stop?</h2>
<div class="cols"><div>
<h3>Check</h3>
<ul><li>Lake Salda, NASA's own Jezero analog, ranks <b>{rank_of("Lake Salda")} of {len(rows)}</b>.</li>
<li>On climate and slope alone, Salda falls to 45th and the Atacama to 124th: chemistry and geology carry the match.</li></ul>
</div><div>
<h3>Limits</h3>
<ul><li>Earth has over 100 times Mars's air pressure everywhere.</li>
<li>Jezero's ancient lake has no measured pH.</li>
<li>Lakes are scored on 3 to 7 variables, so close scores are not strictly comparable.</li>
<li>Lake Van is already studied in a Mars context. We cover Mars only, not the Moon.</li></ul>
</div></div>""",

    """<h2>Data, tools and what comes next</h2>
<div class="cols"><div>
<h3>Open data</h3>
<ul><li>NASA: POWER, MOLA, ASTER GDEM, SRTM, Planetary Analog Explorer, Mars Fact Sheet</li>
<li>ESA Copernicus: Sentinel-2 imagery on the website</li>
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
@media print { body { background: #fff; } .slide { margin: 0; } }
"""

pages = "".join(
    f'<section class="slide">{body}<div class="foot"><span>{esc(FOOT)}</span><span>{i} / {len(slides)}</span></div></section>'
    for i, body in enumerate(slides, 1))
out = ROOT / "demo" / "slides.html"
out.write_text(f'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{esc(PROJECT)}: demo slides</title>'
               f'<style>{CSS}</style></head><body>{pages}</body></html>\n', encoding="utf-8")
print(f"wrote {out.relative_to(ROOT)} with {len(slides)} slides")
