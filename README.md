# Analog Finder

NASA Space Apps Challenge project: find places on Earth that resemble a Mars
landing site, and show why they match.

**Live site:** https://2naydennis.github.io/analog-finder/ ·
**Rover drive:** https://2naydennis.github.io/analog-finder/web/rover.html ·
**Slides:** https://2naydennis.github.io/analog-finder/demo/slides.pdf

## Scope: Mars, not the Moon

The challenge covers both Moon base locations and Mars. This project covers
Mars only, and one target on it: Jezero Crater, the ancient lake Perseverance
is exploring.

The reason is the method. Our eight comparison variables describe a lake:
water chemistry, mineral deposits, sediments, evaporation. They fit Jezero's
former lake and have no counterpart on the Moon, which never had one. A Moon
search needs its own variables (permanent shadow, regolith, lava tubes, polar
cold). The scoring code takes any target and any variable list, so that is an
extension of the same tool, not a rewrite. We did not build it in the time
available and do not claim to.

## Results so far

157 places scored against Jezero: 148 natural lakes in Türkiye and 9 known
analogs. Top of the ranking on 2026-11-14:

| Rank | Place | Score | Variables used | Status |
|------|-------|-------|----------------|--------|
| 1 | Lake Salda | 0.695 | 6 of 8 | known analog (NASA) |
| 2 | Lake Van | 0.688 | 7 of 8 | candidate |
| 3 | Lake Erçek | 0.679 | 5 of 8 | candidate |
| 4 | Lake Burdur | 0.646 | 5 of 8 | candidate |
| 5 | Lake Hazar | 0.610 | 5 of 8 | candidate |
| 6 | Lake İznik | 0.600 | 6 of 8 | candidate |

Three checks on this ranking (details in
[pipeline/README.md](pipeline/README.md)):

- **Weights.** With the eight weights redrawn at random 5,000 times, Lake
  Salda, Lake Van and Lake Erçek each stay in the top five in at least 95% of
  draws, and Lake Burdur in 86%.
- **Single variables.** Removing any one variable leaves Salda, Van and Erçek
  in the top five every time.
- **Second elevation model.** Slope was measured again with the Copernicus
  EU-DEM (European Union and ESA) and compared with the NASA/METI ASTER
  values used in the scores.

How to read it, and what it does not show, is in
[pipeline/README.md](pipeline/README.md). In short: places are scored on
different numbers of variables, the literature-based matches are proposals
awaiting the team's check, and no place on Earth matches Mars's air pressure.

## What we are building

**1. Global analog search (the core).**
Each target site on the Moon or Mars is described by a set of features:
temperature, aridity, terrain, rock type, and so on. The pipeline computes the
same features for Earth locations and scores how closely each one matches each
target. The web app shows the best matches on a map with a per-feature
breakdown.

**2. Lake Salda vs Jezero Crater (the featured case study).**
One analog examined in depth: Lake Salda in Burdur, Türkiye, against Jezero
Crater on Mars. A side-by-side page with:

- a comparison table (water history, minerals, rock type, sediments,
  microbialites)
- terrain profiles of both sites
- a present-day environment chart (temperature, pressure, radiation) that
  also shows where the analogy stops

**3. Validation.**
The search should rank known analogs highly without being told about them:
Lake Salda for Jezero, the Atacama and the Antarctic Dry Valleys for Mars in
general. Sites already documented as analogs are flagged `known_analog` in the
data so the app can show which results are rediscoveries and which are new
candidates.

## What we are not building

Cut to fit the time available. Explain these with a diagram and citations
instead of simulating them:

- mineral precipitation chemistry
- sediment transport and delta formation
- microbialite growth

## Two caveats to keep in every slide

- Salda is an analog for the ancient lake and carbonate setting at Jezero, not
  for Mars as a whole.
- Salda today and Jezero 3.5 billion years ago are different time frames. No
  place on Earth reproduces Mars or Moon gravity, pressure, or radiation.

## Layout

| Folder      | Owner        | Contents                                              |
|-------------|--------------|-------------------------------------------------------|
| `pipeline/` | `2naydennis` | Python code that fetches data and scores sites        |
| `web/`      | `Kranimo`    | Map, site detail cards, Salda vs Jezero page          |
| `data/`     | `2naydennis` | `analogs.json`, written by the pipeline, read by the web app |

`data/analogs.json` is the only file both sides depend on. Its shape is
described in [data/SCHEMA.md](data/SCHEMA.md). Agree any change to that shape
in chat before making it.

Swap the owners if you prefer; just keep one owner per folder.

## Working together

Pull before you start and before you push:

```bash
git pull --rebase
git add .
git commit -m "short description of the change"
git push
```

Stay inside your own folder. If you need to edit a shared file (this README,
the schema), tell the other person first.

## AI use

Space Apps requires AI-generated code and data to be acknowledged in text and
metadata. Add a line here every time an AI tool produces something that stays
in the project.

| Date       | Tool                         | What it produced or did                                   |
|------------|------------------------------|-----------------------------------------------------------|
| 2026-11-14 | Claude (Anthropic, Claude Code) | Repo scaffold: this README, `SUBMISSION.md`, `data/SCHEMA.md`, `.gitignore`, folder READMEs |
| 2026-11-14 | Claude (Anthropic, Claude Code) | `data/analogs.json` mock data (placeholder values, not real scores) |
| 2026-11-14 | Claude (Anthropic, Claude Code) | Suggested project structure, work split, and a first outline of the approach |
| 2026-11-14 | ChatGPT (OpenAI)             | Background reading on Lake Salda and Jezero Crater         |
| 2026-11-14 | Claude (Anthropic, Claude Code) | Found and link-checked the candidate NASA datasets in `SUBMISSION.md`; tested the NASA POWER request in `pipeline/README.md` |

| 2026-11-14 | Claude (Anthropic, Claude Code) | Wrote `pipeline/fetch_nasa.py` and ran it. The files in `data/nasa/` are NASA data fetched by that script, not AI-generated values. Site and target coordinates in the script were entered by the AI from memory and need checking |

| 2026-11-14 | Claude (Anthropic, Claude Code) | Wrote `pipeline/score.py` and the layout of `pipeline/config.json`, and ran the first scoring. The eight comparison variables were chosen by the team (from a list drafted earlier with ChatGPT). The scoring formula, the split into measured and judged variables, and the placeholder weights of 1 came from the AI and need the team's review |

| 2026-11-14 | Claude (Anthropic, Claude Code) | Wrote `pipeline/find_lakes.py` and ran it and the scoring over 157 places. Searching Türkiye's lakes was the team's choice; taking the full Wikidata list was the AI's suggestion |

| 2026-11-14 | Claude (Anthropic, Claude Code) | Web research on the 15 top-ranked lakes and the judged matches entered in `pipeline/config.json` for six of them, each marked `proposed_by` AI with its source. The rubric for judged variables was written by the AI. The team must check the sources and confirm or change every match |

| 2026-11-14 | Claude (Anthropic, Claude Code) | Web research and proposed matches for eight more lakes (salty and alkaline lakes outside the top 15); the "Scope" and "Results so far" text above; draft answers in `SUBMISSION.md`; the slide deck in `demo/` and the script that builds it. All drafts are for the team to rewrite in their own words |

| 2026-11-14 | Claude (Anthropic, Claude Code), in Kranimo's session | The website in `web/`: the map page (`index.html`, `map/app.js`, `map/style.css`), the rover drive (`rover.html`, the files in `rover/`) and `web/tools/build_terrain.py`. The terrain heightmaps are NASA data fetched by that script. Details in `web/README.md` |

| 2026-11-14 | Claude (Anthropic, Claude Code) | `pipeline/sensitivity.py` and `pipeline/crosscheck_slope.py` and their output files; web research and proposed matches for a third round of 20 lakes (evidence found for 8) |

| 2026-11-14 | Claude (Anthropic, Claude Code) | Redesign of the map page and a new method and results page: `web/index.html`, `web/method.html`, `web/map/app.js`, `web/map/method.js`, `web/map/style.css`, `web/favicon.svg`. The method page text is an AI draft |

| 2026-11-14 | Claude (Anthropic, Claude Code) | Restyle of the 3D terrain page (`web/rover.html`) and toned-down markers and wording in `web/rover/game.js` and `web/rover/main.js` |

| 2026-11-14 | Claude (Anthropic, Claude Code) | More detailed 3D scene: survey boat model, rover detail and materials, `web/rover/scenery.js` (sky, ripples, rocks, pines), shadows and reflections; Salda heightmap rebuilt at 513 x 513 from SRTM by `web/tools/build_terrain.py` |

| 2026-11-14 | Claude (Anthropic, Claude Code) | Lake Van and Lake Erçek map in the 3D page (terrain built by `web/tools/build_terrain.py` from SRTM), three-way site menu, Graphics High/Low setting, phone layout of the 3D page, per-minute script version stamp on all pages |

Commits made with AI help carry a `Co-Authored-By` line in the commit message.

## Data sources

List every dataset here as you add it, with a link. Judges look for this.
Open each source and confirm it says what you claim before citing it.

Planned (links and details in [SUBMISSION.md](SUBMISSION.md), section 7):

- NASA POWER: Earth temperature, solar radiation, precipitation
- NASA SRTM or Copernicus DEM: Earth terrain, Salda profile
- MOLA: Mars terrain, Jezero profile
- LRO (LOLA, Diviner): Moon terrain and surface temperature
- NASA Planetary Analog Explorer: known analogs to validate against
- NASA Earth Observatory and NASA Science articles on Lake Salda and Jezero

In use (fetched by `pipeline/fetch_nasa.py`, stored in `data/nasa/`):

- NASA POWER climatology API: climate for 8 Earth sites
- Mars Global Surveyor MOLA MEGDR (NASA PDS Geosciences Node): Mars target
  elevations, Jezero terrain profile
- LRO LOLA GDR LDEM_16 (NASA PDS Geosciences Node): Moon target elevations
- NASA SRTM 1 arc second, tile N37E029, downloaded from AWS Terrain Tiles:
  Lake Salda terrain profile
- NASA Planetary Analog Explorer: starting list of sites and targets
- NASA/METI ASTER GDEM, through the OpenTopoData API: slope at each Earth
  candidate
- NSSDCA Mars Fact Sheet: Mars temperature and pressure

In use by the website (`web/`):

- NASA SRTM tile N37E029 and MGS MOLA MEGDR MEGT44N000HB: rover-drive terrain
- NASA GIBS Blue Marble: optional base map
- ESA Copernicus Sentinel-2 cloudless (EOX): default satellite base map
- OpenStreetMap: alternative base map tiles
- Leaflet 1.9.4 and three.js 0.160.0: map and 3D libraries
