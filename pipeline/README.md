# pipeline

Fetches Earth data, scores each location against the Moon and Mars targets,
and writes `../data/analogs.json` in the shape described in
`../data/SCHEMA.md`.

Put downloaded raw files in `pipeline/raw/`. That folder is ignored by git.
