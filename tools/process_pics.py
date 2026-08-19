"""POI screenshots: strip the in-game HUD, lift the shadows, export WebP.

    python tools/process_pics.py            # only new/changed sources
    python tools/process_pics.py --force    # redo everything
    python tools/process_pics.py --grid     # also write tools/pics-grid.jpg for eyeballing

Sources:  tools/source/pics-raw/<poi-id>.png  (raw 1920x1080 captures, HUD on)
Outputs:  public/media/pics/<poi-id>.webp     (1280 wide, HUD removed, gamma-lifted)

The HUD sits at fixed screen positions, so it is removed with a fixed mask and
OpenCV's Telea inpainting; the performance-overlay strip at the top is simply cropped.
A source is reprocessed when its output is missing or older than the source.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "tools" / "source" / "pics-raw"
OUT_DIR = ROOT / "public" / "media" / "pics"
GRID_PATH = ROOT / "tools" / "pics-grid.jpg"

EXPECTED_SIZE = (1920, 1080)  # w, h
TOP_CROP = 26  # performance overlay strip
# HUD zones (x0, y0, x1, y1) in 1920x1080 space, with margin.
HUD_ZONES = [
    (20, 760, 300, 860),  # Q item + label
    (20, 840, 180, 940),  # F item
    (80, 950, 430, 1025),  # health / stamina bars
    (790, 920, 1130, 1005),  # "N TEAM RESPAWNS LEFT"
    (1430, 830, 1820, 940),  # weapon slots
    (1680, 925, 1830, 975),  # "NO WEAPON"
    (1800, 855, 1890, 940),  # mouse icon
]
INPAINT_RADIUS = 7
GAMMA = 1.25
OUT_WIDTH = 1280
WEBP_QUALITY = 80


def gamma_lut(gamma: float) -> np.ndarray:
    return np.array([((i / 255.0) ** (1 / gamma)) * 255 for i in range(256)]).astype("uint8")


LUT = gamma_lut(GAMMA)


def process(bgr: np.ndarray) -> np.ndarray:
    mask = np.zeros(bgr.shape[:2], np.uint8)
    for x0, y0, x1, y1 in HUD_ZONES:
        mask[y0:y1, x0:x1] = 255
    out = cv2.inpaint(bgr, mask, INPAINT_RADIUS, cv2.INPAINT_TELEA)
    out = out[TOP_CROP:]
    out = cv2.LUT(out, LUT)
    h = round(OUT_WIDTH * out.shape[0] / out.shape[1])
    return cv2.resize(out, (OUT_WIDTH, h), interpolation=cv2.INTER_AREA)


def needs_update(src: Path, dst: Path, force: bool) -> bool:
    return force or not dst.exists() or src.stat().st_mtime > dst.stat().st_mtime


def write_grid(paths: list[Path], cols: int = 6, tile_w: int = 420) -> None:
    tiles = []
    for p in paths:
        im = cv2.imread(str(p))
        if im is None:
            continue
        th = round(tile_w * im.shape[0] / im.shape[1])
        im = cv2.resize(im, (tile_w, th), interpolation=cv2.INTER_AREA)
        cv2.putText(im, p.stem, (8, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 4)
        cv2.putText(im, p.stem, (8, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
        tiles.append(im)
    if not tiles:
        return
    th = tiles[0].shape[0]
    while len(tiles) % cols:
        tiles.append(np.zeros((th, tile_w, 3), np.uint8))
    rows = [np.hstack(tiles[i : i + cols]) for i in range(0, len(tiles), cols)]
    cv2.imwrite(str(GRID_PATH), np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 85])
    print(f"grid -> {GRID_PATH.relative_to(ROOT)}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--force", action="store_true", help="reprocess every source")
    ap.add_argument("--grid", action="store_true", help="write a contact sheet of all outputs")
    args = ap.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sources = sorted(SRC_DIR.glob("*.png"))
    if not sources:
        print(f"no sources in {SRC_DIR.relative_to(ROOT)}")
        return 1

    done = skipped = 0
    bad: list[str] = []
    for src in sources:
        dst = OUT_DIR / f"{src.stem}.webp"
        if not needs_update(src, dst, args.force):
            skipped += 1
            continue
        bgr = cv2.imread(str(src), cv2.IMREAD_COLOR)
        if bgr is None:
            bad.append(f"{src.name}: unreadable")
            continue
        if (bgr.shape[1], bgr.shape[0]) != EXPECTED_SIZE:
            bad.append(f"{src.name}: {bgr.shape[1]}x{bgr.shape[0]}, expected {EXPECTED_SIZE[0]}x{EXPECTED_SIZE[1]} (HUD mask assumes it)")
            continue
        cv2.imwrite(str(dst), process(bgr), [cv2.IMWRITE_WEBP_QUALITY, WEBP_QUALITY])
        done += 1
        print(f"  {src.stem}  ->  {dst.stat().st_size // 1024} KiB")

    print(f"{done} processed, {skipped} up to date, {len(bad)} skipped")
    for b in bad:
        print(f"  ! {b}")

    orphans = sorted(p.name for p in OUT_DIR.glob("*.webp") if not (SRC_DIR / f"{p.stem}.png").exists())
    if orphans:
        print(f"{len(orphans)} output(s) without a source (delete by hand if unwanted):")
        for o in orphans:
            print(f"  ? {o}")

    if args.grid:
        write_grid(sorted(OUT_DIR.glob("*.webp")))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
