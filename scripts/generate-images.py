#!/usr/bin/env python3
"""Build the wordmark favicon and the text Open Graph image.

Needs Pillow and fontTools, plus the upstream Barlow Condensed ExtraBold TTF.
Set BARLOW_TTF if it is not at the default path. The site itself only ships the woff2 files.
"""

import os
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
TTF = Path(os.environ.get("BARLOW_TTF", "/tmp/BarlowCondensed-ExtraBold.ttf"))

GREEN = (1, 93, 71, 255)
ORANGE = (253, 101, 10, 255)
YELLOW = (224, 243, 84, 255)
INK = (26, 20, 12, 255)
CREAM = (244, 241, 230, 255)


def font(size):
    return ImageFont.truetype(str(TTF), size)


def og_image():
    image = Image.new("RGBA", (1200, 630), GREEN)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 540, 1200, 630), fill=ORANGE)
    word = font(228)
    draw.text((64, 118), "westyyy", font=word, fill=YELLOW)
    label = font(54)
    draw.text((64, 562), "ROCKET LEAGUE", font=label, fill=INK)
    image.save(ROOT / "assets" / "og.png", "PNG")


def mark(size):
    image = Image.new("RGBA", (size, size), GREEN)
    draw = ImageDraw.Draw(image)
    bar = int(size * 0.18)
    draw.rectangle((0, size - bar, size, size), fill=ORANGE)
    glyph = font(int(size * 0.72))
    box = draw.textbbox((0, 0), "w", font=glyph)
    x = (size - (box[2] - box[0])) / 2 - box[0]
    y = (size - bar - (box[3] - box[1])) / 2 - box[1] + size * 0.02
    draw.text((x, y), "w", font=glyph, fill=YELLOW)
    return image


def svg_icon():
    tt = TTFont(str(TTF))
    glyph_set = tt.getGlyphSet()
    name = tt.getBestCmap()[ord("w")]
    pen = SVGPathPen(glyph_set)
    glyph_set[name].draw(pen)
    commands = pen.getCommands()
    ymin, ymax = 0, 0
    # Flip the em square so the lowercase w sits in a 64px icon with an orange band.
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="westyyy">
  <rect width="64" height="64" fill="#015D47"/>
  <rect y="52" width="64" height="12" fill="#FD650A"/>
  <g transform="translate(32 36) scale(0.045 -0.045)" fill="#E0F354">
    <path transform="translate(-300 0)" d="{commands}"/>
  </g>
</svg>
"""
    (ROOT / "favicon.svg").write_text(svg, encoding="utf-8")
    return ymin, ymax


def main():
    if not TTF.exists():
        raise SystemExit(f"Missing TTF at {TTF}. Set BARLOW_TTF.")
    og_image()
    icon = mark(512)
    icon.resize((32, 32), Image.Resampling.LANCZOS).save(ROOT / "favicon-32.png", "PNG")
    icon.resize((180, 180), Image.Resampling.LANCZOS).save(ROOT / "apple-touch-icon.png", "PNG")
    icon16 = icon.resize((16, 16), Image.Resampling.LANCZOS)
    icon32 = icon.resize((32, 32), Image.Resampling.LANCZOS)
    icon32.save(ROOT / "favicon.ico", sizes=[(16, 16), (32, 32)], append_images=[icon16])
    svg_icon()
    print("wrote og, favicon svg, png, and ico")


if __name__ == "__main__":
    main()
