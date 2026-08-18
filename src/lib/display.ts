import { CATEGORY_BY_ID } from '../data/categories';
import type { Poi } from '../data/schema';
import { ZONE_BY_ID } from '../data/zones';

export function displayName(poi: Pick<Poi, 'name' | 'category' | 'zone'>): string {
  if (poi.name && poi.name.trim()) return poi.name;
  return `${CATEGORY_BY_ID[poi.category].label} — ${ZONE_BY_ID[poi.zone].label}`;
}
