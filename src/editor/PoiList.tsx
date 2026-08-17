import { useState } from 'react';
import { CATEGORIES, type CategoryId } from '../data/categories';
import type { Poi } from '../data/schema';
import { CategoryIcon } from '../icons/CategoryIcon';
import { displayName } from '../lib/display';

export function PoiList({
  pois,
  selectedId,
  onSelect,
}: {
  pois: readonly Poi[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [filter, setFilter] = useState<CategoryId | 'all'>('all');
  const shown = pois.filter((p) => filter === 'all' || p.category === filter);
  return (
    <div className="flex flex-col gap-1">
      <select
        aria-label="Filter list by category"
        className="rounded border border-cyan-line/30 bg-black/30 px-2 py-1 text-xs"
        value={filter}
        onChange={(e) => setFilter(e.target.value as CategoryId | 'all')}
      >
        <option value="all">All categories ({pois.length})</option>
        {CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label} ({pois.filter((p) => p.category === c.id).length})
          </option>
        ))}
      </select>
      <ul className="max-h-56 overflow-y-auto text-xs">
        {shown.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onSelect(p.id)}
              className={
                'flex w-full items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-white/5 ' +
                (p.id === selectedId ? 'bg-cyan-line/20' : '')
              }
            >
              <CategoryIcon category={p.category} size={14} />
              <span className="truncate">{displayName(p)}</span>
              <span className="ml-auto text-white/40">{p.id}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
