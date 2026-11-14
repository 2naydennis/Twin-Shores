"""Build the 30-second demo video from the project's own screenshots.

AI-generated: written by Claude (Anthropic, Claude Code) on 2026-11-14. Review before use.
The captions are an AI draft for the team to rewrite.

Each scene is an HTML card (a screenshot with an English caption) rendered to an
image by Chrome, then joined with slow zooms and crossfades by ffmpeg. No faces,
no voices, so it fits the Space Apps rule on participants under 18.

Needs Google Chrome and an ffmpeg binary. Run from the repo root:

    FFMPEG=/path/to/ffmpeg python3 demo/build_video.py

Writes demo/demo.mp4 (1280 x 720, 30 seconds, no sound).
"""

import html
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "demo" / "demo.mp4"
CHROME = os.environ.get("CHROME", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
FFMPEG = os.environ.get("FFMPEG") or shutil.which("ffmpeg")
W, H, FPS, FADE = 1280, 720, 30, 0.5
EXTRA = Path(os.environ.get("VIDEO_EXTRA", ROOT / "demo" / "img"))   # where slide5.png and slide6.png are

TEAM = "Tunay Dennis Diederich · Karan Kaya · Ayşegül Çağlayan · teacher Adrina Shakeri Bahador · Türkiye"

# (image, seconds, eyebrow, caption). None as image means a plain title card.
SCENES = [
    (None, 3.5, "NASA Space Apps Challenge 2026",
     "Analog Finder<small>Searching Earth's lakes for twins of Jezero Crater, Mars</small>"),
    ("img/3d-salda.jpg", 4.0, "The challenge",
     "Find new places on Earth that resemble Mars landing sites. NASA pairs Jezero Crater with one Earth lake: Lake Salda, Türkiye."),
    ("img/map.jpg", 5.0, "Our idea",
     "We scored 157 places against Jezero on 8 variables: NASA POWER climate, NASA/METI and MOLA terrain, and published studies."),
    ("slide5.png", 5.0, "What we found",
     "Salda ranks first. Close behind: Lake Van and Lake Erçek, closed-basin soda lakes with pH near 9.7, not yet listed as analogs."),
    ("slide6.png", 4.5, "Does it hold?",
     "The top three stay on top under 5,000 random weightings, and slope agrees with ESA Copernicus elevation data."),
    ("img/3d-boat.jpg", 4.5, "Explore it",
     "Drive each lake in 3D on real NASA terrain, and read the evidence where you find it."),
    (None, 3.5, "What's next",
     "Field-check Lake Erçek, search lakes beyond Türkiye, and build a Moon version.<small>2naydennis.github.io/analog-finder</small>"),
]

CSS = f"""
* {{ margin: 0; box-sizing: border-box; }}
body {{ width: {W}px; height: {H}px; overflow: hidden; background: #16202b; font-family: Helvetica, Arial, sans-serif; }}
.bg {{ position: absolute; inset: 0; background-size: cover; background-position: center top; }}
.bar {{ position: absolute; left: 0; right: 0; bottom: 0; padding: 22px 56px 26px; background: rgba(255,255,255,.95); border-top: 3px solid #b03a10; }}
.eyebrow {{ font: 600 15px/1.2 Menlo, monospace; letter-spacing: .1em; text-transform: uppercase; color: #a3380d; }}
.cap {{ font-size: 30px; line-height: 1.3; color: #16202b; margin-top: 8px; font-weight: 600; }}
.title {{ position: absolute; inset: 0; padding: 0 90px; display: flex; flex-direction: column; justify-content: center; color: #f4f2ee; background: #16202b; }}
.title .eyebrow {{ color: #e2a17c; font-size: 18px; }}
.title .cap {{ color: #fff; font-size: 64px; letter-spacing: -1px; line-height: 1.1; margin-top: 18px; }}
.title .cap small {{ display: block; font-size: 30px; font-weight: 400; color: #e2a17c; margin-top: 18px; letter-spacing: 0; }}
.title .team {{ margin-top: 46px; font-size: 21px; color: #c9cdd3; }}
.mark {{ position: absolute; top: 14px; right: 18px; font: 12px Menlo, monospace; color: rgba(255,255,255,.85); background: rgba(22,32,43,.55); padding: 4px 8px; }}
"""


def card(image, eyebrow, caption, last):
    caption_html = caption.replace("<small>", "\u0000").replace("</small>", "\u0001")
    caption_html = html.escape(caption_html).replace("\u0000", "<small>").replace("\u0001", "</small>")
    mark = '<div class="mark">Captions drafted with AI assistance</div>'
    if image is None:
        team = f'<div class="team">{html.escape(TEAM)}</div>' if not last else ""
        body = f'<div class="title"><div class="eyebrow">{html.escape(eyebrow)}</div><div class="cap">{caption_html}</div>{team}</div>'
    else:
        body = (f'<div class="bg" style="background-image:url(\'{image}\')"></div>'
                f'<div class="bar"><div class="eyebrow">{html.escape(eyebrow)}</div><div class="cap">{caption_html}</div></div>')
    return f"<!doctype html><html><head><meta charset='utf-8'><style>{CSS}</style></head><body>{body}{mark}</body></html>"


def main():
    if not FFMPEG:
        raise SystemExit("ffmpeg not found; set FFMPEG=/path/to/ffmpeg")
    work = Path(tempfile.mkdtemp(prefix="analog-video-"))
    stills = []
    for index, (image, seconds, eyebrow, caption) in enumerate(SCENES):
        source = None
        if image:
            source = (ROOT / "demo" / image) if (ROOT / "demo" / image).exists() else (EXTRA / image)
            source = source.resolve().as_uri()
        page = work / f"card{index}.html"
        page.write_text(card(source, eyebrow, caption, index == len(SCENES) - 1), encoding="utf-8")
        png = work / f"card{index}.png"
        subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files",
                        f"--window-size={W},{H}", "--force-device-scale-factor=1", "--virtual-time-budget=2000",
                        f"--screenshot={png}", page.as_uri()], check=True, capture_output=True)
        stills.append((png, seconds))

    # One clip per still with a slow zoom, then crossfades between clips.
    inputs, filters = [], []
    for index, (png, seconds) in enumerate(stills):
        frames = int(round(seconds * FPS))
        inputs += ["-i", str(png)]          # one still; zoompan turns it into `frames` frames
        filters.append(f"[{index}:v]scale={W * 2}:{H * 2},zoompan=z='min(1+0.0006*on,1.06)':d={frames}"
                       f":x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={W}x{H}:fps={FPS},setsar=1,format=yuv420p[v{index}]")
    offset, last = 0.0, "v0"
    for index in range(1, len(stills)):
        offset += stills[index - 1][1] - FADE
        out = f"x{index}"
        filters.append(f"[{last}][v{index}]xfade=transition=fade:duration={FADE}:offset={offset:.2f}[{out}]")
        last = out
    subprocess.run([FFMPEG, "-y", *inputs, "-filter_complex", ";".join(filters), "-map", f"[{last}]",
                    "-r", str(FPS), "-c:v", "libx264", "-preset", "slow", "-crf", "21", "-pix_fmt", "yuv420p",
                    "-movflags", "+faststart", "-metadata", "comment=Captions drafted with AI assistance (Claude).",
                    str(OUT)], check=True, capture_output=True)
    total = sum(s for _, s in stills) - FADE * (len(stills) - 1)
    print(f"wrote {OUT.relative_to(ROOT)}: {len(stills)} scenes, {total:.1f} s")


if __name__ == "__main__":
    main()
