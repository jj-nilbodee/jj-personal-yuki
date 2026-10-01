"""Export app icons from the logo artwork (docs/prd/part-3-design.md, section 7).

Rules: full-bleed cream tile (#F6E9DA) with no white or pre-rounded corners,
Yuki inside the central ~80% for maskable icons, and a head-only crop at 32px
and below. Re-run with `npm run icons` if the source art changes.
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public/brand/yuki-loaf.png"
OUT = ROOT / "public/icons"
TILE = (246, 233, 218)  # #F6E9DA

# Measured on the 1254px source: the rounded tile's box, and a square around the head.
TILE_BOX = (81, 84, 1171, 1182)
HEAD_BOX = (250, 300, 830, 880)


def full_bleed_tile() -> Image.Image:
    tile = Image.open(SRC).convert("RGB").crop(TILE_BOX)
    w, h = tile.size
    # Paint the white rounded corners with the tile cream so the square is full-bleed.
    for corner in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        ImageDraw.floodfill(tile, corner, TILE, thresh=40)
    return tile.resize((1024, 1024), Image.LANCZOS)


def padded(img: Image.Image, scale: float) -> Image.Image:
    canvas = Image.new("RGB", img.size, TILE)
    inner = img.resize((round(img.width * scale),) * 2, Image.LANCZOS)
    offset = (img.width - inner.width) // 2
    canvas.paste(inner, (offset, offset))
    return canvas


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    tile = full_bleed_tile()
    for size in (1024, 512, 192, 180):
        tile.resize((size, size), Image.LANCZOS).save(OUT / f"icon-{size}.png", optimize=True)
    maskable = padded(tile, 0.8)
    for size in (512, 192):
        maskable.resize((size, size), Image.LANCZOS).save(OUT / f"maskable-{size}.png", optimize=True)

    head = Image.open(SRC).convert("RGB").crop(HEAD_BOX)
    for size in (32, 16):
        head.resize((size, size), Image.LANCZOS).save(OUT / f"favicon-{size}.png", optimize=True)


if __name__ == "__main__":
    main()
