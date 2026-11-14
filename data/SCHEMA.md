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
      "body": "mars",                        // "mars" or "moon"
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
      "feature_match": { "feature_name": number, ... }   // 0 to 1 per feature
    }
  ]
}
```

Rules:

- `score` and every `feature_match` value are between 0 and 1.
- `analogs` is sorted by `target_id`, then by `score` descending.
- Coordinates are decimal degrees; south and west are negative.
