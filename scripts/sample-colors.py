"""Sample source screenshot pixels. Run: python scripts/sample-colors.py (requires Pillow)."""

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SAMPLES = {
    "metabase": ("reference/metabase/META FULL PICTURE BP.png", [(0, 0), (100, 150), (440, 310), (530, 900)]),
    "ga4": ("reference/ga4/screencapture-analytics-google-analytics-web-2026-06-03-13_19_00.png", [(0, 0), (100, 300), (360, 300), (80, 400)]),
    "clarity": ("reference/clarity/Vista General.png", [(0, 0), (100, 80), (200, 180), (300, 200)]),
    "clarity-heatmap": ("reference/clarity/segmentos1.PNG", [(20, 20)]),
}

for name, (relative_path, points) in SAMPLES.items():
    with Image.open(ROOT / relative_path).convert("RGB") as screenshot:
        for point in points:
            red, green, blue = screenshot.getpixel(point)
            print(f"{name} {point}: #{red:02X}{green:02X}{blue:02X}")
