# web

## AI-use note for the website (draft for Kranimo)

Space Apps requires AI-generated code to be acknowledged in text and
metadata. If website code was written with an AI tool, put a note like this
in the site's README and a short line in the page footer. Edit it so it is
true for your code:

> **AI use.** Parts of this website's code (the map page, the 3D terrain
> view, and the terrain-building script) were generated with Claude
> (Anthropic) and reviewed by the team. Commits made with AI help carry a
> `Co-Authored-By` line. No AI-generated images, video or audio are used.
> All imagery and elevation come from the space-agency sources listed under
> "Data sources".

Footer line: `Code written with AI assistance (Claude). Data: NASA, ESA
Copernicus.`

Also list the site's own sources in `SUBMISSION.md` section 8: map imagery
(for example Sentinel-2 cloudless, which is ESA Copernicus data), NASA Mars
Trek tiles, Leaflet, three.js, and anything else the pages load.

Reads `../data/analogs.json` (shape in `../data/SCHEMA.md`) and never writes
to it. The file currently holds mock data, so the app can be built before the
pipeline produces real scores.

## Pages

**Map.** Pick a Moon or Mars target, see its top Earth analogs, click one for
the per-feature match. Mark `known_analog` results differently from new
candidates.

**Lake Salda vs Jezero Crater.** The featured case study, side by side:

- comparison table: water history, minerals, rock type, sediments,
  microbialites
- terrain profile of each site
- present-day environment chart: temperature, pressure, radiation

NASA data for this page is already in the repo, written by
`pipeline/fetch_nasa.py`:

- `../data/nasa/terrain_profiles.json`: west-east elevation profiles for both
  sites
- `../data/nasa/earth_climate.json`: Lake Salda's climate from NASA POWER

Anything else the page needs (the comparison table, Mars environment values)
lives in `web/` and belongs to this folder.

State on the page that Salda matches Jezero's ancient lake and carbonate
setting, not Mars as a whole.

## Map (`index.html`) and method page (`method.html`)

Redesigned on 2026-11-14 for a research-tool look: white and paper surfaces,
ink text, one rust accent, IBM Plex Sans for text and IBM Plex Mono for every
number, satellite imagery as the default map.

Run from the repo root, then open http://localhost:8000/web/ :

```bash
python3 -m http.server 8000
```

**Map page**

- **Top strip:** four key figures, computed from the data.
- **Left:** the target, a search box, a filter for sites with published
  evidence, and the ranked list with a score meter for each site.
- **Middle:** the map. Darker markers are closer matches; analogs NASA already
  lists wear a dark ring. The five closest sites carry a name label. Base maps:
  ESA Sentinel-2 (default), NASA Blue Marble, OpenStreetMap.
- **Right:** the selected site: score, a table of every variable (here, at the
  target, match), links to NASA Worldview and OpenStreetMap, and the published
  evidence with its source. Each piece of evidence shows whether the source
  was read directly or taken from a summary, and whether the match is still an
  AI proposal.
- **Shareable links:** the address changes with the selected site, for example
  `index.html#lake-ercek-38.67`.

**Method page** fills its tables from `data/analogs.json`,
`data/sensitivity.json` and `data/slope_crosscheck.json`: the result, the
variables and scoring rule, the three robustness tests, the limits, and the
data sources. Its prose is an AI draft for the team to check.

Both pages are driven by the data. A new candidate, variable, judged entry or
target in `data/analogs.json` appears without touching the web code.

It needs an internet connection: Leaflet 1.9.4 (BSD 2-Clause) from unpkg, IBM
Plex fonts (SIL Open Font Licence) from Google Fonts, and map tiles from EOX
(Sentinel-2 cloudless, CC BY-NC-SA 4.0), NASA GIBS and OpenStreetMap.

| File | What it is |
|------|------------|
| `index.html` | The map page |
| `method.html` | Method and results page |
| `map/app.js` | Loads the data, draws the map, list and site card |
| `map/method.js` | Fills the method page's tables |
| `map/style.css` | Shared layout and colours |
| `favicon.svg` | Site icon |

AI use: all six files were written by Claude (Anthropic, Claude Code) on
2026-11-14 at the team's direction. The data they show is the pipeline's.

## 3D terrain (`rover.html`)

Restyled on 2026-11-14 to match the map and method pages: same header and
navigation, white panels with hairline borders, IBM Plex type, one rust
accent, game wording replaced.

A 3D page where you drive a model of the Perseverance rover across Lake Salda
and Jezero Crater, and switch between the two with one button.

Run it from the repo root, then open http://localhost:8000/web/rover.html :

```bash
python -m http.server 8000
```

It must be opened through a web server; opening the file directly will not
load the terrain. It needs an internet connection the first time, because
three.js (version 0.160.0, MIT licence) is loaded from the jsDelivr CDN.

| File | What it is |
|------|------------|
| `rover.html` | The page and its layout |
| `rover/main.js` | Driving, camera, site switch, speed slider |
| `rover/terrain.js` | Builds the ground from a heightmap and paints it |
| `rover/rover-model.js` | The rover, built from simple shapes |
| `rover/game.js` | The fact hunt: info points, fact cards, progress |
| `rover/terrain/*.bin`, `sites.json` | The two heightmaps and what they cover |
| `tools/build_terrain.py` | Downloads the NASA data and writes the heightmaps |

### Fact hunt

The rover page is also a small game. Glowing beacons stand around each map;
drive to one and a card opens with a fact about the site, the matching fact
for the other site, how closely the two match, and the source. A counter shows
how many you have found and an arrow points to the nearest one left. Some
points are on the lake, so you need the boat.

The facts are not written in the web code. `rover/game.js` reads
`../data/analogs.json` and makes one info point per variable:

- at Lake Salda, from its `judged` notes (minerals, water, sediments) and its
  measured `values` (temperature, pressure, evaporation, slope)
- at Jezero, from the target's `judged_reference`, `features` and `notes`

So when the pipeline adds a variable or researches a new fact, a new info
point appears. For free-form facts, add a `facts` list to Lake Salda's entry
or to the Jezero target, and each item becomes a point too:

```json
"facts": [
  { "title": "Depth", "note": "One of the deepest lakes in Türkiye.", "source": "https://..." }
]
```

That is a new field in `analogs.json`, so agree it with the data owner first.

The data has no coordinates for individual facts, so **where each beacon
stands is made up for the game** (water facts on the lake, mineral and
sediment facts on the shore, slope on high ground). Every card says so.
If `analogs.json` cannot be loaded, the page still works as a plain drive.

What is real and what is not:

- **Heights are NASA data.** Lake Salda: SRTM 1 arc second, tile N37E029,
  about 31 m per reading. Jezero: MGS MOLA MEGDR, MEGT44N000HB, about 464 m
  per reading. Both are resampled to 257 x 257 and nothing else is changed.
- **Colours are painted**, from elevation, slope and distance to the lake.
  They are not satellite imagery.
- **Heights are exaggerated**: 2x at Salda, 5x at Jezero. The page says so.
- **The two maps are different sizes**: 20 km across at Salda, 64 km at Jezero.
- **The rover is far larger than life** (about 40x at Salda, 128x at Jezero),
  or it would be invisible. Its proportions follow NASA's published figures;
  part positions were laid out by eye, not from engineering drawings.
- SRTM records the lake surface, so the lake is flat and has no lake bed.
- **Crossing the lake.** The rover floats slightly above the flat lake surface,
  because SRTM has no lake bed. The earlier toy boat was removed on 2026-11-14.
- **Evidence points** replace the earlier "fact hunt": a small post and a thin
  locator line per published finding, no spinning or glowing. Their positions
  are illustrative.

To check before citing: the Jezero start point is meant to be Perseverance's
landing site (18.4447 N, 77.4508 E). The AI entered it from memory.

### AI use in this folder

Everything listed under "Rover drive" was written by Claude (Anthropic, Claude
Code) on 2026-11-14 at the team's direction: `rover.html`, the four files in
`rover/`, and `tools/build_terrain.py`. Each file says so in its first lines.
The heightmaps in `rover/terrain/` are NASA data fetched by that script, not
AI-generated values. This still needs a line in the main README's "AI use"
table and the two datasets in its "Data sources" list.
