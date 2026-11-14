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
