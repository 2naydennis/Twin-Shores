# pipeline

Fetches Earth data, scores each location against the Moon and Mars targets,
and writes `../data/analogs.json` in the shape described in
`../data/SCHEMA.md`.

Put downloaded raw files in `pipeline/raw/`. That folder is ignored by git.

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
