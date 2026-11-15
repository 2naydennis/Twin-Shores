# web

The Twin Shores website. Static HTML, CSS and JavaScript, no build step. It
reads the files in `../data/` and never writes to them.

Run it from the repo root, then open http://localhost:8000/web/ :

```bash
python3 -m http.server 8000
```

It must be opened through a web server (opening the files directly will not
load the data) and needs an internet connection for the libraries, fonts and
map tiles.

## Pages

| Page | What it shows | Files |
|------|---------------|-------|
| Map (`index.html`) | 70 places ranked against Jezero Crater. Each place shows its score, every variable with its value at the place and at Jezero, and the published evidence with its source and how far that source was read | `map/app.js` |
| Lake Salda (`salda.html`) | Salda beside Jezero: orbital views, basin profiles, evidence, a field-test card | `map/twin.js` |
| Salda study (`study.html`) | Scientific report, comparative basin map and assessment | `map/study.js` |
| Method and results (`method.html`) | Variables, scoring rule, live weight sliders, robustness tests, limits | `map/method.js` |
| 3D terrain (`rover.html`) | Drive Lake Salda, Lake Van and Lake Erçek, and Jezero Crater on NASA elevation data | `rover/` |
| Sources (`sources.html`) | Every dataset, library, study and image, and how AI tools were used | `map/sources.js` |

`map/style.css` is shared by every page; `favicon.svg` is the site icon.

All pages are driven by the data. A new place, variable or evidence entry in
`../data/analogs.json` appears without touching the web code.

## Where the content comes from

| Page | Data files |
|------|------------|
| Map, method | `analogs.json`, `sensitivity.json`, `slope_crosscheck.json` |
| Lake Salda | `site_cards.json`, `twin_salda.json` |
| Salda study | `salda_report.json` (report text, an AI draft with an evidence class and sources per statement), `salda_study.json` (basin analysis by `../pipeline/salda_study.py`) |
| 3D terrain | `rover/terrain/*.bin` and `sites.json` (heightmaps built by `tools/build_terrain.py`), `analogs.json` (evidence points) |
| Sources | `analogs.json`, `salda_report.json` |

Numbers in the study text are written as `{{S.lake.area_km2}}` and filled in
from the analysis, so the text cannot drift from the data.

## 3D terrain: what is real and what is not

- **Heights are NASA data.** Lake Salda: SRTM 1 arc second, tile N37E029,
  resampled to 513 x 513 (one reading every 39 m). Lake Van and Lake Erçek:
  SRTM tile N38E043. Jezero: MGS MOLA MEGDR MEGT44N000HB, 257 x 257 (MOLA has
  only 139 readings across the map).
- **Heights are exaggerated** (2x at Salda, 5x at Jezero) and the maps are
  different sizes (20 km at Salda, 64 km at Jezero). The page says so.
- **Colours are painted** from elevation, slope and distance to water. They
  are not satellite imagery.
- **The rover is drawn far larger than life** so it can be seen. The survey
  boat, rocks and pines are invented scenery.
- **Evidence points** come from `analogs.json`, one per variable. Where each
  post stands is illustrative, because the data has no coordinates for
  individual facts. Every card says so.
- The Jezero start point is meant to be Perseverance's landing site
  (18.4447 N, 77.4508 E). The AI entered it from memory; it still needs a check.

### Ancient Jezero (simulation)

Fills the crater with a lake on the same MOLA terrain, to -2,430 m, the level
at which water spills over the lowest gap in the rim in this grid (about
1,180 km²). Perseverance found lake sediments and a river delta, so a lake
existed; studies suggest it often stood below its outlet, so one fixed level
is a simplification. We did not confirm that this gap is the mapped outlet
valley. The sky, water and ground colours and the microbial mounds are
imagined: no life has been found on Mars. In this view the Jezero evidence
cards describe the ancient lake instead of Mars today. The view is labelled a
simulation on screen.

### Falling Lake Salda (scenario)

Lowers Lake Salda by 1 to 20 m, chosen by the viewer, and shows the lake area
left and how far the shore moves. Published sources (linked in the panel)
report a falling level. The lake bed is assumed: SRTM records only the
surface, so depth grows evenly from the shore to the published maximum of
196 m. It is labelled a scenario, not a forecast.

## Salda study: things to know

- "Observations only" (section 00) adds `observed` to `<body>`. CSS then hides
  every element whose `data-ev` is `model` or `unknown` and prints "Hidden:"
  plus its `data-ev-label`. Table cells get `data-ev` from the statement's
  class in `salda_report.json`; the two maps, the one-scale figure, the inlet
  table and the lake-level curves are marked `model` by hand in `study.html`.
  The climate and slope charts and the assessment are not hidden.
- The one-scale figure draws Salda's SRTM lake outline inside the modelled
  Jezero lake. Salda is centred on the Jezero lake for comparison only; it
  says nothing about position.

- Wikipedia gives Salda's surface elevation as 1,316 m; SRTM measures 1,140 m,
  the figure used here.
- Catchments stop at the map edge; Jezero's real river catchments are larger.
- Zone B at Jezero (the Margin Unit) is placed by eye.
- The assessment's "support" levels are our judgement, not a measurement.
- Lake Salda is a protected area; the suggested fieldwork needs permission.

## Libraries and tiles

Leaflet 1.9.4 (BSD 2-Clause) from unpkg; three.js 0.160.0 (MIT) from
jsDelivr; IBM Plex Sans and Mono (SIL Open Font Licence) from Google Fonts.
Map tiles: Sentinel-2 cloudless 2020 by EOX (contains modified Copernicus
Sentinel data, CC BY-NC-SA 4.0), NASA GIBS Blue Marble, NASA Mars Trek, and
OpenStreetMap (ODbL).

## AI use

The code in this folder was written by Claude (Anthropic, Claude Code) at the
team's direction; each file says so in its first lines. The page text is an
AI draft for the team to check. The heightmaps are NASA data fetched by
`tools/build_terrain.py`, not AI-generated values. No AI-generated pictures,
video or audio are used; the site icon (`favicon.svg`, two plain circles) was
written as SVG code by the AI and says so in the file. Every use is listed, dated, in the
[main README](../README.md#ai-use).
