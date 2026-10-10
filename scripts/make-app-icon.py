#!/usr/bin/env python3
"""
Generates the 512x512 TikTok app icon for Brainrot Maroc Video Creator.

Original artwork: no TikTok logo, no copyrighted characters, no brand marks.
Drawn vector-style at 4x and downsampled, so edges stay smooth at 48px.

Run:  python scripts/make-app-icon.py
"""

from PIL import Image, ImageDraw
import os

S = 4                 # supersample factor
OUT = 512
W = OUT * S

DEEP_TEAL = (14, 42, 58, 255)
FRAME_TEAL = (22, 74, 99, 255)
AMBER = (244, 162, 60, 255)
AMBER_LIGHT = (255, 201, 122, 255)
MINT = (63, 191, 127, 255)
INK = (14, 42, 58, 255)

img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# background: squircle
d.rounded_rectangle([0, 0, W - 1, W - 1], radius=int(W * 0.22), fill=DEEP_TEAL)

# 9:16 vertical video frame
fw = int(W * 0.44)
fh = int(fw * 16 / 9)
fx0 = (W - fw) // 2
fy0 = (W - fh) // 2
d.rounded_rectangle(
    [fx0, fy0, fx0 + fw, fy0 + fh],
    radius=int(fw * 0.13),
    fill=FRAME_TEAL,
    outline=AMBER,
    width=int(W * 0.012),
)

cx = W // 2

# Moroccan mint-tea glass: trapezoid body
g_top = fy0 + int(fh * 0.28)
g_bot = fy0 + int(fh * 0.74)
top_hw = int(fw * 0.30)
bot_hw = int(fw * 0.21)
d.polygon(
    [(cx - top_hw, g_top), (cx + top_hw, g_top),
     (cx + bot_hw, g_bot), (cx - bot_hw, g_bot)],
    fill=AMBER,
)

# glass rim
rim_h = int(fh * 0.055)
d.ellipse(
    [cx - top_hw, g_top - rim_h // 2, cx + top_hw, g_top + rim_h // 2],
    fill=AMBER_LIGHT,
)

# two mint leaves, rotated
def leaf(cx_, cy_, rx, ry, angle):
    pad = max(rx, ry) * 2 + 8
    layer = Image.new("RGBA", (int(pad), int(pad)), (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse([4, 4, 4 + rx * 2, 4 + ry * 2], fill=MINT)
    layer = layer.rotate(angle, resample=Image.BICUBIC, expand=True)
    img.alpha_composite(layer, (int(cx_ - layer.width / 2), int(cy_ - layer.height / 2)))

lw = int(fw * 0.17)
leaf(cx - int(fw * 0.17), g_top - int(fh * 0.055), lw, int(lw * 0.45), -28)
leaf(cx + int(fw * 0.17), g_top - int(fh * 0.035), lw, int(lw * 0.45), 22)

# cheeky face
eye_r = int(fw * 0.045)
eye_y = int(g_top + (g_bot - g_top) * 0.38)
for ex in (cx - int(fw * 0.11), cx + int(fw * 0.11)):
    d.ellipse([ex - eye_r, eye_y - eye_r, ex + eye_r, eye_y + eye_r], fill=INK)

sm_w = int(fw * 0.30)
sm_y = eye_y + int(fh * 0.055)
d.arc(
    [cx - sm_w // 2, sm_y, cx + sm_w // 2, sm_y + int(fh * 0.075)],
    start=0, end=180, fill=INK, width=int(W * 0.012),
)

img = img.resize((OUT, OUT), Image.LANCZOS)

here = os.path.dirname(os.path.abspath(__file__))
dest = os.path.join(here, "..", "assets", "app-icon-512.png")
os.makedirs(os.path.dirname(dest), exist_ok=True)
img.save(dest, "PNG", optimize=True)
print(f"wrote {os.path.abspath(dest)}  size={img.size}  mode={img.mode}")
