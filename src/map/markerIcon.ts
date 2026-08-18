import L from 'leaflet';
import { CATEGORY_BY_ID, type CategoryId } from '../data/categories';
import { ICON_SVG } from '../icons/index';

const SIZE = 32;
const cache = new Map<string, L.DivIcon>();

export function markerIcon(category: CategoryId, selected: boolean): L.DivIcon {
  const key = `${category}:${selected ? 1 : 0}`;
  let icon = cache.get(key);
  if (!icon) {
    // Pins have their hotspot at the tip (viewBox y≈22.5/24 → 30/32); badges at the centre.
    const bottom = CATEGORY_BY_ID[category].anchor === 'bottom';
    const anchorY = bottom ? 30 : SIZE / 2;
    icon = L.divIcon({
      html: ICON_SVG[category].replace('width="24" height="24"', `width="${SIZE}" height="${SIZE}"`),
      className: `poi-marker poi-marker--${category}${selected ? ' is-selected' : ''}`,
      iconSize: [SIZE, SIZE],
      iconAnchor: [SIZE / 2, anchorY],
      popupAnchor: [0, -anchorY],
      tooltipAnchor: [SIZE / 2, bottom ? -SIZE / 2 : 0],
    });
    cache.set(key, icon);
  }
  return icon;
}
