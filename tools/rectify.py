"""Warp the in-game screenshot onto the base image frame -> public/reference.png.
Usage:
  python tools/rectify.py            # writes public/reference.png
  python tools/rectify.py --preview  # also writes tools/rectify-preview.png (50/50 blend) to check alignment
"""
import argparse
import json
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
POINTS = ROOT / "tools" / "rectify-points.json"
OUT = ROOT / "public" / "reference.png"
PREVIEW = ROOT / "tools" / "rectify-preview.png"
W, H = 1395, 651


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview", action="store_true")
    args = ap.parse_args()

    cfg = json.loads(POINTS.read_text())
    src_img = cv2.imread(str(ROOT / cfg["src"]), cv2.IMREAD_COLOR)
    dst_img = cv2.imread(str(ROOT / cfg["dst"]), cv2.IMREAD_COLOR)
    assert src_img is not None and dst_img is not None
    assert dst_img.shape[1] == W and dst_img.shape[0] == H, dst_img.shape

    src_pts = np.float32([p["src"] for p in cfg["points"]])
    dst_pts = np.float32([p["dst"] for p in cfg["points"]])
    assert len(src_pts) >= 4, "need at least 4 correspondences"

    homography, mask = cv2.findHomography(src_pts, dst_pts, method=cv2.RANSAC, ransacReprojThreshold=6.0)
    inliers = int(mask.sum()) if mask is not None else 0
    print(f"homography inliers: {inliers}/{len(src_pts)}")

    warped = cv2.warpPerspective(src_img, homography, (W, H), flags=cv2.INTER_LINEAR,
                                 borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0))

    # residuals per point (in base pixels) so bad picks are obvious
    proj = cv2.perspectiveTransform(src_pts.reshape(-1, 1, 2), homography).reshape(-1, 2)
    for p, q in zip(cfg["points"], proj):
        err = float(np.hypot(*(q - np.float32(p["dst"]))))
        print(f"  {p['name']:<26} residual {err:5.1f}px")

    # alpha: opaque where the warp produced pixels, transparent outside
    alpha = cv2.warpPerspective(np.full(src_img.shape[:2], 255, np.uint8), homography, (W, H))
    rgba = cv2.cvtColor(warped, cv2.COLOR_BGR2BGRA)
    rgba[:, :, 3] = alpha
    cv2.imwrite(str(OUT), rgba)
    print(f"wrote {OUT}")

    if args.preview:
        blend = cv2.addWeighted(dst_img, 0.5, warped, 0.5, 0)
        cv2.imwrite(str(PREVIEW), blend)
        print(f"wrote {PREVIEW}")


if __name__ == "__main__":
    main()
