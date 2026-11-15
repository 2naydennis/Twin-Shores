# analogs.json schema

Written by `pipeline/`, read by `web/`.

```
{
  "generated_at": "ISO 8601 timestamp",
  "features": ["feature_name", ...],        // order used everywhere below
  "targets": [
    {
      "id": "jezero",                        // short, lowercase, no spaces
      "name": "Jezero Crater",
      "body": "mars",                        // the planet the target is on
      "lat": 18.38,
      "lon": 77.58,
      "features": { "feature_name": number, ... }
    }
  ],
  "analogs": [
    {
      "target_id": "jezero",                 // matches a target's id
      "name": "Lake Salda",
      "country": "Türkiye",
      "lat": 37.55,
      "lon": 29.68,
      "score": 0.0,                          // 0 to 1, higher is a closer match
      "feature_match": { "feature_name": number, ... },  // 0 to 1 per feature
      "known_analog": true                   // already documented as an analog for this target
    }
  ]
}
```

Fields added by `pipeline/score.py`:

- top level `variables`: label, unit, weight and kind (`measured` or `judged`)
  for each feature
- on each target: `notes` and `judged_reference`, the text behind its values
- on each analog: `coverage` (how many variables the score used), `values`
  (the candidate's own measured numbers) and `judged` (match, note, source for
  each judged variable)

A variable missing from `feature_match` was skipped for that pair, not scored
as zero.

Rules:

- `score` and every `feature_match` value are between 0 and 1.
- `analogs` is sorted by `target_id`, then by `score` descending.
- Coordinates are decimal degrees; south and west are negative.
- `known_analog` is a label for display and validation only. The pipeline must
  not use it when computing `score`.
