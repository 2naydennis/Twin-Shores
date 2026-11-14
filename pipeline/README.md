# pipeline

Fetches Earth data, scores each location against the Moon and Mars targets,
and writes `../data/analogs.json` in the shape described in
`../data/SCHEMA.md`.

Put downloaded raw files in `pipeline/raw/`. That folder is ignored by git.

## score.py and config.json

`config.json` holds the team's choices: the eight variables, their weights,
the targets, and the candidate places. `score.py` measures what can be
measured, compares each candidate with each target, and writes
`../data/analogs.json`.

```bash
python3 pipeline/score.py
```

| Variable | Kind | Where the number comes from |
|----------|------|-----------------------------|
| Temperature | measured | Earth: NASA POWER. Mars: NSSDCA fact sheet (planet-wide) |
| Atmospheric pressure | measured | Earth: NASA POWER. Mars: NSSDCA fact sheet |
| Evaporation | measured | Earth: NASA POWER. Mars: no present-day value, so it is skipped |
| Terrain slope | measured | Earth: ASTER GDEM. Mars: MOLA. Same 900 m grid on both |
| Water pH | judged | Team reads a source and enters a 0 to 1 match |
| Mineral deposits | judged | same |
| Water body | judged | same |
| Sediment layers | judged | same |

To add a candidate, add one line to `candidates` in `config.json` with a
name, country, latitude and longitude, then run the script again. To fill a
judged variable, add a `judged` block like Lake Salda's, always with a note
and a source.

Read the scores with care:

- **Coverage matters.** A candidate scored on 6 variables cannot be compared
  fairly with one scored on 3. In the first run Lake Salda leads largely
  because it is the only place with judged variables filled in. Fill them in
  for every candidate before drawing conclusions.
- **Pressure never matches.** Every place on Earth has over 100 times Mars's
  air pressure. It is in the score because the team chose it, and it is an
  honest limit to show.
- **Weights are all 1.** They are placeholders until the team sets them.

## find_lakes.py

Adds every natural lake in Türkiye that Wikidata knows about to the
candidates in `config.json` (148 lakes on 2026-11-14). It never changes or
removes existing candidates.

```bash
python3 pipeline/find_lakes.py
```

Wikidata's classes are imperfect: the list includes a few entries that are
not really lakes (the Golden Horn is an estuary) and many lakes share a name
(several are called Karagöl). Check a candidate on a map before presenting it.

### First full run, 2026-11-14

157 places against Jezero: 148 Türkiye lakes plus 9 known analogs.

- On the three variables measured for every place (temperature, pressure,
  slope), the top of the list is the cold, high, flat lakes of eastern
  Anatolia: Çıldır, Erçek, Lavaş, Kuyucuk, Arin, Haçlı, Van.
- Scores are bunched (most between 0.30 and 0.48), so these three variables
  separate places only weakly.
- **The known analogs do not rank high on these three variables.** Haughton
  Crater is 2nd, but Lake Salda is 45th, Death Valley 100th and the Atacama
  124th. Measured variables alone do not reproduce what makes those places
  Mars analogs. Dryness is not compared at all, because Mars has no
  present-day evaporation value.
- Lake Salda is 1st overall only because it is the one place with the judged
  variables (minerals, water, sediments) filled in.

So the judged variables carry the result. The next step is to fill them in,
with sources, for a shortlist of lakes.

### Second run: judged variables for the top 15, 2026-11-14

The 15 lakes that ranked highest on measured variables were researched on the
web. Matches were entered in `config.json` only where a source was found, each
with a note, a link, and `proposed_by` marking it as an AI proposal for the
team to confirm. The rubric is in `_judged_rubric` in the same file.

| Rank | Place | Score | Variables | Status |
|------|-------|-------|-----------|--------|
| 1 | Lake Salda | 0.695 | 6 of 8 | known analog |
| 2 | Lake Van | 0.688 | 7 of 8 | new candidate |
| 3 | Lake Erçek | 0.679 | 5 of 8 | new candidate |
| 4 | Lake Çıldır | 0.484 | 4 of 8 | new candidate |
| 5 | Haughton Crater | 0.474 | 3 of 8 | known analog |

What the sources say:

- **Lake Van:** the largest soda lake on Earth, pH about 9.7 to 9.8, a
  terminal basin with no outlet, with carbonate microbialite towers up to
  about 40 m high. Its carbonates are aragonite and calcite, not Salda's
  magnesium carbonate, so minerals is entered as a partial match.
- **Lake Erçek:** a closed-basin soda lake east of Van with a reported pH of
  9.7. The only source found is a conference abstract. Nothing was found on
  its minerals or sediments, so those are empty, not zero.
- **Arin, Kartsakhi, Nazik, Çıldır:** one or two variables each, mostly from
  thin sources. See the notes in `config.json`.
- **Nine of the fifteen** have nothing entered: no usable source was found.

### Third run: salty and alkaline lakes outside the top 15, 2026-11-14

The top 15 were picked by climate and slope, which favours cold, high lakes.
To offset that, eight lakes known as salty or alkaline were researched too:
Burdur, Acıgöl (Denizli), Tuz, Seyfe, Bolluk, Eber, Akşehir, and the Acı Göl
crater lake at Karapınar.

| Rank | Place | Score | Variables | Main evidence |
|------|-------|-------|-----------|---------------|
| 1 | Lake Salda | 0.695 | 6 of 8 | known analog |
| 2 | Lake Van | 0.688 | 7 of 8 | pH 9.7 to 9.8, closed basin, microbialite towers |
| 3 | Lake Erçek | 0.679 | 5 of 8 | pH 9.7, closed basin |
| 4 | Lake Burdur | 0.646 | 5 of 8 | pH about 9.1, closed basin |
| 5 | Lake Akşehir | 0.559 | 4 of 8 | closed basin |
| 6 | Lake Tuz | 0.550 | 4 of 8 | magnesium-bearing carbonates in playa muds |
| 7 | Lake Eber | 0.549 | 5 of 8 | closed basin, described as alkaline |
| 8 | Lake Seyfe | 0.539 | 6 of 8 | closed basin, conflicting pH, carbonate-saturated water |
| 9 | Acı Göl (Karapınar) | 0.528 | 4 of 8 | crater lake with no outlet |
| 10 | Lake Acıgöl (Denizli) | 0.517 | 7 of 8 | closed basin, carbonates precipitating, microbial mats |

Two things stand out. Lake Tuz is the only researched lake besides Salda with
magnesium-bearing carbonates on record. Lake Acıgöl has the most complete
evidence after Van (7 of 8 variables) but scores lower, because its matches
are partial and it is warmer and lower than the eastern lakes.

How each source was checked is recorded per entry in `config.json` under
`checked`. Only Lake Salda's and Lake Erçek's sources were read directly.
The rest come from search-result summaries of the cited papers, because the
publishers' pages did not open. A human still has to open them.

### Fourth run: 20 more lakes and three robustness tests, 2026-11-14

**More research.** The 20 best-documented lakes not yet covered were
searched. Evidence was found for eight: Hazar, İznik, Bafa, Eğirdir,
Köyceğiz, Uluabat, Boraboy, Akdoğan. Twelve had nothing usable. In total 44
of the 149 Türkiye lakes have now been researched and 23 have evidence
entered.

| Rank | Place | Score | Variables | Main evidence |
|------|-------|-------|-----------|---------------|
| 1 | Lake Salda | 0.695 | 6 of 8 | known analog |
| 2 | Lake Van | 0.688 | 7 of 8 | pH 9.7 to 9.8, closed basin, microbialite towers |
| 3 | Lake Erçek | 0.679 | 5 of 8 | pH 9.7, closed basin |
| 4 | Lake Burdur | 0.646 | 5 of 8 | pH about 9.1, closed basin |
| 5 | Lake Hazar | 0.610 | 5 of 8 | soda lake, pH 9.1 to 9.6, closed basin |
| 6 | Lake İznik | 0.600 | 6 of 8 | pH about 9.2, carbonates precipitating, layered sediment record |
| 7 | Lake Bafa | 0.575 | 6 of 8 | closed lake system, carbonate-rich sediments |

**Test 1: random weights** (`sensitivity.py`). The eight weights were redrawn
at random 5,000 times. Share of draws in which each place finished in the
top 3 and top 5:

| Place | Top 3 | Top 5 |
|-------|-------|-------|
| Lake Salda | 77% | 96% |
| Lake Van | 81% | 95% |
| Lake Erçek | 87% | 98% |
| Lake Burdur | 34% | 86% |
| Lake Hazar | 0.4% | 39% |
| Lake İznik | 9% | 34% |

Salda, Van and Erçek hold the top of the list under almost any weighting.
Burdur is usually fourth or fifth. Below that the order depends on the
weights, so do not present ranks 5 and lower as settled.

**Test 2: leave one variable out.** Salda, Van and Erçek stay in the top five
whichever single variable is removed. Without minerals or sediments Salda
drops from first to fourth, which shows how much of Salda's lead rests on
those two entries.

**Test 3: equal evidence.** Ranking only the 11 places with at least five
variables gives the same order at the top: Salda, Van, Erçek, Burdur, Hazar,
İznik, Bafa.

**Second elevation model** (`crosscheck_slope.py`). Slope was measured again
for all 149 Türkiye lakes with EU-DEM, the Copernicus elevation model
(European Union and ESA), on the same 900 m grid. Against the ASTER values
used in the scores: correlation 0.993, rank correlation 0.987, mean
difference 0.15°, median 0.04°. The largest gaps (up to 2.8°) are at coastal
lagoons, where the two models treat the shoreline differently. Slope is not
a weak point of the scores.

What these tests do not cover: they test the arithmetic, not the evidence.
If a judged match is wrong, every test above inherits the error.

Limits to state wherever these results are shown:

- Lake Van is not on NASA's Planetary Analog Explorer list, but it is not
  unknown: a 2026 news report describes researchers comparing its
  microbialites with Lake Salda and Jezero material. Call it "not yet a
  listed analog", not "a discovery".
- Lake Erçek rests on one conference abstract. It is a lead to check, not a
  result.
- Only the top 15 by measured variables were researched. Lakes further down
  (other alkaline or salty lakes) may match better on the judged variables
  and were not looked at.
- Coverage still differs between places, so scores are not strictly
  comparable.
- The pH variable cannot be checked against Mars: Jezero's ancient lake has
  no measured pH.

## fetch_nasa.py

Pulls real NASA data and saves it under `data/nasa/`. Standard library only,
nothing to install. Run from the repo root:

```bash
python3 pipeline/fetch_nasa.py
```

| Output file | Contents | NASA source |
|-------------|----------|-------------|
| `data/nasa/earth_climate.json` | Annual and monthly climate for 8 Earth sites | NASA POWER |
| `data/nasa/target_elevation.json` | Elevation at 4 Mars and 2 Moon targets | MOLA MEGDR, LOLA LDEM_16 |
| `data/nasa/terrain_profiles.json` | West-east terrain profile across Lake Salda and Jezero Crater, 25 km each side | SRTM, MOLA MEGDR |

The first run downloads about 80 MB into `pipeline/raw/`; later runs reuse it.

The Earth sites and the Moon and Mars targets come from NASA's Planetary
Analog Explorer. Their coordinates were typed in by hand and are approximate.
Check them, then edit `EARTH_SITES` and `TARGETS` at the top of the script to
add your own.

Things to know about the numbers:

- POWER values are averages over grid cells tens of kilometres wide.
- The Mars and Moon grids are coarse: one cell is about 3.7 km on Mars and
  1.9 km on the Moon. Shackleton sits almost on the pole, where this map
  projection is badly stretched, so treat its value as rough.
- SRTM shows the surface of Lake Salda (1140 m), not the lake bed.
- The Jezero profile has 15 points and the Salda profile has 227. Say so
  wherever the two are drawn together.

## NASA POWER quick start

NASA POWER returns climate values for any point on Earth, with no login. This
request was tested on 2026-11-14 for Lake Salda (lat 37.55, lon 29.68):

```bash
curl 'https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,ALLSKY_SFC_SW_DWN&community=AG&longitude=29.68&latitude=37.55&format=JSON'
```

Annual values it returned:

| Parameter           | Meaning                          | Value          |
|---------------------|----------------------------------|----------------|
| `T2M`               | Mean air temperature at 2 m      | 12.14 °C       |
| `T2M_MAX`           | Highest temperature              | 38.94 °C       |
| `T2M_MIN`           | Lowest temperature               | -19.36 °C      |
| `PRECTOTCORR`       | Precipitation                    | 1.89 mm/day    |
| `ALLSKY_SFC_SW_DWN` | Solar irradiance at the surface  | 17.76 MJ/m²/day |

The response is JSON. Monthly values sit beside the annual one (`JAN` to
`DEC`, then `ANN`) under `properties.parameter`. Change `latitude` and
`longitude` to query any other site.

The full list of NASA datasets considered for this project is in
`../SUBMISSION.md`, section 7.

## Validation

Known analogs are flagged `known_analog` in the output, but the flag must not
feed into the score. The check is whether they rank highly on features alone:
Lake Salda for Jezero, the Atacama and the Antarctic Dry Valleys for Mars.

NASA's Planetary Analog Explorer lists 11 analog pairs NASA already
recognises, Lake Salda among them. It is a ready-made answer key:
https://science.nasa.gov/solar-system/analog-explorer/

Salda only ranks well for Jezero if the features include geology (ultramafic
rock, carbonates, lake or delta setting), not just climate.
