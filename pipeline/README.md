# pipeline

Fetches Earth data, scores each location against the Moon and Mars targets,
and writes `../data/analogs.json` in the shape described in
`../data/SCHEMA.md`.

Put downloaded raw files in `pipeline/raw/`. That folder is ignored by git.

## Validation

Known analogs are flagged `known_analog` in the output, but the flag must not
feed into the score. The check is whether they rank highly on features alone:
Lake Salda for Jezero, the Atacama and the Antarctic Dry Valleys for Mars.

Salda only ranks well for Jezero if the features include geology (ultramafic
rock, carbonates, lake or delta setting), not just climate.
