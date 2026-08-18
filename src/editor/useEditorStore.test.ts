import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EDITOR_STORAGE_KEY } from '../lib/editorStorageKey';

// The store hydrates from localStorage at module load, so each test seeds storage
// and then imports a fresh module instance.
async function loadStore() {
  vi.resetModules();
  const mod = await import('./useEditorStore');
  return mod.useEditorStore;
}

const oldLever = { id: 'pipe-lever-machinery-01', category: 'pipe-lever', zone: 'machinery', x: 10, y: 10 };
const base = { version: 1, image: { width: 1395, height: 651 } };

describe('useEditorStore rehydration', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('migrates a saved draft that uses a renamed category instead of crashing', async () => {
    window.localStorage.setItem(
      EDITOR_STORAGE_KEY,
      JSON.stringify({ state: { draft: { ...base, pois: [oldLever] }, lastZone: 'machinery' }, version: 0 }),
    );
    const store = await loadStore();
    const s = store.getState();
    expect(s.draft.pois[0]).toMatchObject({ id: 'pipe-lever-blue-machinery-01', category: 'pipe-lever-blue' });
    expect(s.draftNotice).toEqual({ kind: 'migrated' });
    expect(s.lastZone).toBe('machinery');
  });

  it('discards an unrecoverable saved draft and falls back to the published data', async () => {
    window.localStorage.setItem(
      EDITOR_STORAGE_KEY,
      JSON.stringify({ state: { draft: { ...base, pois: [{ ...oldLever, category: 'teleporter', id: 'teleporter-hub-01' }] } }, version: 0 }),
    );
    const store = await loadStore();
    const s = store.getState();
    expect(s.draft.pois.every((p) => p.category !== ('teleporter' as string))).toBe(true);
    expect(s.draftNotice?.kind).toBe('discarded');
    expect(console.warn).toHaveBeenCalled();
  });

  it('keeps a valid saved draft as-is with no notice', async () => {
    const valid = { ...base, pois: [{ id: 'ammo-hub-01', category: 'ammo', zone: 'hub', x: 1, y: 1 }] };
    window.localStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify({ state: { draft: valid, lastZone: 'hub' }, version: 0 }));
    const store = await loadStore();
    const s = store.getState();
    expect(s.draft.pois).toHaveLength(1);
    expect(s.draftNotice).toBeNull();
  });
});
