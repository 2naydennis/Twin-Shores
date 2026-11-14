# Analog Finder

NASA Space Apps Challenge project: find places on Earth that resemble candidate
Moon base and Mars sites, and show why they match.

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

## Data sources

List every dataset here as you add it, with a link. Judges look for this.
Open each source and confirm it says what you claim before citing it.

Planned:

- NASA POWER: Earth temperature, solar radiation, precipitation
- SRTM or Copernicus DEM: Earth terrain, Salda profile
- MOLA: Mars terrain, Jezero profile
- LRO (LOLA, Diviner): Moon terrain and surface temperature
- NASA Earth Observatory and NASA Science articles on Lake Salda and Jezero

In use:

- (none yet)
