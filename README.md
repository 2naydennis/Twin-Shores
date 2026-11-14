# Analog Finder

NASA Space Apps Challenge project: find places on Earth that resemble candidate
Moon base and Mars sites.

## How it works

1. Each target site (Moon or Mars) is described by a set of features:
   temperature, aridity, terrain, rock type, and so on.
2. The pipeline computes the same features for Earth locations and scores how
   closely each one matches each target.
3. The web app shows the best matches on a map and explains why they match.

## Layout

| Folder      | Owner    | Contents                                         |
|-------------|----------|--------------------------------------------------|
| `pipeline/` | Person A | Python code that fetches data and scores sites   |
| `web/`      | Person B | Map and site detail pages                        |
| `data/`     | Person A | `analogs.json`, written by the pipeline, read by the web app |

`data/analogs.json` is the only file both sides depend on. Its shape is
described in [data/SCHEMA.md](data/SCHEMA.md). Agree any change to that shape
in chat before making it.

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

- (none yet)
