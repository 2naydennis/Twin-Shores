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
|         |                     |      |

### Candidates

NASA data and resources that fit this project. Every link was opened and
checked on 2026-11-14. Move a row up to "Used" when you use it.

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
| NASA update on Artemis III Moon landing regions | Named candidate regions near the lunar south pole, for choosing Moon targets. Check NASA for the current mission status | https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/ |
| NASA Analog Missions | NASA's analog mission programmes on Earth | https://www.nasa.gov/analog-missions/ |

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
