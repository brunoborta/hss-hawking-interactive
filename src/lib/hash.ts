import { isCategoryId, type CategoryId } from '../data/categories';

export type HashTarget = { kind: 'poi'; id: string } | { kind: 'cat'; id: CategoryId } | null;

export function parseHash(hash: string): HashTarget {
  const h = hash.startsWith('#') ? hash.slice(1) : hash;
  const m = /^(poi|cat)\/([a-z0-9-]+)$/.exec(h);
  if (!m) return null;
  const [, kind, id] = m;
  if (kind === 'poi' && id) return { kind: 'poi', id };
  if (kind === 'cat' && isCategoryId(id)) return { kind: 'cat', id };
  return null;
}

export function poiHash(id: string): string {
  return `#poi/${id}`;
}

export function catHash(id: CategoryId): string {
  return `#cat/${id}`;
}
