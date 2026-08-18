import { CATEGORY_IDS, isCategoryId, type CategoryId } from '../data/categories';
import { ZONE_IDS, isZoneId, type ZoneId } from '../data/zones';

const cats = CATEGORY_IDS.join('|');
const zones = ZONE_IDS.join('|');
export const POI_ID_PATTERN = new RegExp(`^(${cats})-(${zones})-(\\d{2})$`);

export function buildPoiId(category: CategoryId, zone: ZoneId, n: number): string {
  return `${category}-${zone}-${String(n).padStart(2, '0')}`;
}

export function parsePoiId(id: string): { category: CategoryId; zone: ZoneId; n: number } | null {
  const m = POI_ID_PATTERN.exec(id);
  if (!m) return null;
  const [, category, zone, num] = m;
  if (!isCategoryId(category) || !isZoneId(zone) || num === undefined) return null;
  return { category, zone, n: Number(num) };
}

export function nextPoiId(existingIds: Iterable<string>, category: CategoryId, zone: ZoneId): string {
  let max = 0;
  for (const id of existingIds) {
    const parsed = parsePoiId(id);
    if (parsed && parsed.category === category && parsed.zone === zone) max = Math.max(max, parsed.n);
  }
  return buildPoiId(category, zone, max + 1);
}
