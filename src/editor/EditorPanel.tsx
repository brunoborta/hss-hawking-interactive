import { useRef, useState } from 'react';
import { publishedData } from '../data/publishedData';
import { EditorTools } from './EditorTools';
import { Inspector } from './Inspector';
import { PoiList } from './PoiList';
import { downloadJson, parseImportText, serializeMapData } from './importExport';
import { useEditorStore } from './useEditorStore';

const btn = 'rounded border border-cyan-line/30 px-2 py-1 text-xs uppercase tracking-[0.15em] text-cyan-line hover:bg-white/5 disabled:opacity-40';

export function EditorPanel({
  referenceVisible,
  referenceOpacity,
  onReferenceVisible,
  onReferenceOpacity,
  onLocate,
}: {
  referenceVisible: boolean;
  referenceOpacity: number;
  onReferenceVisible: (v: boolean) => void;
  onReferenceOpacity: (v: number) => void;
  onLocate: (id: string) => void;
}) {
  const draft = useEditorStore((s) => s.draft);
  const selectedId = useEditorStore((s) => s.selectedId);
  const tool = useEditorStore((s) => s.tool);
  const past = useEditorStore((s) => s.past.length);
  const future = useEditorStore((s) => s.future.length);
  const dispatch = useEditorStore((s) => s.dispatch);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const selected = draft.pois.find((p) => p.id === selectedId) ?? null;

  const onImportFile = async (file: File) => {
    const r = parseImportText(await file.text());
    if (!r.ok) {
      setImportErrors(r.errors);
      return;
    }
    if (window.confirm(`Replace the current draft with ${r.data.pois.length} POIs from "${file.name}"?`)) {
      dispatch({ type: 'replaceDraft', data: r.data });
      setImportErrors([]);
    }
  };

  return (
    <aside className="pointer-events-auto flex h-full w-[340px] flex-col gap-4 overflow-y-auto border-l border-cyan-line/40 bg-panel/95 p-3 text-sm backdrop-blur">
      <header className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-line">Editor</h2>
        <a href={window.location.pathname} className="text-xs text-white/60 hover:text-white">
          Exit
        </a>
      </header>

      <section>
        <EditorTools
          tool={tool}
          onSetTool={(t) => dispatch({ type: 'setTool', tool: t })}
          hasSelection={!!selected}
          onDeleteSelected={() => selected && dispatch({ type: 'deletePoi', id: selected.id })}
        />
      </section>

      <section className="flex flex-col gap-1">
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={referenceVisible} onChange={(e) => onReferenceVisible(e.target.checked)} />
          Reference overlay (in-game screenshot)
        </label>
        <input
          aria-label="Reference opacity"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={referenceOpacity}
          onChange={(e) => onReferenceOpacity(Number(e.target.value))}
        />
      </section>

      <section>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-white/50">Selected POI</h3>
          {selected && (
            <button
              type="button"
              className={btn}
              title="Deselect this POI and keep going (Esc). Everything is autosaved."
              onClick={() => dispatch({ type: 'select', id: null })}
            >
              Done
            </button>
          )}
        </div>
        {selected ? (
          <Inspector poi={selected} onChange={(patch) => dispatch({ type: 'updatePoi', id: selected.id, patch })} />
        ) : (
          <p className="text-xs text-white/50">Click a marker to edit it, or pick a category above and click the map to add one.</p>
        )}
      </section>

      <section>
        <h3 className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/50">POIs</h3>
        <PoiList
          pois={draft.pois}
          selectedId={selectedId}
          onSelect={(id) => {
            dispatch({ type: 'select', id });
            onLocate(id);
          }}
        />
      </section>

      <section className="mt-auto flex flex-col gap-2">
        <div className="flex gap-1">
          <button type="button" className={btn} disabled={past === 0} onClick={() => dispatch({ type: 'undo' })}>Undo</button>
          <button type="button" className={btn} disabled={future === 0} onClick={() => dispatch({ type: 'redo' })}>Redo</button>
        </div>
        <div className="flex gap-1">
          <button type="button" className={btn} onClick={() => fileRef.current?.click()}>Import JSON</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onImportFile(f);
              e.target.value = '';
            }}
          />
          <button type="button" className={btn} onClick={() => downloadJson('hawking-map.json', serializeMapData(draft))}>Export JSON</button>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            className={btn}
            onClick={() => window.confirm('Discard the draft and reload the published data?') && dispatch({ type: 'replaceDraft', data: publishedData })}
          >
            Reset to published
          </button>
        </div>
        {importErrors.length > 0 && (
          <ul className="max-h-32 overflow-y-auto rounded border border-red-400/50 bg-red-950/40 p-2 text-xs text-red-200">
            {importErrors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
        <p className="text-[10px] text-white/40">Draft autosaves in this browser. Export and commit to publish.</p>
      </section>
    </aside>
  );
}
