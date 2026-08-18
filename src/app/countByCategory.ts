import type { CategoryId } from '../data/categories';
import type { Poi } from '../data/schema';

export function countByCategory(pois: readonly Poi[]): Partial<Record<CategoryId, number>> {
  const out: Partial<Record<CategoryId, number>> = {};
  for (const p of pois) out[p.category] = (out[p.category] ?? 0) + 1;
  return out;
}
