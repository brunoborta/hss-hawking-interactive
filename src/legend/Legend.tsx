import { useState } from 'react';
import { CATEGORIES, type CategoryId } from '../data/categories';
import { CategoryIcon } from '../icons/CategoryIcon';
import { allVisible, noneVisible, soloCategory, toggleCategory, type VisibleSet } from './filterState';

interface LegendProps {
  visible: VisibleSet;
  counts: Partial<Record<CategoryId, number>>;
  onChange: (next: VisibleSet) => void;
}

export function Legend({ visible, counts, onChange }: LegendProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={
        'pointer-events-none fixed inset-x-0 bottom-0 z-[1000] flex flex-col items-center ' +
        'md:bottom-4'
      }
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls="legend-panel"
        onClick={() => setOpen((o) => !o)}
        className={
          'pointer-events-auto min-h-11 rounded-t-md border border-b-0 border-cyan-line/50 bg-panel/90 ' +
          'px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-line md:hidden'
        }
      >
        Legend
      </button>

      <div
        id="legend-panel"
        className={
          'pointer-events-auto w-full max-w-4xl rounded-t-xl border border-cyan-line/50 bg-panel/85 ' +
          'max-h-[70dvh] overflow-y-auto overscroll-contain px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-4 md:pb-3 shadow-[0_0_24px_rgba(111,214,232,0.15)] backdrop-blur-sm ' +
          'md:rounded-xl ' +
          (open ? 'block' : 'hidden md:block')
        }
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
          <ul className="grid w-full min-w-0 grid-cols-2 gap-x-2 gap-y-1 md:flex-1 md:grid-flow-col md:grid-cols-4 md:grid-rows-3 md:gap-x-6">
            {CATEGORIES.map((cat) => {
              const on = visible.has(cat.id);
              const count = counts[cat.id] ?? 0;
              return (
                <li key={cat.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    title={`${cat.label} (${count})`}
                    onClick={() => onChange(toggleCategory(visible, cat.id))}
                    onDoubleClick={() => onChange(soloCategory(cat.id))}
                    className={
                      'flex min-h-11 w-full items-center gap-2 md:min-h-0 rounded px-1 py-0.5 text-left text-[11px] font-semibold ' +
                      'uppercase tracking-[0.08em] md:tracking-[0.15em] transition-opacity hover:bg-white/5 ' +
                      (on ? 'opacity-100' : 'opacity-35 saturate-0')
                    }
                  >
                    <CategoryIcon category={cat.id} size={18} className="shrink-0" />
                    <span className="min-w-0 wrap-break-word">{cat.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex gap-2 border-t border-cyan-line/30 pt-2 md:flex-col md:gap-1 md:border-t-0 md:border-l md:pt-0 md:pl-3">
            <button
              type="button"
              onClick={() => onChange(allVisible())}
              className="min-h-11 flex-1 rounded px-2 md:min-h-0 md:flex-none py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-line hover:bg-white/5"
            >
              All
            </button>
            <button
              type="button"
              onClick={() => onChange(noneVisible())}
              className="min-h-11 flex-1 rounded px-2 md:min-h-0 md:flex-none py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-line hover:bg-white/5"
            >
              None
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
