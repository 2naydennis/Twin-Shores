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
