import { describe, expect, it } from 'vitest';
import { emptyMapData, type MapData, type Poi } from '../data/schema';
import { editorReducer, initialEditorState, type EditorState } from './editorReducer';

const p = (over: Partial<Poi> & Pick<Poi, 'id' | 'category' | 'zone'>): Poi => ({ x: 10, y: 10, ...over });

function stateWith(pois: Poi[]): EditorState {
  const data: MapData = { ...emptyMapData(), pois };
  return initialEditorState(data);
}

describe('editorReducer', () => {
  it('addPoi with add tool creates a poi with generated id and lastZone, selects it', () => {
    let s = stateWith([p({ id: 'ammo-hub-01', category: 'ammo', zone: 'hub' })]);
    s = editorReducer(s, { type: 'setTool', tool: { kind: 'add', category: 'ammo' } });
    s = editorReducer(s, { type: 'addPoi', x: 100.26, y: 200 });
    expect(s.draft.pois).toHaveLength(2);
    expect(s.draft.pois[1]).toMatchObject({ id: 'ammo-hub-02', category: 'ammo', zone: 'hub', x: 100.3, y: 200 });
    expect(s.selectedId).toBe('ammo-hub-02');
    expect(s.past).toHaveLength(1);
  });

  it('addPoi with select tool is a no-op', () => {
    const s0 = stateWith([]);
    expect(editorReducer(s0, { type: 'addPoi', x: 1, y: 1 })).toBe(s0);
  });

  it('movePoi updates coordinates and records history', () => {
    let s = stateWith([p({ id: 'ammo-hub-01', category: 'ammo', zone: 'hub' })]);
    s = editorReducer(s, { type: 'movePoi', id: 'ammo-hub-01', x: 50, y: 60 });
    expect(s.draft.pois[0]).toMatchObject({ x: 50, y: 60 });
    expect(s.past).toHaveLength(1);
  });

  it('updatePoi changes fields; changing zone regenerates the id and updates lastZone', () => {
    let s = stateWith([p({ id: 'ammo-hub-01', category: 'ammo', zone: 'hub' }), p({ id: 'ammo-machinery-01', category: 'ammo', zone: 'machinery' })]);
    s = editorReducer(s, { type: 'updatePoi', id: 'ammo-hub-01', patch: { name: 'Near Lift', zone: 'machinery' } });
    expect(s.draft.pois[0]).toMatchObject({ id: 'ammo-machinery-02', zone: 'machinery', name: 'Near Lift' });
    expect(s.lastZone).toBe('machinery');
    expect(s.selectedId).toBe(null); // nothing was selected
  });

  it('updatePoi keeps selection pointing at the renamed poi', () => {
    let s = stateWith([p({ id: 'ammo-hub-01', category: 'ammo', zone: 'hub' })]);
    s = editorReducer(s, { type: 'select', id: 'ammo-hub-01' });
    s = editorReducer(s, { type: 'updatePoi', id: 'ammo-hub-01', patch: { category: 'healing' } });
    expect(s.draft.pois[0]?.id).toBe('healing-hub-01');
    expect(s.selectedId).toBe('healing-hub-01');
  });

  it('updatePoi with explicit id override uses it verbatim', () => {
    let s = stateWith([p({ id: 'ammo-hub-01', category: 'ammo', zone: 'hub' })]);
    s = editorReducer(s, { type: 'updatePoi', id: 'ammo-hub-01', patch: { id: 'ammo-hub-07' } });
    expect(s.draft.pois[0]?.id).toBe('ammo-hub-07');
  });

  it('updatePoi ignores an empty explicit id and keeps the current one', () => {
    let s = stateWith([p({ id: 'ammo-hub-01', category: 'ammo', zone: 'hub' })]);
    s = editorReducer(s, { type: 'updatePoi', id: 'ammo-hub-01', patch: { id: '' } });
    expect(s.draft.pois[0]?.id).toBe('ammo-hub-01');
    s = editorReducer(s, { type: 'updatePoi', id: 'ammo-hub-01', patch: { id: '   ' } });
    expect(s.draft.pois[0]?.id).toBe('ammo-hub-01');
  });

  it('updatePoi rejects an explicit id whose parts do not match category/zone, or that duplicates another poi', () => {
    let s = stateWith([p({ id: 'ammo-hub-01', category: 'ammo', zone: 'hub' }), p({ id: 'ammo-hub-02', category: 'ammo', zone: 'hub' })]);
    s = editorReducer(s, { type: 'updatePoi', id: 'ammo-hub-01', patch: { id: 'weapon-hub-01' } });
    expect(s.draft.pois[0]?.id).toBe('ammo-hub-01');
    s = editorReducer(s, { type: 'updatePoi', id: 'ammo-hub-01', patch: { id: 'ammo-hub-02' } });
    expect(s.draft.pois[0]?.id).toBe('ammo-hub-01');
    s = editorReducer(s, { type: 'updatePoi', id: 'ammo-hub-01', patch: { id: 'bbmachinery' } });
    expect(s.draft.pois[0]?.id).toBe('ammo-hub-01');
  });

  it('updatePoi with a valid explicit id AND a zone change uses the explicit id when it matches the new zone', () => {
    let s = stateWith([p({ id: 'ammo-hub-01', category: 'ammo', zone: 'hub' })]);
    s = editorReducer(s, { type: 'updatePoi', id: 'ammo-hub-01', patch: { zone: 'machinery', id: 'ammo-machinery-05' } });
    expect(s.draft.pois[0]).toMatchObject({ id: 'ammo-machinery-05', zone: 'machinery' });
  });

  it('updatePoi strips empty optional strings', () => {
    let s = stateWith([p({ id: 'ammo-hub-01', category: 'ammo', zone: 'hub', name: 'x' })]);
    s = editorReducer(s, { type: 'updatePoi', id: 'ammo-hub-01', patch: { name: '', description: '  ' } });
    expect(s.draft.pois[0]).not.toHaveProperty('name');
    expect(s.draft.pois[0]).not.toHaveProperty('description');
  });

  it('deletePoi removes and clears selection', () => {
    let s = stateWith([p({ id: 'ammo-hub-01', category: 'ammo', zone: 'hub' })]);
    s = editorReducer(s, { type: 'select', id: 'ammo-hub-01' });
    s = editorReducer(s, { type: 'deletePoi', id: 'ammo-hub-01' });
    expect(s.draft.pois).toHaveLength(0);
    expect(s.selectedId).toBeNull();
  });

  it('undo/redo walk history; new mutation clears future', () => {
    let s = stateWith([]);
    s = editorReducer(s, { type: 'setTool', tool: { kind: 'add', category: 'info' } });
    s = editorReducer(s, { type: 'addPoi', x: 1, y: 1 });
    s = editorReducer(s, { type: 'addPoi', x: 2, y: 2 });
    expect(s.draft.pois).toHaveLength(2);
    s = editorReducer(s, { type: 'undo' });
    expect(s.draft.pois).toHaveLength(1);
    expect(s.future).toHaveLength(1);
    s = editorReducer(s, { type: 'redo' });
    expect(s.draft.pois).toHaveLength(2);
    s = editorReducer(s, { type: 'undo' });
    s = editorReducer(s, { type: 'addPoi', x: 3, y: 3 });
    expect(s.future).toHaveLength(0);
    expect(editorReducer(stateWith([]), { type: 'undo' }).past).toHaveLength(0);
  });

  it('replaceDraft swaps the whole draft, keeps history, clears selection', () => {
    let s = stateWith([p({ id: 'ammo-hub-01', category: 'ammo', zone: 'hub' })]);
    s = editorReducer(s, { type: 'select', id: 'ammo-hub-01' });
    s = editorReducer(s, { type: 'replaceDraft', data: emptyMapData() });
    expect(s.draft.pois).toHaveLength(0);
    expect(s.selectedId).toBeNull();
    expect(s.past).toHaveLength(1);
  });
});
