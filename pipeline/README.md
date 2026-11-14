# pipeline

Fetches Earth data, scores each location against the Moon and Mars targets,
and writes `../data/analogs.json` in the shape described in
`../data/SCHEMA.md`.

Put downloaded raw files in `pipeline/raw/`. That folder is ignored by git.

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
