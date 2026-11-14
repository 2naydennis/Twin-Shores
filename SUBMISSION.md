# Submission checklist

One section per field on the Space Apps submission form. Fill these in as you
build, then copy them into the form. Write the answers yourselves, in your own
words.

Source: the official Project Submission Guide, read on 2026-11-14.
https://www.spaceappschallenge.org/resources/project-submission-guide/

## The challenge

"Identify Earth Locations that Analog the Permanent Moon Base Locations and
Mars" (difficulty: Beginner/Youth, Intermediate, Advanced).
https://www.spaceappschallenge.org/2026/challenges/permanent-moon-base-locations-and-mars/

What it asks for, in our words (read the original before writing the form):

- Use open Earth, Moon, and Mars data from NASA **and other space agencies**.
- **Identify and characterize new** terrestrial analogs. The statement says
  the known ones (it names the Atacama Desert, Haughton Crater, Death Valley)
  are not fully characterized either.
- The analogs are for **future bases or landing sites**, so mission teams can
  test equipment and methods before flying.
- Site selection factors it lists: topography, geology, environment,
  available resources.
- Environments it suggests: deserts, polar regions, volcanic and arid
  terrains, caves.
- Deliver the findings as **a map, visualization, or other tool**.

Every part of the project should trace back to one of these lines.

## Deadline and eligibility

- **We are registered for the Universal Event**, not a Local Event.
- **Submission window:** Saturday 14 November 2026, 9:00 a.m. to Sunday
  15 November 2026, 11:59 p.m. For the Universal Event the clock is the
  local time where the Team Owner lives. Anything saved or submitted after
  that is not judged.
- You can submit early and resubmit as often as you like. Only the last saved
  submission is judged. Submit a first version well before the deadline.
- All team members must be confirmed participants at the same event. Both of
  you need to be registered for the Universal Event and on the same team.
- Every required field must be filled in, or the form will not submit.
- **Everything must be in English:** the project page and all linked material,
  including this repo and the slides. A video may be spoken in another
  language only with English subtitles.
- **No one under 18 may appear:** no images, video, audio, or other likeness
  of persons under 18 in the demo or the final project. If either of you is
  under 18, that means no faces, no voices, and no team photos. Use slides,
  screen recordings, and captions.
- **No work on the challenge before the hackathon.** The Participant FAQ says
  teams may not begin working on the challenges before the event (14 and 15
  November). Only work done inside the event window belongs in the
  submission. https://www.spaceappschallenge.org/resources/participant-faqs/
- A Universal Event team needs at least 2 members to be eligible for global
  judging, and is judged only against other Universal Event submissions.
- Participants under 18 must be registered by a parent or legal guardian and
  must not use a photo of themselves as their avatar or on the team page.
- At submission you tick two boxes: the Terms and Conditions, and "Confirm
  All Work is Original".
- Judging criteria: Impact, Creativity, Validity, Relevance, Presentation.

## 1. Project name

- [ ] Decided

All answers below marked **AI draft** were written by Claude from the state
of the repo on 2026-11-14. Rewrite them in your own words and correct
anything that is no longer true before pasting into the form.

Answer (AI draft): Analog Finder

## 2. High-level project summary

The form asks three things. Answer each in one or two sentences.

- [ ] What did you develop?
- [ ] How does it address the challenge?
- [ ] Why is it important?

Answer (AI draft):

Analog Finder searches Earth for lakes that resemble Jezero Crater, the
ancient Martian lake that NASA's Perseverance rover is exploring. We compared
157 places with Jezero on eight variables: temperature, air pressure,
evaporation and terrain slope measured from NASA data, and water pH, mineral
deposits, water body and sediments taken from published studies. The search
covered every natural lake in Türkiye (148) plus nine analog sites that
scientists already use. Lake Salda, NASA's known Jezero analog, came out
first, which supports the method. Close behind are lakes that NASA does not
list as analogs: Lake Van, Lake Erçek and Lake Burdur. Mission teams test
instruments and methods at analog sites before flight, so each well-described
new site widens where that testing can happen. We report every limit of the
comparison alongside the results.

## 3. Link to project demo

Either a slide deck of up to 7 slides (title and intro slides count toward
the 7) or a video of 30 seconds or less. A demo over either limit is not
eligible for Global Judging. The demo cannot be uploaded to the Space Apps
site; it must be hosted elsewhere.

- [ ] Format chosen: slides / video
- [ ] In English (video: English subtitles if spoken in another language)
- [ ] Nobody under 18 appears or is heard in it
- [ ] Uploaded somewhere public (YouTube, Google Drive, GitHub)
- [ ] Opened the link in a private browser window: no login, no permission
      request

Link (public since 2026-11-14, opened without login and returned the PDF):
https://2naydennis.github.io/analog-finder/demo/slides.pdf

Same file on GitHub:
https://github.com/2naydennis/analog-finder/blob/main/demo/slides.pdf

A 27-second video exists too, built from the site's own screenshots with
English captions, no faces and no voices:
https://2naydennis.github.io/analog-finder/demo/demo.mp4
(`demo/build_video.py` rebuilds it; captions are an AI draft and carry an
on-screen "Captions drafted with AI assistance" mark). Choose one format for
the form, or upload the video to YouTube and link that instead.

A 7-slide AI draft exists: `demo/slides.pdf`, built by
`demo/build_slides.py` from the scored data. Before using it:

- [x] Member names added (2026-11-14)
- [ ] Put the team name into `TEAM` at the top of `demo/build_slides.py`,
      then rebuild (commands in that file)
- [x] Website screenshot on slide 4, 3D views on slide 7 (2026-11-14)
- [ ] Rewrite the wording in your own words
- [ ] Re-export the PDF and check it is still 7 pages

A slide deck must show:

- [ ] Team name
- [ ] Names of team members
- [ ] The challenge you selected
- [ ] An image of the project
- [ ] The user experience
- [ ] How NASA and space agency open data make the solution possible

Suggested 7 slides: title with team and challenge, the problem, how the
search works, the map result, Salda vs Jezero, validation and limits, data
sources.

The guide's outline for a 30-second video: who you are and your team (0:00),
the challenge and why you chose it (0:02), project title and tagline (0:05),
how it works and how NASA and partner data made it possible (0:10), what it
could become (0:20 to 0:30).

## 4. Link to final project

- [ ] Repo switched from private to public
- [ ] Link opened in a private browser window: no login needed
- [ ] README explains how to run it
- [ ] If the project is hosted on a new website of your own: optional
      FortiGuard Web Filter Classification request, so judges' networks do
      not block it (see the guide)

Links (public since 2026-11-14, each opened without login on that day):

- Live website: https://2naydennis.github.io/analog-finder/
- Rover drive: https://2naydennis.github.io/analog-finder/web/rover.html
- Code and data: https://github.com/2naydennis/analog-finder

The website is served by GitHub Pages from the `main` branch, so every push
updates it within a minute or two. Use the live website as the "Link to Final
Project"; the README links to the code.

Images (JPG, PNG, GIF up to 10 MB) can be uploaded straight onto the project
page. Videos and documents cannot; link to them.

## 5. Detailed project description

- [ ] What exactly does it do?
- [ ] How does it work?
- [ ] What benefits does it have?
- [ ] What do you hope to achieve?
- [ ] Tools, languages, hardware, software used

Answer (AI draft):

**What it does.** It ranks places on Earth by how closely they match Jezero
Crater and shows the evidence for each one: the measured numbers, the
published findings, and the sources.

**How it works.** A list of candidate places goes in: all 148 natural lakes
in Türkiye from Wikidata, plus nine known analogs such as the Atacama Desert,
Death Valley and Haughton Crater. For each place a script reads temperature,
air pressure and evaporation from NASA POWER and terrain slope from the
NASA/METI ASTER elevation model. Jezero's slope is measured the same way from
NASA's MOLA elevation data, on the same 900 m grid. Four more variables have
no global dataset: water pH, mineral deposits, water body and sediment
layers. For those we read published studies and entered a 0 to 1 match with
the source. The score is the weighted average of the variables available for
that place, and we show how many variables each score rests on.

**What we found.** Lake Salda ranks first (0.695). Lake Van (0.688) is a
closed-basin soda lake with pH near 9.8 and carbonate microbialite towers.
Lake Erçek (0.679) is a little-studied closed-basin soda lake beside it with
pH 9.7. Lake Burdur (0.646) is a closed-basin alkaline lake. Lake Tuz has
magnesium-bearing carbonates in its muds, the mineral family that links Salda
to Jezero.

**Limits.** No place on Earth comes near Mars's air pressure or cold. Jezero's
ancient lake has no measured pH, so that variable rests on inference. Places
are scored on different numbers of variables, so close scores are not
strictly comparable. On the measured variables alone, known analogs such as
the Atacama rank low, which shows that climate and slope do not capture what
makes a place a Jezero analog; the literature-based variables do. Lake Van is
already studied by researchers in a Mars context, so we call it a candidate
that is not yet a listed analog. We cover Mars only; the Moon needs different
variables.

**Benefits and aims.** A repeatable, open method that anyone can rerun or
extend with new places, new targets or new variables by editing one file.
We hope it points researchers to lakes worth a field visit.

**Tools.** Python 3 standard library for all data scripts. JavaScript, HTML
and CSS for the website, with Leaflet for maps [Kranimo: confirm and add the
rest]. Git and GitHub. AI tools as described under "Use of AI".

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

Answer (AI draft; this one must be exactly true, so check every line):

Yes. We used Claude (Anthropic) through Claude Code, and ChatGPT (OpenAI).

- ChatGPT: background reading on Lake Salda and Jezero Crater, and a first
  list of variables for comparing them. We chose our eight variables from
  that list.
- Claude: wrote the Python scripts that fetch NASA data, score the places and
  build the slides; proposed the scoring formula and the rubric for the
  literature-based variables; searched the web for studies on 23 lakes and
  proposed a match value for each finding, which we checked against the
  sources [only true once you have done it]; drafted documentation, these
  form answers and the slides, which we then rewrote.
- Claude also suggested a first outline of the approach and the project
  structure early on. [Say plainly which decisions were yours: the challenge,
  Salda and Jezero as the starting point, the eight variables, searching
  Türkiye's lakes.]
- Website code: [Kranimo to describe].

Every AI-written file says so in its header, the README has an AI-use table,
and AI-assisted commits carry a Co-Authored-By line. Charts are produced by
code from the data and are labelled. No AI-generated images, video or audio
are used, and no NASA logos appear anywhere.

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
| ASTER Global Digital Elevation Model (NASA and Japan's METI) | Terrain slope at each Earth candidate, read through the OpenTopoData API. Output: `data/analogs.json` | https://www.earthdata.nasa.gov/data/instruments/aster |
| Mars Global Surveyor MOLA MEGDR, product MEGT44N000HB, 128 pixels per degree | Terrain slope at Jezero Crater on the same 900 m grid. Output: `data/analogs.json` | https://pds-geosciences.wustl.edu/missions/mgs/megdr.html |
| NSSDCA Mars Fact Sheet (NASA Goddard) | Mars temperature and surface pressure used as the Jezero target values | https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html |

NASA POWER also supplies the temperature, pressure and evaporation that
`pipeline/score.py` compares (parameters T2M, PS, EVLAND).

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
| **EU-DEM v1.1, Copernicus Land Monitoring Service (European Union and ESA)** | data: second elevation model, used to re-measure terrain slope at all 149 Türkiye lakes and check the NASA/METI values. **Space agency partner data (ESA).** Read through the OpenTopoData API. Output: `data/slope_crosscheck.json` | https://land.copernicus.eu/en/products/products-that-are-no-longer-disseminated-on-the-clms-website | Free and open, attribution to Copernicus |
| ESA Copernicus Sentinel-2 (cloudless mosaic by EOX) | image: default satellite background of the website map. **Space agency partner data (ESA)** | https://s2maps.eu/ | CC BY-NC-SA 4.0, attribution required |
| NASA GIBS Blue Marble | image: optional base map on the website (also NASA data) | https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api | Free |
| OpenStreetMap | image: default base map tiles on the website | https://www.openstreetmap.org/copyright | ODbL, attribution required |
| Leaflet 1.9.4 | code: map library | https://leafletjs.com/ | BSD 2-Clause |
| IBM Plex Sans and IBM Plex Mono | fonts on the website, loaded from Google Fonts | https://fonts.google.com/specimen/IBM+Plex+Sans | SIL Open Font Licence |
| three.js 0.160.0 | code: 3D library for the rover drive | https://threejs.org/ | MIT |
| Japan's METI, with NASA: ASTER GDEM | data: Earth terrain slope (also listed under NASA data) | https://www.earthdata.nasa.gov/data/instruments/aster | Free |
| Wikidata | data: list of natural lakes in Türkiye with coordinates | https://www.wikidata.org/ | CC0 |
| Published papers and reports on each lake | text: evidence for pH, minerals, water body, sediments. Every link is in `pipeline/config.json` | see config | Cited, not copied |
| OpenTopoData API | tool: serves ASTER GDEM elevation points | https://www.opentopodata.org/ | Free public API; ASTER GDEM is a NASA and METI product |
| AWS Terrain Tiles | data: redistributed NASA SRTM tile for Lake Salda | https://registry.opendata.aws/terrain-tiles/ | Open data; SRTM is a NASA product |
| Python standard library | code: all pipeline scripts | https://www.python.org/ | PSF licence |

## Before pressing submit

- [ ] All links work in a private browser window
- [ ] Demo is within 7 slides or 30 seconds
- [ ] Everything is in English
- [ ] Nobody under 18 appears or is heard anywhere
- [ ] At least one NASA dataset named with a link
- [ ] AI use described truthfully
- [ ] Every required field filled in
- [ ] Both boxes ticked: Terms and Conditions, Confirm All Work is Original
- [ ] "Submit for Judging" clicked and the confirmation banner appeared
- [ ] Submitted before Sunday 15 November, 11:59 p.m. in the Team Owner's
      local time, with time to spare
