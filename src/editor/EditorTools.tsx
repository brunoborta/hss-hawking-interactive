import { CATEGORIES, type CategoryId } from '../data/categories';
import { CategoryIcon } from '../icons/CategoryIcon';
import type { Tool } from './editorReducer';

const btn = 'rounded border px-2 py-1 text-xs uppercase tracking-[0.15em] transition-colors';
const on = 'border-cyan-line bg-cyan-line/20 text-white';
const off = 'border-cyan-line/30 text-cyan-line/80 hover:bg-white/5';

export function EditorTools({
  tool,
  onSetTool,
  onDeleteSelected,
  hasSelection,
  exhausted,
}: {
  tool: Tool;
  onSetTool: (t: Tool) => void;
  onDeleteSelected: () => void;
  hasSelection: boolean;
  /** Categories whose maxCount is already reached (their Add button is disabled). */
  exhausted?: ReadonlySet<CategoryId>;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1">
        <button type="button" className={`${btn} ${tool.kind === 'select' ? on : off}`} onClick={() => onSetTool({ kind: 'select' })}>
          Select
        </button>
        <button type="button" className={`${btn} ${off} disabled:opacity-40`} disabled={!hasSelection} onClick={onDeleteSelected}>
          Delete
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        {CATEGORIES.map((c) => {
          const active = tool.kind === 'add' && tool.category === c.id;
          const full = exhausted?.has(c.id) ?? false;
          return (
            <button
              key={c.id}
              type="button"
              title={full ? `${c.label}: only ${c.maxCount} allowed (already placed)` : `Add ${c.label}`}
              aria-pressed={active}
              disabled={full && !active}
              className={`${btn} flex items-center gap-1 disabled:cursor-not-allowed disabled:opacity-35 ${active ? on : off}`}
              onClick={() => onSetTool(active ? { kind: 'select' } : { kind: 'add', category: c.id })}
            >
              <CategoryIcon category={c.id} size={16} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
