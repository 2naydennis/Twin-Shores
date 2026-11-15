# pipeline

Python scripts that fetch NASA and ESA data, score every place against Jezero
Crater, and test the ranking. Standard library only, nothing to install. Run
from the repo root, in this order:

```bash
python3 pipeline/fetch_nasa.py        # NASA POWER, MOLA and SRTM samples into data/nasa/
python3 pipeline/score.py             # scores every place against Jezero into data/analogs.json
python3 pipeline/sensitivity.py       # random-weights, leave-one-out and equal-evidence tests
python3 pipeline/crosscheck_slope.py  # slope re-measured with Copernicus EU-DEM
python3 pipeline/site_cards.py        # field-test cards and the Salda vs Jezero profiles
python3 pipeline/salda_study.py       # basin analysis of Salda and Jezero
```

`find_lakes.py` re-imports the list of natural lakes in Türkiye from
Wikidata. Downloads are cached in `pipeline/raw/`, which git ignores; the
first run fetches about 45 MB.

| Script | Writes | Uses |
|--------|--------|------|
| `fetch_nasa.py` | `data/nasa/earth_climate.json`, `target_elevation.json`, `terrain_profiles.json` | NASA POWER, MGS MOLA MEGDR, SRTM |
| `score.py` | `data/analogs.json` | `config.json`, NASA POWER, ASTER GDEM (OpenTopoData), MOLA |
| `sensitivity.py` | `data/sensitivity.json` | `data/analogs.json` |
| `crosscheck_slope.py` | `data/slope_crosscheck.json` | Copernicus EU-DEM (OpenTopoData) |
| `site_cards.py` | `data/site_cards.json`, `data/twin_salda.json` | NASA POWER monthly climate, SRTM and MOLA heightmaps in `web/rover/terrain/`, Wikidata |
| `salda_study.py` | `data/salda_study.json` | SRTM and MOLA heightmaps in `web/rover/terrain/` |
| `find_lakes.py` | adds candidates to `config.json` | Wikidata |

## The method

`config.json` holds the team's choices: the eight variables, their weights,
the target (Jezero Crater) and the candidate places. `score.py` measures what
can be measured and compares each place with Jezero.

| Variable | Kind | Where the number comes from |
|----------|------|-----------------------------|
| Temperature | measured | Earth: NASA POWER (T2M). Mars: NSSDCA fact sheet, planet-wide |
| Atmospheric pressure | measured | Earth: NASA POWER (PS). Mars: NSSDCA fact sheet |
| Evaporation | measured | Earth: NASA POWER (EVLAND). Mars: no present-day value, so it is skipped |
| Terrain slope | measured | Earth: ASTER GDEM. Mars: MOLA. Same 900 m grid on both |
| Water pH | judged | A 0 to 1 match read from a published source |
| Mineral deposits | judged | same |
| Water body | judged | same |
| Sediment layers | judged | same |

```
similarity = 1 − |place − Jezero| ÷ spread of that variable across all places
score      = weighted average of the similarities available for that place
```

A variable with no value is left out of that place's score, never counted as
zero. All weights are currently 1. Every judged entry carries a note, a source
link, `proposed_by` (who proposed the match) and `checked` (how far the source
was read). The rubric is in `_judged_rubric` in `config.json`.

## Results

70 places: 38 lakes in Türkiye, 24 lakes in other countries, 8 known analog
sites. Evidence is entered for 40 of the 62 lakes.

| Rank | Place | Score | Variables |
|------|-------|-------|-----------|
| 1 | Lake Salda, Türkiye (known analog) | 0.741 | 7 of 8 |
| 2 | Lake Van, Türkiye | 0.693 | 7 of 8 |
| 3 | Lake Alchichica, Mexico | 0.689 | 7 of 8 |
| 4 | Lake Erçek, Türkiye | 0.687 | 5 of 8 |
| 5 | Mono Lake, USA | 0.657 | 6 of 8 |
| 6 | Lake Burdur, Türkiye | 0.655 | 5 of 8 |

**How the list was built.** The search began with all 148 natural lakes in
Türkiye on Wikidata, plus nine known analogs from NASA's Planetary Analog
Explorer. Measured variables alone did not reproduce the known analogs (Lake
Salda ranked 45th, Death Valley 100th), so judged variables were researched,
first for the 15 lakes highest on measured variables, then for salty and
alkaline lakes, then for 20 more well-documented lakes. On 2026-11-14 the team
removed 111 Turkish lakes with no evidence that lie more than 150 km from
Lake Salda and added 24 lakes from other countries: carbonate and microbialite
lakes, impact-crater lakes, soda lakes, and five large lakes expected to be
poor analogs. The earlier lists are in the git history of `config.json`.

## Robustness tests

- **Random weights** (`sensitivity.py`): the eight weights redrawn 5,000
  times. Salda is first in 69% of draws and in the top five in 99%. Top five:
  Erçek 92%, Van 83%, Alchichica 65%, Mono Lake and Burdur 48% each.
- **Leave one variable out:** Salda, Van and Erçek stay in the top five in all
  eight cases; Alchichica in six. Without minerals or sediments Salda drops
  from first, which shows how much its lead rests on those entries.
- **Equal evidence** (19 places with at least five variables): Salda, Van,
  Alchichica, Erçek, Mono Lake, Burdur, Magadi, Natron.
- **Second elevation model** (`crosscheck_slope.py`): slope at the 38 Turkish
  lakes re-measured with Copernicus EU-DEM (European Union and ESA).
  Correlation with ASTER 0.988, rank correlation 0.996, median difference
  0.02°. EU-DEM does not cover the lakes outside Europe and Türkiye.

These tests check the arithmetic, not the evidence. A wrong judged entry
carries through all of them.

## Source check (2026-11-15)

Of the 73 judged entries, the source text of 40 was opened and supports the
entry (`read directly`). Twelve were opened but do not confirm everything the
entry says (`source opened ... entry not confirmed`); the team decides these:

| Place | Variable | What the source did and did not show |
|-------|----------|--------------------------------------|
| Lake Eber | pH | Nothing about alkaline or salty water on the page |
| Lake Eber | Water body | Closed basin confirmed; the fall in level is not there |
| Lake Köyceğiz | Water body | Meromictic and thermal confirmed; brackish tidal inflow is not there |
| Great Salt Lake | pH | The cited paper does not give the lake's pH |
| Lake Titicaca | Water body | The cited page lists it as endorheic and does not mention an outflow |
| Lake Uluabat | Water body | Shallow lake with an inflow confirmed; the outflow is not there |
| Lake Çıldır | Water body | Freshwater confirmed; the lava dam is not there |
| Lake Seyfe | Water body | Closed basin, area and 2008 drying are not in the abstract |
| Lake Seyfe | pH | The link is dead |
| Acı Göl | Water body | The page showed no text about the lake |
| Lake Nazik | pH | pH was measured; no value or alkaline character in the abstract |
| Lake Eğirdir | pH | pH was monitored; no value in the abstract |

Twenty-one entries are still unread (PDFs, or publishers that refused the
request) and keep the `search-result summary` mark. Three entries were
corrected from their sources (Lake Bacalar's pH and minerals, Lake
Alchichica's pH source, Great Salt Lake's mineral and sediment sources); no
score or rank changed.

## Limits

- No place on Earth comes near Mars's air pressure, cold or radiation.
- Places are scored on different numbers of variables, so scores are not
  strictly comparable.
- Jezero's ancient lake has no measured pH; that variable compares with the
  conditions inferred from its carbonates.
- Lake Van is not on NASA's analog list but is already studied by researchers:
  call it "not yet a listed analog", not "a discovery". Lake Erçek rests on
  one conference abstract and is a lead to check.
- Several lakes rank high on climate alone (Lake Karakul is cold and high)
  with nothing known about their water or minerals.
- NASA POWER values are averages over cells tens of kilometres wide. The MOLA
  grid used for target elevation has cells about 3.7 km across. SRTM shows
  Lake Salda's surface (1,140 m), not its bed.
- Site and target coordinates in `fetch_nasa.py` were typed in by hand and
  are approximate.

## AI use

The scripts in this folder and the layout of `config.json` were written by
Claude (Anthropic, Claude Code); each file says so in its first lines. The
judged matches were proposed by the AI from the cited sources and are marked
`proposed_by` AI until the team confirms them. The variables and the list of
places are the team's choices. Every use is listed, dated, in the
[main README](../README.md#ai-use).
