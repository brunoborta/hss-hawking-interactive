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
          'pointer-events-auto mb-[-1px] rounded-t-md border border-b-0 border-cyan-line/50 bg-panel/90 ' +
          'px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-line md:hidden'
        }
      >
        Legend
      </button>

      <div
        id="legend-panel"
        className={
          'pointer-events-auto w-full max-w-3xl rounded-t-xl border border-cyan-line/50 bg-panel/85 ' +
          'px-4 py-3 shadow-[0_0_24px_rgba(111,214,232,0.15)] backdrop-blur-sm ' +
          'transition-transform duration-200 md:rounded-xl ' +
          (open ? 'translate-y-0' : 'translate-y-full md:translate-y-0')
        }
      >
        <div className="flex items-start gap-4">
          <ul
            className="grid flex-1 gap-x-6 gap-y-1"
            style={{ gridAutoFlow: 'column', gridTemplateRows: 'repeat(3, auto)' }}
          >
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
                      'flex w-full items-center gap-2 rounded px-1 py-0.5 text-left text-[11px] font-semibold ' +
                      'uppercase tracking-[0.15em] transition-opacity hover:bg-white/5 ' +
                      (on ? 'opacity-100' : 'opacity-35 saturate-0')
                    }
                  >
                    <CategoryIcon category={cat.id} size={18} />
                    <span>{cat.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-col gap-1 border-l border-cyan-line/30 pl-3">
            <button
              type="button"
              onClick={() => onChange(allVisible())}
              className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-line hover:bg-white/5"
            >
              All
            </button>
            <button
              type="button"
              onClick={() => onChange(noneVisible())}
              className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-line hover:bg-white/5"
            >
              None
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
