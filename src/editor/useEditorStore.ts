import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { publishedData } from '../data/publishedData';
import { editorReducer, initialEditorState, type EditorAction, type EditorState } from './editorReducer';

export const EDITOR_STORAGE_KEY = 'hawking-editor-draft-v1';

type EditorStore = EditorState & {
  hydrated: boolean;
  dispatch: (action: EditorAction) => void;
  hasSavedDraft: () => boolean;
  setHydrated: () => void;
};

export const useEditorStore = create<EditorStore>()(
  persist(
    (set, get) => ({
      ...initialEditorState(publishedData),
      hydrated: false,
      dispatch: (action) => set((s) => editorReducer(s, action)),
      hasSavedDraft: () => JSON.stringify(get().draft) !== JSON.stringify(publishedData),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: EDITOR_STORAGE_KEY,
      partialize: (s) => ({ draft: s.draft, lastZone: s.lastZone }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
