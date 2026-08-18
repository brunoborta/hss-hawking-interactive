import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { publishedData } from '../data/publishedData';
import { isZoneId, type ZoneId } from '../data/zones';
import { fallbackDraft, recoverDraft } from './draftMigration';
import { editorReducer, initialEditorState, type EditorAction, type EditorState } from './editorReducer';

import { EDITOR_STORAGE_KEY } from '../lib/editorStorageKey';

export { EDITOR_STORAGE_KEY };

/** What happened to the persisted draft on load — shown once to the author. */
export type DraftNotice =
  | { kind: 'migrated' }
  | { kind: 'discarded'; errors: string[] }
  | null;

type EditorStore = EditorState & {
  hydrated: boolean;
  draftNotice: DraftNotice;
  dispatch: (action: EditorAction) => void;
  hasSavedDraft: () => boolean;
  setHydrated: () => void;
  clearDraftNotice: () => void;
};

type Persisted = { draft?: unknown; lastZone?: unknown };

export const useEditorStore = create<EditorStore>()(
  persist(
    (set, get) => ({
      ...initialEditorState(publishedData),
      hydrated: false,
      draftNotice: null,
      dispatch: (action) => set((s) => editorReducer(s, action)),
      hasSavedDraft: () => JSON.stringify(get().draft) !== JSON.stringify(publishedData),
      setHydrated: () => set({ hydrated: true }),
      clearDraftNotice: () => set({ draftNotice: null }),
    }),
    {
      name: EDITOR_STORAGE_KEY,
      partialize: (s) => ({ draft: s.draft, lastZone: s.lastZone }),
      // Never trust what is in localStorage: migrate renamed categories, then validate
      // against the schema. An unrecoverable draft is discarded (published data wins)
      // instead of crashing the editor on an unknown category.
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Persisted;
        const lastZone: ZoneId = isZoneId(persisted.lastZone) ? persisted.lastZone : currentState.lastZone;
        if (persisted.draft === undefined) return { ...currentState, lastZone };
        const r = recoverDraft(persisted.draft);
        if (r.kind === 'ok') {
          return { ...currentState, lastZone, draft: r.draft, draftNotice: r.migrated ? { kind: 'migrated' } : null };
        }
        console.warn('[editor] saved draft is invalid and was discarded:\n' + r.errors.join('\n'));
        return { ...currentState, lastZone, draft: fallbackDraft(), draftNotice: { kind: 'discarded', errors: r.errors } };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
