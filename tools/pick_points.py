"""Click on an image to print pixel coordinates (for building rectify-points.json).
Usage: python tools/pick_points.py tools/source/ingame-screenshot.png
Left-click prints "x, y"; press q to quit. The window may be scaled to fit; printed
coordinates are always in original image pixels.
"""
import sys

import cv2

path = sys.argv[1]
img = cv2.imread(path)
h, w = img.shape[:2]
scale = min(1.0, 1400 / w, 800 / h)
view = cv2.resize(img, (int(w * scale), int(h * scale)))


def on_mouse(event, x, y, flags, param):
    if event == cv2.EVENT_LBUTTONDOWN:
        print(f"{x / scale:.1f}, {y / scale:.1f}", flush=True)


cv2.namedWindow("pick")
cv2.setMouseCallback("pick", on_mouse)
while True:
    cv2.imshow("pick", view)
    if cv2.waitKey(20) & 0xFF == ord("q"):
        break
cv2.destroyAllWindows()
