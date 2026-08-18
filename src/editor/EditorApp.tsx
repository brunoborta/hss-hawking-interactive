import { useEffect, useMemo, useRef, useState } from 'react';
import { countByCategory } from '../app/countByCategory';
import { Legend } from '../legend/Legend';
import { allVisible, type VisibleSet } from '../legend/filterState';
import { MapView } from '../map/MapView';
import { MarkerLayer } from '../map/MarkerLayer';
import { ReferenceLayer } from '../map/ReferenceLayer';
import { EditorPanel } from './EditorPanel';
import { useEditorShortcuts } from './useEditorShortcuts';
import { useEditorStore } from './useEditorStore';

export default function EditorApp() {
  const draft = useEditorStore((s) => s.draft);
  const selectedId = useEditorStore((s) => s.selectedId);
  const tool = useEditorStore((s) => s.tool);
  const hydrated = useEditorStore((s) => s.hydrated);
  const dispatch = useEditorStore((s) => s.dispatch);
  const hasSavedDraft = useEditorStore((s) => s.hasSavedDraft);
  const draftNotice = useEditorStore((s) => s.draftNotice);
  const clearDraftNotice = useEditorStore((s) => s.clearDraftNotice);

  const [visible, setVisible] = useState<VisibleSet>(() => allVisible());
  const [refVisible, setRefVisible] = useState(true);
  const [refOpacity, setRefOpacity] = useState(0.5);
  const [locateId, setLocateId] = useState<string | null>(null);
  const counts = useMemo(() => countByCategory(draft.pois), [draft.pois]);

  useEditorShortcuts();

  // Ask once, after hydration, whether to continue a saved draft.
  const asked = useRef(false);
  useEffect(() => {
    if (!hydrated || asked.current) return;
    asked.current = true;
    if (hasSavedDraft() && !window.confirm('A saved draft was found. Continue editing it? (Cancel = start from the published data)')) {
      dispatch({ type: 'replaceDraft', data: JSON.parse(JSON.stringify(useEditorStore.getInitialState().draft)) });
    }
  }, [hydrated, hasSavedDraft, dispatch]);

  return (
    <div className="flex h-full w-full">
      <div className="relative min-w-0 flex-1">
        <MapView addMode={tool.kind === 'add'} onMapClick={(p) => dispatch({ type: 'addPoi', ...p })}>
          <ReferenceLayer visible={refVisible} opacity={refOpacity} />
          <MarkerLayer
            pois={draft.pois}
            visible={visible}
            mode="edit"
            selectedId={selectedId}
            onSelect={(id) => dispatch({ type: 'select', id })}
            onMove={(id, p) => dispatch({ type: 'movePoi', id, ...p })}
            openPoiId={locateId}
          />
        </MapView>
        <Legend visible={visible} counts={counts} onChange={setVisible} />
        {draftNotice && (
          <div
            role="status"
            className="pointer-events-auto absolute left-1/2 top-3 z-[1100] max-w-xl -translate-x-1/2 rounded border border-cyan-line/60 bg-panel/95 px-3 py-2 text-xs text-white shadow-lg"
          >
            {draftNotice.kind === 'migrated' ? (
              <span>Your saved draft used renamed categories and was migrated automatically. Review, then export again.</span>
            ) : (
              <span>
                Your saved draft was invalid and has been discarded; the editor loaded the published data instead.
                <span className="block text-white/60">{draftNotice.errors.slice(0, 3).join(' · ')}</span>
              </span>
            )}
            <button type="button" className="ml-3 text-cyan-line hover:underline" onClick={clearDraftNotice}>
              Dismiss
            </button>
          </div>
        )}
      </div>
      <EditorPanel
        referenceVisible={refVisible}
        referenceOpacity={refOpacity}
        onReferenceVisible={setRefVisible}
        onReferenceOpacity={setRefOpacity}
        onLocate={(id) => {
          setLocateId(id);
          setTimeout(() => setLocateId(null), 0);
        }}
      />
    </div>
  );
}
