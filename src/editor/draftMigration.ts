import { publishedData } from '../data/publishedData';
import { safeParseMapData, type MapData } from '../data/schema';

/**
 * Category ids that were renamed after drafts may have been saved. Applied to
 * persisted drafts (and imports) before schema validation so authors don't lose work.
 */
export const CATEGORY_RENAMES: Readonly<Record<string, string>> = {
  'pipe-lever': 'pipe-lever-blue',
};

/** Rewrites renamed categories (and the category part of ids) in a raw draft-like object. */
export function migrateDraft(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as { pois?: unknown }).pois)) return raw;
  const data = raw as { pois: unknown[] };
  return {
    ...data,
    pois: data.pois.map((p) => {
      if (!p || typeof p !== 'object') return p;
      const poi = p as { category?: unknown; id?: unknown };
      if (typeof poi.category !== 'string') return p;
      const from: string = poi.category;
      const to = CATEGORY_RENAMES[from];
      if (!to) return p;
      const id = typeof poi.id === 'string' && poi.id.startsWith(`${from}-`) ? `${to}-${poi.id.slice(from.length + 1)}` : poi.id;
      return { ...poi, category: to, id };
    }),
  };
}

export type DraftRecovery =
  | { kind: 'ok'; draft: MapData; migrated: boolean }
  | { kind: 'discarded'; errors: string[] };

/**
 * Takes whatever was persisted and returns a schema-valid draft: migrated when
 * possible, otherwise discarded (caller falls back to the published data).
 */
export function recoverDraft(persisted: unknown): DraftRecovery {
  const migrated = migrateDraft(persisted);
  const r = safeParseMapData(migrated);
  if (r.ok) return { kind: 'ok', draft: r.data, migrated: JSON.stringify(migrated) !== JSON.stringify(persisted) };
  return { kind: 'discarded', errors: r.errors };
}

export function fallbackDraft(): MapData {
  return structuredClone(publishedData);
}
