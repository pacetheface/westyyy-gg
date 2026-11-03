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

BG = (11, 20, 17, 255)
TEXT = (243, 246, 242, 255)
MUTED = (154, 173, 163, 255)
GREEN = (1, 93, 71, 255)
ORANGE = (253, 101, 10, 255)


def font(size):
    return ImageFont.truetype(str(TTF), size)


def add_glow(image, center, radius, color, peak):
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cx, cy = center
    rx, ry = radius
    steps = 24
    for step in range(steps, 0, -1):
        scale = step / steps
        alpha = int(peak * (1 - scale) ** 2)
        box = (cx - rx * scale, cy - ry * scale, cx + rx * scale, cy + ry * scale)
        draw.ellipse(box, fill=color[:3] + (alpha,))
    return Image.alpha_composite(image, overlay)


def og_image():
    image = Image.new("RGBA", (1200, 630), BG)
    image = add_glow(image, (160, 40), (520, 340), GREEN, 150)
    image = add_glow(image, (1080, 80), (420, 280), ORANGE, 90)
    draw = ImageDraw.Draw(image)
    draw.text((72, 168), "westyyy", font=font(210), fill=TEXT)
    draw.text((76, 430), "ROCKET LEAGUE", font=font(42), fill=MUTED)
    image.save(ROOT / "assets" / "og.png", "PNG")


def mark(size):
    image = Image.new("RGBA", (size, size), BG)
    image = add_glow(image, (size * 0.3, size * 0.2), (size * 0.7, size * 0.45), GREEN, 120)
    draw = ImageDraw.Draw(image)
    bar = max(2, int(size * 0.035))
    draw.rectangle((0, size - bar, size, size), fill=ORANGE)
    glyph = font(int(size * 0.62))
    box = draw.textbbox((0, 0), "w", font=glyph)
    x = (size - (box[2] - box[0])) / 2 - box[0]
    y = (size - bar - (box[3] - box[1])) / 2 - box[1]
    draw.text((x, y), "w", font=glyph, fill=TEXT)
    return image


def svg_icon():
    tt = TTFont(str(TTF))
    glyph_set = tt.getGlyphSet()
    name = tt.getBestCmap()[ord("w")]
    pen = SVGPathPen(glyph_set)
    glyph_set[name].draw(pen)
    commands = pen.getCommands()
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="westyyy">
  <rect width="64" height="64" fill="#0B1411"/>
  <rect y="61" width="64" height="3" fill="#FD650A"/>
  <g transform="translate(32 34) scale(0.042 -0.042)" fill="#F3F6F2">
    <path transform="translate(-300 0)" d="{commands}"/>
  </g>
</svg>
"""
    (ROOT / "favicon.svg").write_text(svg, encoding="utf-8")


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
