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
  const used = new Set<number>();
  let maxN = 0;
  for (const id of existingIds) {
    const parsed = parsePoiId(id);
    if (parsed && parsed.category === category && parsed.zone === zone) {
      used.add(parsed.n);
      maxN = Math.max(maxN, parsed.n);
    }
  }

  // For 0-1 existing IDs, append sequentially without filling gaps
  if (used.size < 2) {
    return buildPoiId(category, zone, maxN + 1);
  }

  // For 2+ IDs, fill the first gap, or append if no gaps
  for (let n = 1; n <= maxN; n++) {
    if (!used.has(n)) {
      return buildPoiId(category, zone, n);
    }
  }

  return buildPoiId(category, zone, maxN + 1);
}
