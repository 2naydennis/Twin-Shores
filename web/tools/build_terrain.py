"""Build the two terrain heightmaps used by web/rover.html.

AI-generated: written by Claude (Anthropic, Claude Code) on 2026-11-14. Review before use.

Needs numpy and Pillow. Run from the repo root:

    python web/tools/build_terrain.py

What it produces (all in web/rover/terrain/):

    salda.bin    257 x 257 heights, Lake Salda, from NASA SRTM 1 arc second
    jezero.bin   257 x 257 heights, Jezero Crater, from MGS MOLA MEGDR 128 px/degree
    sites.json   what each file covers, its elevation range, and its source

Each .bin is row-major, north row first, west column first, unsigned 16-bit
little-endian. Height in metres = min_m + value / 65535 * (max_m - min_m).

The elevation values are NASA data. Only the resampling to 257 x 257 is ours.
Raw downloads are cached outside the repo (see CACHE).

If Python rejects the PDS server's certificate (seen on Windows), fetch the
Jezero rows with curl into the cache folder and run this script again; the
script prints nothing about it, so here is the command for the default patch:

    curl -r 73958400-77160959 -o <CACHE>/megt44n000hb_rows_3210_3348.img       https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg128/megt44n000hb.img
"""

import gzip
import json
import math
import os
import sys
import tempfile
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "web" / "rover" / "terrain"
CACHE = Path(os.environ.get("TERRAIN_CACHE", Path(tempfile.gettempdir()) / "analog-finder-terrain"))
GRID = 257

SALDA = {
    "id": "salda", "name": "Lake Salda", "place": "Burdur, Türkiye", "body": "earth",
    "lat": 37.55, "lon": 29.68, "width_km": 20.0, "radius_km": 6371.0,
    "dataset": "NASA SRTM 1 arc second, tile N37E029 (served by AWS Terrain Tiles)",
    "url": "https://s3.amazonaws.com/elevation-tiles-prod/skadi/N37/N37E029.hgt.gz",
    "datum": "metres above the EGM96 geoid (about sea level)",
}
JEZERO = {
    "id": "jezero", "name": "Jezero Crater", "place": "Syrtis Major quadrangle, Mars", "body": "mars",
    "lat": 18.38, "lon": 77.58, "width_km": 64.0, "radius_km": 3396.0,
    "dataset": "MGS MOLA MEGDR, MEGT44N000HB, 128 pixels per degree (NASA PDS Geosciences Node)",
    "url": "https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg128/megt44n000hb.img",
    "datum": "metres above the MOLA areoid",
}


def get(url, byte_range=None):
    headers = {"User-Agent": "analog-finder"}
    if byte_range:
        headers["Range"] = f"bytes={byte_range[0]}-{byte_range[1]}"
    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=300) as response:
        if byte_range and response.status != 206:
            sys.exit(f"{url} ignored the Range header; refusing to download the whole file")
        return response.read()


def cached(name, fetch):
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / name
    if not path.exists():
        print(f"  downloading {name}")
        path.write_bytes(fetch())
    return path.read_bytes()


def spans(site):
    """Half-height and half-width of the square patch, in degrees."""
    km_per_deg = 2 * math.pi * site["radius_km"] / 360.0
    half_lat = site["width_km"] / 2 / km_per_deg
    half_lon = site["width_km"] / 2 / (km_per_deg * math.cos(math.radians(site["lat"])))
    return half_lat, half_lon


def salda_patch():
    size = 3601  # SRTM1 tile: 3601 x 3601, big-endian int16, north row first
    raw = gzip.decompress(cached("N37E029.hgt.gz", lambda: get(SALDA["url"])))
    tile = np.frombuffer(raw, dtype=">i2").reshape(size, size).astype(np.float32)
    half_lat, half_lon = spans(SALDA)
    r0 = round((38 - (SALDA["lat"] + half_lat)) * (size - 1))
    r1 = round((38 - (SALDA["lat"] - half_lat)) * (size - 1))
    c0 = round((SALDA["lon"] - half_lon - 29) * (size - 1))
    c1 = round((SALDA["lon"] + half_lon - 29) * (size - 1))
    patch = tile[r0:r1 + 1, c0:c1 + 1]
    if (patch == -32768).any():
        sys.exit("SRTM patch has voids; fill them before using it")
    return patch


def jezero_patch():
    ppd, cols, top_lat = 128, 11520, 44  # tile covers 44N to 0, 0 to 90E, big-endian int16
    half_lat, half_lon = spans(JEZERO)
    r0 = round((top_lat - (JEZERO["lat"] + half_lat)) * ppd)
    r1 = round((top_lat - (JEZERO["lat"] - half_lat)) * ppd)
    c0 = round((JEZERO["lon"] - half_lon) * ppd)
    c1 = round((JEZERO["lon"] + half_lon) * ppd)
    start, end = r0 * cols * 2, (r1 + 1) * cols * 2 - 1
    raw = cached(f"megt44n000hb_rows_{r0}_{r1}.img", lambda: get(JEZERO["url"], (start, end)))
    rows = np.frombuffer(raw, dtype=">i2").reshape(r1 - r0 + 1, cols).astype(np.float32)
    return rows[:, c0:c1 + 1]


def resample(patch):
    image = Image.fromarray(patch, mode="F")
    grow = patch.shape[0] < GRID
    return np.asarray(image.resize((GRID, GRID), Image.BICUBIC if grow else Image.BILINEAR), dtype=np.float32)


def save(site, patch):
    grid = resample(patch)
    low, high = float(grid.min()), float(grid.max())
    packed = np.round((grid - low) / (high - low) * 65535).astype("<u2")
    (OUT / f"{site['id']}.bin").write_bytes(packed.tobytes())
    source_m = site["width_km"] * 1000 / (patch.shape[0] - 1)
    entry = {k: site[k] for k in ("id", "name", "place", "body", "lat", "lon", "width_km", "dataset", "url", "datum")}
    entry.update({
        "file": f"{site['id']}.bin", "grid": GRID,
        "min_m": round(low, 1), "max_m": round(high, 1),
        "source_cells": list(patch.shape), "source_cell_m": round(source_m, 1),
        "grid_cell_m": round(site["width_km"] * 1000 / (GRID - 1), 1),
    })
    print(f"  {site['name']}: source {patch.shape}, {source_m:.0f} m/cell, {low:.0f} to {high:.0f} m")
    return entry, grid


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    print("Lake Salda (SRTM)")
    salda, salda_grid = save(SALDA, salda_patch())
    mid = GRID // 2
    lake = float(np.median(salda_grid[mid - 2:mid + 3, mid - 2:mid + 3]))
    salda["lake_level_m"] = round(lake, 1)
    flat = int((np.abs(salda_grid - lake) < 0.75).sum())
    print(f"  lake surface {lake:.1f} m, {flat} of {GRID * GRID} cells at that level")
    print("Jezero Crater (MOLA)")
    jezero, _ = save(JEZERO, jezero_patch())
    (OUT / "sites.json").write_text(json.dumps({
        "produced_by": "web/tools/build_terrain.py",
        "fetched_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "note": "Elevation values are NASA data resampled to a 257 x 257 grid. North row first, "
                "west column first, uint16 little-endian; metres = min_m + value / 65535 * (max_m - min_m). "
                "SRTM records the lake surface, not the lake bed.",
        "sites": [salda, jezero],
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("wrote web/rover/terrain/")


if __name__ == "__main__":
    main()
