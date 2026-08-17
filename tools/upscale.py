"""Upscale tools/source/hawking-base.webp 4x -> public/base.webp.

Preferred path (better edges): run realesrgan-ncnn-vulkan (portable binary,
https://github.com/xinntao/Real-ESRGAN/releases) with:
    realesrgan-ncnn-vulkan -i tools/source/hawking-base.webp -o base4x.png -s 4 -n realesrgan-x4plus-anime
then: python tools/upscale.py --from base4x.png
Fallback (no external binary): python tools/upscale.py   (Lanczos + light unsharp mask)
"""
import argparse
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "tools" / "source" / "hawking-base.webp"
OUT = ROOT / "public" / "base.webp"
SCALE = 4


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="pre", help="already-upscaled PNG to convert instead of Lanczos")
    ap.add_argument("--quality", type=int, default=85)
    args = ap.parse_args()

    if args.pre:
        img = Image.open(args.pre).convert("RGB")
    else:
        src = Image.open(SRC).convert("RGB")
        img = src.resize((src.width * SCALE, src.height * SCALE), Image.LANCZOS)
        img = img.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))

    assert img.width == 1395 * SCALE and img.height == 651 * SCALE, img.size
    img.save(OUT, "WEBP", quality=args.quality, method=6)
    print(f"wrote {OUT} {img.size} {OUT.stat().st_size // 1024} KiB")


if __name__ == "__main__":
    main()
