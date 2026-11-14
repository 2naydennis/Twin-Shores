# web

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

## Map (`index.html`)

The main page. It ranks every Earth site in `../data/analogs.json` against the
target (Jezero Crater today) and shows why each one matches.

Run it from the repo root, then open http://localhost:8000/web/ :

```bash
python -m http.server 8000
```

- **Left:** the target and what is known about it, a search box, a filter for
  sites with researched facts, and the ranked list.
- **Middle:** the map. Darker markers are closer matches. Documented analogs
  are larger with a dark ring; new candidates are smaller with a white ring.
  The base map can be switched to NASA Blue Marble.
- **Right:** the selected site: score, coverage, a bar for every variable with
  the site's value next to the target's, and the researched facts (minerals,
  water, sediments, pH) with their notes and source links.

The page is driven by the data, with nothing written per site:

| If the pipeline adds | The page shows |
|----------------------|----------------|
| a candidate | a marker and a row in the list |
| a variable in `features` | a new bar under "How it matches" |
| a `judged` entry on a site | a new fact with its note and source |
| a second target | a menu to choose the target |
| any other field on a site (for example `minerals`, `facts`, `depth_m`) | an entry under "More about this site" |

That last row means new kinds of data appear without touching the web code,
but plainly: the field name becomes the heading. Text, numbers, lists, and
objects with `note`, `value` and `source` all display. Ask for a proper layout
once a field settles.

Things to know:

- The page repeats the pipeline's warning that sites scored on different
  numbers of variables cannot be compared fairly.
- Marker colours are spread between the lowest and highest score for the
  target, so the darkest marker is the best of this list, not a perfect match.
- It needs an internet connection: Leaflet 1.9.4 (BSD 2-Clause) comes from
  unpkg, map tiles from OpenStreetMap, and Blue Marble imagery from NASA GIBS.
- Only Lake Salda has a "Drive a rover here" button, set in `ROVER_PAGES` in
  `map/app.js`.

| File | What it is |
|------|------------|
| `index.html` | The page |
| `map/app.js` | Loads the data, draws the map, list and site card |
| `map/style.css` | Layout and colours, light and dark |

AI use: `index.html`, `map/app.js` and `map/style.css` were written by Claude
(Anthropic, Claude Code) on 2026-11-14 at the team's direction. The data they
show is the pipeline's. This also needs a line in the main README's "AI use"
table, and Leaflet, OpenStreetMap and NASA GIBS in its list of resources.

## Rover drive (`rover.html`)

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
| `rover/terrain/*.bin`, `sites.json` | The two heightmaps and what they cover |
| `tools/build_terrain.py` | Downloads the NASA data and writes the heightmaps |

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
- **The boat is made up.** Driving into the lake puts a small boat under the
  rover so the lake can be crossed. No such hardware exists.

To check before citing: the Jezero start point is meant to be Perseverance's
landing site (18.4447 N, 77.4508 E). The AI entered it from memory.

### AI use in this folder

Everything listed under "Rover drive" was written by Claude (Anthropic, Claude
Code) on 2026-11-14 at the team's direction: `rover.html`, the three files in
`rover/`, and `tools/build_terrain.py`. Each file says so in its first lines.
The heightmaps in `rover/terrain/` are NASA data fetched by that script, not
AI-generated values. This still needs a line in the main README's "AI use"
table and the two datasets in its "Data sources" list.
