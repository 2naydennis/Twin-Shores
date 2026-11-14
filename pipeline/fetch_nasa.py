"""Fetch NASA data for the project and save it under data/nasa/.

AI-generated: written by Claude (Anthropic) on 2026-11-14. Review before use.

Standard library only, no installs needed. Run from the repo root:

    python3 pipeline/fetch_nasa.py

What it produces:

    data/nasa/earth_climate.json     NASA POWER climate for each Earth site
    data/nasa/target_elevation.json  MOLA (Mars) and LOLA (Moon) elevation at each target
    data/nasa/terrain_profiles.json  West-east terrain profile: Lake Salda and Jezero Crater

Large downloads are cached in pipeline/raw/, which git ignores.

Site and target coordinates below are approximate. Check each one against a
map before relying on it, and add your own sites to the lists.
"""

import array
import gzip
import json
import math
import ssl
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "pipeline" / "raw"
OUT = ROOT / "data" / "nasa"

# Earth sites from NASA's Planetary Analog Explorer (Moon and Mars pairs only).
# https://science.nasa.gov/solar-system/analog-explorer/
EARTH_SITES = [
    {"name": "Lake Salda", "country": "Türkiye", "lat": 37.55, "lon": 29.68},
    {"name": "Atacama Desert", "country": "Chile", "lat": -24.50, "lon": -69.25},
    {"name": "Death Valley", "country": "USA", "lat": 36.46, "lon": -116.87},
    {"name": "Kilauea", "country": "USA", "lat": 19.41, "lon": -155.28},
    {"name": "Medicine Lake Volcano", "country": "USA", "lat": 41.61, "lon": -121.55},
    {"name": "Pilot Valley", "country": "USA", "lat": 41.00, "lon": -114.00},
    {"name": "Verde Valley", "country": "USA", "lat": 34.56, "lon": -111.85},
    {"name": "Askja", "country": "Iceland", "lat": 65.03, "lon": -16.75},
]

# Moon and Mars places those Earth sites are paired with. Longitudes are east, 0 to 360.
TARGETS = [
    {"id": "jezero", "name": "Jezero Crater", "body": "mars", "lat": 18.38, "lon": 77.58},
    {"id": "gale", "name": "Gale Crater, base of Mount Sharp", "body": "mars", "lat": -4.59, "lon": 137.44},
    {"id": "utopia", "name": "Utopia Planitia, Viking 2 site", "body": "mars", "lat": 47.64, "lon": 134.29},
    {"id": "phoenix", "name": "Northern plains, Phoenix site", "body": "mars", "lat": 68.22, "lon": 234.25},
    {"id": "hadley", "name": "Hadley Rille, Apollo 15 site", "body": "moon", "lat": 26.13, "lon": 3.63},
    {"id": "shackleton", "name": "Shackleton Crater, lunar south pole", "body": "moon", "lat": -89.67, "lon": 129.78},
]

POWER_URL = "https://power.larc.nasa.gov/api/temporal/climatology/point"
POWER_PARAMS = ["T2M", "T2M_MAX", "T2M_MIN", "PRECTOTCORR", "ALLSKY_SFC_SW_DWN", "WS2M", "RH2M", "PS"]

# Global elevation grids, 16 pixels per degree, 5760 x 2880, 16-bit integers.
GRIDS = {
    "mars": {
        "dataset": "MGS MOLA MEGDR, MEGT90N000EB (NASA PDS Geosciences Node)",
        "url": "https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg016/megt90n000eb.img",
        "file": "megt90n000eb.img",
        "big_endian": True,
        "scale": 1.0,  # metres per count, relative to the Mars areoid
        "radius_km": 3396.0,
    },
    "moon": {
        "dataset": "LRO LOLA GDR, LDEM_16 (NASA PDS Geosciences Node)",
        "url": "https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/img/ldem_16.img",
        "file": "ldem_16.img",
        "big_endian": False,
        "scale": 0.5,  # metres per count, relative to a 1737.4 km sphere
        "radius_km": 1737.4,
    },
}
GRID_PPD, GRID_COLS, GRID_ROWS = 16, 5760, 2880

# NASA SRTM 1 arc second tile covering Lake Salda (37-38 N, 29-30 E), no login needed here.
SRTM = {
    "dataset": "NASA SRTM 1 arc second, tile N37E029 (served by AWS Terrain Tiles)",
    "url": "https://s3.amazonaws.com/elevation-tiles-prod/skadi/N37/N37E029.hgt.gz",
    "file": "N37E029.hgt.gz",
    "lat0": 37,
    "lon0": 29,
    "size": 3601,
}
EARTH_RADIUS_KM = 6371.0
PROFILE_HALF_WIDTH_KM = 25  # the SRTM tile ends 28 km east of Lake Salda


def ssl_context():
    """Default certificate checks, with a fallback for Pythons that ship no CA bundle.

    The python.org installer for macOS has no certificates until you run its
    "Install Certificates" step, so point it at a bundle that is already on disk.
    """
    context = ssl.create_default_context()
    if context.cert_store_stats()["x509_ca"] == 0:
        try:
            import certifi
            context.load_verify_locations(certifi.where())
        except ImportError:
            system_bundle = Path("/etc/ssl/cert.pem")
            if system_bundle.exists():
                context.load_verify_locations(str(system_bundle))
    return context


SSL_CONTEXT = None


def http_get(url):
    global SSL_CONTEXT
    if SSL_CONTEXT is None:
        SSL_CONTEXT = ssl_context()
    request = urllib.request.Request(url, headers={"User-Agent": "analog-finder"})
    with urllib.request.urlopen(request, timeout=180, context=SSL_CONTEXT) as response:
        return response.read()


def cached(url, filename):
    RAW.mkdir(parents=True, exist_ok=True)
    path = RAW / filename
    if not path.exists():
        print(f"  downloading {filename}")
        path.write_bytes(http_get(url))
    return path


def read_int16(data, big_endian):
    values = array.array("h")
    values.frombytes(data)
    if big_endian != (sys.byteorder == "big"):
        values.byteswap()
    return values


def fetch_climate(site):
    query = urllib.parse.urlencode({
        "parameters": ",".join(POWER_PARAMS),
        "community": "AG",
        "latitude": site["lat"],
        "longitude": site["lon"],
        "format": "JSON",
    })
    reply = json.loads(http_get(f"{POWER_URL}?{query}"))
    annual, monthly = {}, {}
    for name, months in reply["properties"]["parameter"].items():
        clean = {m: (None if v <= -999 else v) for m, v in months.items()}
        annual[name] = clean.pop("ANN", None)
        monthly[name] = clean
    units = {name: info["units"] for name, info in reply["parameters"].items()}
    return {**site, "annual": annual, "monthly": monthly}, units


def load_grid(body):
    grid = GRIDS[body]
    path = cached(grid["url"], grid["file"])
    return read_int16(path.read_bytes(), grid["big_endian"])


def grid_value(values, body, lat, lon):
    """Elevation in metres at lat, lon (east longitude) from a global grid."""
    row = min(GRID_ROWS - 1, max(0, int((90.0 - lat) * GRID_PPD)))
    col = int((lon % 360.0) * GRID_PPD) % GRID_COLS
    return values[row * GRID_COLS + col] * GRIDS[body]["scale"]


def grid_profile(values, body, lat, lon, half_width_km):
    """West-east profile through lat, lon, one point per grid cell."""
    km_per_cell = 2 * math.pi * GRIDS[body]["radius_km"] * math.cos(math.radians(lat)) / 360.0 / GRID_PPD
    steps = int(half_width_km / km_per_cell)
    return [
        {"distance_km": round(i * km_per_cell, 2),
         "elevation_m": grid_value(values, body, lat, lon + i / GRID_PPD)}
        for i in range(-steps, steps + 1)
    ]


def srtm_profile(lat, lon, half_width_km, step=9):
    """West-east profile through lat, lon from the SRTM tile, one point per `step` cells."""
    path = cached(SRTM["url"], SRTM["file"])
    values = read_int16(gzip.decompress(path.read_bytes()), big_endian=True)
    size = SRTM["size"]
    row = round((SRTM["lat0"] + 1 - lat) * (size - 1))
    centre = round((lon - SRTM["lon0"]) * (size - 1))
    km_per_cell = 2 * math.pi * EARTH_RADIUS_KM * math.cos(math.radians(lat)) / 360.0 / (size - 1)
    cells = int(half_width_km / km_per_cell)
    cells -= cells % step  # keep the sampled points symmetric around the centre
    points = []
    for offset in range(-cells, cells + 1, step):
        col = centre + offset
        if not 0 <= col < size:
            continue
        value = values[row * size + col]
        points.append({"distance_km": round(offset * km_per_cell, 2),
                       "elevation_m": None if value == -32768 else value})
    return points


def write(name, payload):
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / name
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {path.relative_to(ROOT)}")


def main():
    fetched = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    script = "pipeline/fetch_nasa.py"

    print("NASA POWER climate")
    sites, units = [], {}
    for site in EARTH_SITES:
        print(f"  {site['name']}")
        record, units = fetch_climate(site)
        sites.append(record)
    write("earth_climate.json", {
        "source": "NASA POWER climatology API (NASA Langley Research Center)",
        "source_url": POWER_URL,
        "fetched_at": fetched,
        "produced_by": script,
        "note": "Long-term averages for the POWER grid cell that contains each point. Cells are "
                "tens of kilometres wide, so a small site can differ from its cell average. "
                "T2M_MAX and T2M_MIN are the extremes over the record, not typical daily values.",
        "units": units,
        "sites": sites,
    })

    print("Mars and Moon elevation")
    grids = {body: load_grid(body) for body in GRIDS}
    write("target_elevation.json", {
        "sources": {body: {"dataset": g["dataset"], "url": g["url"]} for body, g in GRIDS.items()},
        "fetched_at": fetched,
        "produced_by": script,
        "note": "Elevation in metres. Mars: above the MOLA areoid. Moon: above a 1737.4 km sphere. "
                "Grid cell is 1/16 degree, about 3.7 km on Mars and 1.9 km on the Moon at the equator.",
        "targets": [{**t, "elevation_m": grid_value(grids[t["body"]], t["body"], t["lat"], t["lon"])}
                    for t in TARGETS],
    })

    print("Terrain profiles")
    salda = EARTH_SITES[0]
    jezero = TARGETS[0]
    write("terrain_profiles.json", {
        "fetched_at": fetched,
        "produced_by": script,
        "note": "West-east profiles, distance in km from the site centre (west is negative). "
                "SRTM shows the lake surface, not the lake bed. The two profiles have very "
                "different resolution: about 250 m per point for Salda, about 3.5 km for Jezero.",
        "profiles": [
            {"site": salda["name"], "body": "earth", "lat": salda["lat"], "lon": salda["lon"],
             "dataset": SRTM["dataset"], "url": SRTM["url"],
             "points": srtm_profile(salda["lat"], salda["lon"], PROFILE_HALF_WIDTH_KM)},
            {"site": jezero["name"], "body": "mars", "lat": jezero["lat"], "lon": jezero["lon"],
             "dataset": GRIDS["mars"]["dataset"], "url": GRIDS["mars"]["url"],
             "points": grid_profile(grids["mars"], "mars", jezero["lat"], jezero["lon"], PROFILE_HALF_WIDTH_KM)},
        ],
    })


if __name__ == "__main__":
    main()
