import L from 'leaflet';
import type { CategoryId } from '../data/categories';
import { ICON_SVG } from '../icons/index';

const SIZE = 32;
const cache = new Map<string, L.DivIcon>();

export function markerIcon(category: CategoryId, selected: boolean): L.DivIcon {
  const key = `${category}:${selected ? 1 : 0}`;
  let icon = cache.get(key);
  if (!icon) {
    icon = L.divIcon({
      html: ICON_SVG[category].replace('width="24" height="24"', `width="${SIZE}" height="${SIZE}"`),
      className: `poi-marker poi-marker--${category}${selected ? ' is-selected' : ''}`,
      iconSize: [SIZE, SIZE],
      iconAnchor: [SIZE / 2, SIZE / 2],
      popupAnchor: [0, -SIZE / 2],
      tooltipAnchor: [SIZE / 2, 0],
    });
    cache.set(key, icon);
  }
  return icon;
}
