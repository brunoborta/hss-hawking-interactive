import { CATEGORY_IDS, type CategoryId } from '../data/categories';

export type VisibleSet = ReadonlySet<CategoryId>;

export function allVisible(): VisibleSet {
  return new Set<CategoryId>(CATEGORY_IDS);
}

export function noneVisible(): VisibleSet {
  return new Set<CategoryId>();
}

export function toggleCategory(set: VisibleSet, id: CategoryId): VisibleSet {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export function soloCategory(id: CategoryId): VisibleSet {
  return new Set<CategoryId>([id]);
}

export function isAllVisible(set: VisibleSet): boolean {
  return CATEGORY_IDS.every((id) => set.has(id));
}
