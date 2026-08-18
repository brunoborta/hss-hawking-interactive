# tools/

One-off asset generation. Outputs are committed to `public/`; rerun only when sources change.

- `source/hawking-base.webp` — original 1395×651 clean floor plan (map base).
- `source/ingame-screenshot.png` — photo of the in-game wall map (POI reference).

## Setup
    python -m pip install -r tools/requirements.txt

## Base upscale → public/base.webp
Preferred: Real-ESRGAN portable binary, then convert:
    realesrgan-ncnn-vulkan -i tools/source/hawking-base.webp -o base4x.png -s 4 -n realesrgan-x4plus-anime
    python tools/upscale.py --from base4x.png
Fallback (Lanczos + unsharp):
    python tools/upscale.py

The committed `public/base.webp` (5580×2604, ~167 KiB) was produced with the Lanczos
fallback at the default quality 85.

## Rectified reference → public/reference.png
1. Pick correspondences: `python tools/pick_points.py tools/source/ingame-screenshot.png` (and the base).
2. Edit `tools/rectify-points.json` (`src` = screenshot px, `dst` = base px).
3. `python tools/rectify.py --preview` and inspect `tools/rectify-preview.png`; iterate.
`rectify-preview.png` is gitignored.

### Alignment achieved
The committed `rectify-points.json` holds 12 correspondences spread over the whole hull
(shuttle bay, production, crew quarters, the central hub, machinery and the laboratory).
A single homography fits all 12 as RANSAC inliers with residuals between 0.4 px and
1.9 px, so the in-game panel is flat enough that no piecewise warp is needed: in the
50/50 preview the screenshot's zone outlines and wall edges sit on the base's outlines
at both ends of the ship with no visible doubling.

Note the in-game panel renders the Production zone in grey rather than the base's
magenta, so that region has less texture to match against; the two Production
correspondences were taken from wall corners rather than zone fills.
