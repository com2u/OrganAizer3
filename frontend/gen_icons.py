"""One-off icon generator for OrganAIzer favicons.

Produces:
  - favicon.svg          adaptive (prefers-color-scheme) vector-mask favicon
  - favicon-16/32.png    filled white tile + black logo (rounded)
  - favicon.ico          multi-size (16/32/48)
  - apple-touch-icon.png  180 square white tile (iOS masks corners itself)
  - icon-192/512.png     PWA install tiles (square white)

Uses the real logo silhouette from logo512.png (black-on-transparent) so the
artwork stays pixel-accurate. Backup of originals lives in ../logo-backup-original.
"""
import base64
import io
import os

from PIL import Image, ImageDraw

PUB = os.path.join(os.path.dirname(__file__), "public")
SRC = os.path.join(PUB, "logo512.png")

# Alpha channel = exact logo silhouette (255 where drawn, 0 transparent).
logo = Image.open(SRC).convert("RGBA")
alpha = logo.getchannel("A")

LIGHT = "#18181b"  # glyph on light browser chrome
DARK = "#fafafa"   # glyph on dark browser chrome


def make_tile(size: int, pad_ratio: float, radius_ratio: float) -> Image.Image:
    """White tile with the black logo centred and padded."""
    tile = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    inner = max(1, int(round(size * (1 - 2 * pad_ratio))))
    a = alpha.resize((inner, inner), Image.LANCZOS)
    black = Image.new("RGBA", (inner, inner), (0, 0, 0, 255))
    black.putalpha(a)
    off = (size - inner) // 2
    tile.alpha_composite(black, (off, off))
    if radius_ratio > 0:
        r = int(round(size * radius_ratio))
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=255)
        tile.putalpha(mask)
    return tile


def save(img: Image.Image, name: str):
    img.save(os.path.join(PUB, name))
    print("wrote", name, img.size)


# ---- Adaptive SVG favicon (mask + prefers-color-scheme) ----
mask_img = alpha.resize((256, 256), Image.LANCZOS)  # grayscale luminance mask
buf = io.BytesIO()
mask_img.save(buf, "PNG", optimize=True)
b64 = base64.b64encode(buf.getvalue()).decode()
svg = (
    '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" '
    'viewBox="0 0 256 256">\n'
    "  <style>\n"
    f"    .fg {{ fill: {LIGHT}; }}\n"
    f"    @media (prefers-color-scheme: dark) {{ .fg {{ fill: {DARK}; }} }}\n"
    "  </style>\n"
    '  <mask id="logo" maskUnits="userSpaceOnUse" x="0" y="0" width="256" height="256">\n'
    f'    <image width="256" height="256" href="data:image/png;base64,{b64}"/>\n'
    "  </mask>\n"
    '  <rect class="fg" width="256" height="256" mask="url(#logo)"/>\n'
    "</svg>\n"
)
with open(os.path.join(PUB, "favicon.svg"), "w", encoding="utf-8") as f:
    f.write(svg)
print("wrote favicon.svg", len(svg), "bytes")

# ---- Raster tiles ----
save(make_tile(16, 0.10, 0.18), "favicon-16.png")
save(make_tile(32, 0.12, 0.18), "favicon-32.png")
save(make_tile(180, 0.14, 0.0), "apple-touch-icon.png")
save(make_tile(192, 0.14, 0.0), "icon-192.png")
save(make_tile(512, 0.14, 0.0), "icon-512.png")

# ---- Multi-size .ico ----
ico_base = make_tile(256, 0.12, 0.18)
ico_base.save(
    os.path.join(PUB, "favicon.ico"),
    sizes=[(16, 16), (32, 32), (48, 48)],
)
print("wrote favicon.ico")
