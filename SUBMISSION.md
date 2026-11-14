# Submission checklist

One section per field on the Space Apps submission form. Fill these in as you
build, then copy them into the form. Write the answers yourselves, in your own
words.

## 1. Project name

- [ ] Decided

Answer:

## 2. High-level project summary

The form asks three things. Answer each in one or two sentences.

- [ ] What did you develop?
- [ ] How does it address the challenge?
- [ ] Why is it important?

Answer:

## 3. Link to project demo

Either a 7-slide presentation (title and intro slides count toward the 7) or a
video of 30 seconds or less. Not both lengths: 8 slides or 31 seconds breaks
the rule.

- [ ] Format chosen: slides / video
- [ ] Uploaded somewhere public (YouTube, Google Drive, GitHub)
- [ ] Opened the link in a private browser window: no login, no permission
      request

Link:

Suggested 7 slides: title, the problem, how the search works, the map result,
Salda vs Jezero, validation and limits, data and team.

## 4. Link to final project

- [ ] Repo switched from private to public
- [ ] Link opened in a private browser window: no login needed
- [ ] README explains how to run it

Link: https://github.com/2naydennis/analog-finder (private until switched)

## 5. Detailed project description

- [ ] What exactly does it do?
- [ ] How does it work?
- [ ] What benefits does it have?
- [ ] What do you hope to achieve?
- [ ] Tools, languages, hardware, software used

Answer:

## 6. Use of AI tools ("SI")

Not shown to judges, but required. Say which tools and what for. Keep the log
in the README section "AI use" up to date and summarise it here.

Rules from the form:

- AI may speed up the work. It should not come up with your idea of how to
  solve the challenge. The approach has to be your decision.
- AI-generated images and videos need a visible watermark.
- AI-generated audio, code, and data must be acknowledged in descriptive text
  and metadata.
- No NASA logos, flags, or mission identifiers in generated content.

- [ ] Every AI-generated image or video has a visible watermark
- [ ] AI-generated code and data are listed in the README
- [ ] No NASA branding anywhere in generated content

Answer:

## 7. NASA data

At least one NASA dataset or resource is required for Global Award
eligibility. Be specific: dataset name, what you took from it, link.

### Used in the project

Only list a dataset here once the project really uses it. This is the table
that goes into the form.

| Dataset | What we used it for | Link |
|---------|---------------------|------|
| NASA POWER climatology API (NASA Langley Research Center) | Long-term temperature, precipitation, solar irradiance, wind, humidity and surface pressure for 8 Earth analog sites. Output: `data/nasa/earth_climate.json` | https://power.larc.nasa.gov/docs/services/api/ |
| Mars Global Surveyor MOLA MEGDR, product MEGT90N000EB, 16 pixels per degree (NASA PDS Geosciences Node) | Elevation at 4 Mars targets and a west-east terrain profile across Jezero Crater. Output: `data/nasa/target_elevation.json`, `data/nasa/terrain_profiles.json` | https://pds-geosciences.wustl.edu/missions/mgs/megdr.html |
| Lunar Reconnaissance Orbiter LOLA GDR, product LDEM_16, 16 pixels per degree (NASA PDS Geosciences Node) | Elevation at 2 Moon targets. Output: `data/nasa/target_elevation.json` | https://pds-geosciences.wustl.edu/missions/lro/lola.htm |
| NASA SRTM 1 arc second, tile N37E029 | West-east terrain profile across Lake Salda. Output: `data/nasa/terrain_profiles.json`. Tile downloaded from AWS Terrain Tiles, which redistributes SRTM without a login | https://www.earthdata.nasa.gov/data/catalog/lpcloud-srtmgl1-003 |
| NASA Planetary Analog Explorer | Source of the starting list of Earth sites and the Moon and Mars places they are paired with | https://science.nasa.gov/solar-system/analog-explorer/ |

All five are used by `pipeline/fetch_nasa.py`, run on 2026-11-14. So far the
project only fetches and stores this data. Update the "what we used it for"
column once the scoring and the web pages read it.

### Candidates

NASA data and resources that fit this project. Every link was opened and
checked on 2026-11-14. Move a row up to "Used" when you use it.

Download checks done on 2026-11-14:

- NASA POWER: live request worked, no login.
- MOLA 463 m GeoTIFF: direct link works, no login, but the file is 2.1 GB
  (`https://planetarymaps.usgs.gov/mosaic/Mars_MGS_MOLA_DEM_mosaic_global_463m.tif`).
  The MEGDR grids at the PDS node are much smaller: 2 MB at 4 pixels per
  degree, 33 MB at 16. The script uses the 16 pixel-per-degree grid.
- LOLA: `ldem_4.img` (2 MB) and `ldem_16.img` (33 MB) download without login.
- LOLA south pole sites at Goddard PGDA: direct GeoTIFF links on the page,
  no login. Not downloaded or processed yet.
- SRTM: the official NASA Earthdata download needs a free account. The same
  SRTM tiles are available without login from AWS Terrain Tiles
  (`https://s3.amazonaws.com/elevation-tiles-prod/skadi/N37/N37E029.hgt.gz`),
  and single points from the OpenTopoData API
  (`https://api.opentopodata.org/v1/srtm30m?locations=37.55,29.68`). Both
  tested. List them under "other references" if you use them.
- LRO Diviner: the data folders open without login. Not downloaded or
  processed yet; the files are raw instrument records and need real work.
- MODIS land surface temperature: needs a free Earthdata account. Not tested.

**Earth**

| Dataset | Gives you | Access | Link |
|---------|-----------|--------|------|
| NASA POWER (Langley Research Center) | Temperature, precipitation, solar irradiance for any lat/lon | Web API, no login. Tested, see `pipeline/README.md` | https://power.larc.nasa.gov/docs/services/api/ |
| NASA SRTM Global 1 arc second V003 | Elevation at about 30 m, for slope and terrain profiles | Free Earthdata login | https://www.earthdata.nasa.gov/data/catalog/lpcloud-srtmgl1-003 |
| MODIS/Terra Land Surface Temperature Monthly (MOD11C3 V061) | Ground temperature, global 0.05 degree grid | Free Earthdata login | https://www.earthdata.nasa.gov/data/catalog/lpcloud-mod11c3-061 |
| NASA Worldview | Satellite imagery browser, good for Salda screenshots | Browser, no login | https://worldview.earthdata.nasa.gov/ |

**Mars**

| Dataset | Gives you | Access | Link |
|---------|-----------|--------|------|
| MOLA elevation (Mars Global Surveyor), 463 m DEM | Mars terrain, Jezero profile | Download, no login. Hosted by USGS Astrogeology, built from NASA MOLA data | https://astrogeology.usgs.gov/search/map/mars_mgs_mola_dem_463m |
| MOLA MEGDR at NASA PDS Geosciences Node | Original gridded MOLA products | Download, no login | https://pds-geosciences.wustl.edu/missions/mgs/megdr.html |
| NASA Mars Trek | Browse Mars maps and draw elevation profiles in the browser | Browser, no login | https://trek.nasa.gov/mars/ |
| NSSDCA Mars Fact Sheet | Surface pressure, temperature, gravity | Web page | https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html |

**Moon**

| Dataset | Gives you | Access | Link |
|---------|-----------|--------|------|
| High-Resolution LOLA Topography for Lunar South Pole Sites (NASA Goddard PGDA) | Detailed terrain for south pole candidate sites | Download, no login | https://pgda.gsfc.nasa.gov/products/78 |
| LRO LOLA at NASA PDS Geosciences Node | Global lunar elevation | Download, no login | https://pds-geosciences.wustl.edu/missions/lro/lola.htm |
| LRO Diviner at NASA PDS Geosciences Node | Lunar surface temperature | Download, no login | https://pds-geosciences.wustl.edu/missions/lro/diviner.htm |
| NASA Moon Trek | Browse Moon maps and draw elevation profiles in the browser | Browser, no login | https://trek.nasa.gov/moon/ |
| NSSDCA Moon Fact Sheet | Surface temperature range, gravity | Web page | https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html |

**Targets and validation**

| Resource | Gives you | Link |
|----------|-----------|------|
| NASA Planetary Analog Explorer | NASA's own gallery of 11 Earth analog pairs (Moon, Mars, Venus, Enceladus), Lake Salda included. Use as the list of known analogs to test the search against | https://science.nasa.gov/solar-system/analog-explorer/ |
| NASA update on Artemis III Moon landing regions (28 October 2024) | Nine candidate regions near the lunar south pole: Peak near Cabeus B, Haworth, Malapert Massif, Mons Mouton Plateau, Mons Mouton, Nobile Rim 1, Nobile Rim 2, de Gerlache Rim 2, Slater Plain | https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/ |
| NASA Artemis IV mission page | Current plan for the first Artemis landing | https://www.nasa.gov/mission/artemis-iv/ |
| NASA Artemis acceleration update (23 October 2026) | Latest programme status | https://www.nasa.gov/blogs/missions/2026/10/23/nasa-shares-artemis-acceleration-plans-for-moon-missions/ |
| NASA Analog Missions | NASA's analog mission programmes on Earth | https://www.nasa.gov/analog-missions/ |

Artemis status, checked on NASA's pages on 2026-11-14: the nine regions were
published for Artemis III, but Artemis III is now a 2027 crewed test flight in
low Earth orbit. The first Artemis landing is Artemis IV, targeted for early
2028 near the lunar South Pole. NASA's Artemis IV page does not name its own
landing regions. In the project, describe the nine regions as "NASA's
candidate south pole landing regions (2024)", not as "the Artemis III landing
site".

**Lake Salda and Jezero**

| Resource | Gives you | Link |
|----------|-----------|------|
| NASA Earth Observatory, "Jez like Mars" (30 July 2020) | Landsat 8 image of Salda, MRO image of Jezero, the mineral and delta comparison, the August 2019 Purdue and Istanbul Technical University fieldwork | https://science.nasa.gov/earth/earth-observatory/jez-like-mars-147041/ |
| NASA Earth Matters, "What a Lake in Turkey Can Tell Us about Mars" (17 February 2021) | Background article | https://science.nasa.gov/blogs/earth-matters/2021/02/17/what-a-lake-in-turkey-can-tell-us-about-mars/ |
| NASA Photojournal, "Lake Salda Rocks" | Photo of shoreline microbialites | https://science.nasa.gov/photojournal/lake-salda-rocks/ |
| NASA Mars 2020 Perseverance mission page | Mission context for Jezero | https://science.nasa.gov/mission/mars-2020-perseverance/ |

Image credits matter. The Earth Observatory page credits its images to NASA
Earth Observatory (Lauren Dauphin, Landsat data from USGS), NASA/JPL-Caltech/
MSSS, and a field photograph by Garczynski et al. Copy the credit line shown
next to any image you reuse, and do not use the NASA logo.

## 8. Space agency partner data and other references

List everything: data, code libraries, map tiles, text, images. Open source
and free material still has to be listed. Use only images you have permission
to use; news-site photos of Salda are copyrighted.

Partner agencies worth checking for this project:

- Turkish Space Agency (TUA): anything on Lake Salda or Türkiye
- ESA: Copernicus DEM and Sentinel imagery
- CSA: Devon Island and Haughton crater analog work

| Resource | Type (data / code / image / text) | Source | Licence or permission |
|----------|-----------------------------------|--------|-----------------------|
|          |                                   |        |                       |

## Before pressing submit

- [ ] All links work in a private browser window
- [ ] Demo is within 7 slides or 30 seconds
- [ ] At least one NASA dataset named with a link
- [ ] AI use described truthfully
- [ ] Submitted with time to spare
