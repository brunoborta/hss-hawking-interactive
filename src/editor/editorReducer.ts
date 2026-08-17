import type { CategoryId } from '../data/categories';
import type { MapData, Poi } from '../data/schema';
import type { ZoneId } from '../data/zones';
import { nextPoiId, parsePoiId, POI_ID_PATTERN } from '../lib/ids';

export type Tool = { kind: 'select' } | { kind: 'add'; category: CategoryId };

export interface EditorState {
  draft: MapData;
  selectedId: string | null;
  tool: Tool;
  lastZone: ZoneId;
  past: MapData[];
  future: MapData[];
}

type UpdatePatch = Partial<Omit<Poi, 'id'>> & { id?: string };

export type EditorAction =
  | { type: 'addPoi'; x: number; y: number }
  | { type: 'movePoi'; id: string; x: number; y: number }
  | { type: 'updatePoi'; id: string; patch: UpdatePatch }
  | { type: 'deletePoi'; id: string }
  | { type: 'select'; id: string | null }
  | { type: 'setTool'; tool: Tool }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'replaceDraft'; data: MapData };

export const HISTORY_LIMIT = 100;

export function initialEditorState(published: MapData): EditorState {
  return {
    draft: structuredClone(published),
    selectedId: null,
    tool: { kind: 'select' },
    lastZone: 'hub',
    past: [],
    future: [],
  };
}

const round1 = (v: number) => Math.round(v * 10) / 10;

function pushHistory(state: EditorState, draft: MapData): Pick<EditorState, 'draft' | 'past' | 'future'> {
  const past = [...state.past, state.draft].slice(-HISTORY_LIMIT);
  return { draft, past, future: [] };
}

const OPTIONAL_STRINGS = ['name', 'description', 'variant', 'notes'] as const;

function cleanPatch(patch: UpdatePatch) {
  const out: Record<string, unknown> = { ...patch };
  for (const k of OPTIONAL_STRINGS) {
    if (k in out && typeof out[k] === 'string' && (out[k] as string).trim() === '') out[k] = undefined;
  }
  if ('gameModes' in out && Array.isArray(out.gameModes) && out.gameModes.length === 0) out.gameModes = undefined;
  if ('media' in out && out.media && typeof out.media === 'object' && !(out.media as { src?: string }).src) out.media = undefined;
  return out as Partial<Poi>;
}

function stripUndefined(poi: Poi): Poi {
  return Object.fromEntries(Object.entries(poi).filter(([, v]) => v !== undefined)) as Poi;
}

function isValidExplicitId(id: string, poi: Pick<Poi, 'category' | 'zone'>, otherIds: readonly string[]): boolean {
  if (!POI_ID_PATTERN.test(id)) return false;
  const parsed = parsePoiId(id);
  if (!parsed || parsed.category !== poi.category || parsed.zone !== poi.zone) return false;
  return !otherIds.includes(id);
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'select':
      return { ...state, selectedId: action.id };

    case 'setTool':
      return { ...state, tool: action.tool };

    case 'addPoi': {
      if (state.tool.kind !== 'add') return state;
      const category = state.tool.category;
      const zone = state.lastZone;
      const id = nextPoiId(state.draft.pois.map((p) => p.id), category, zone);
      const poi: Poi = { id, category, zone, x: round1(action.x), y: round1(action.y) };
      const draft: MapData = { ...state.draft, pois: [...state.draft.pois, poi] };
      return { ...state, ...pushHistory(state, draft), selectedId: id };
    }

    case 'movePoi': {
      const idx = state.draft.pois.findIndex((p) => p.id === action.id);
      if (idx < 0) return state;
      const pois = state.draft.pois.slice();
      pois[idx] = { ...pois[idx]!, x: round1(action.x), y: round1(action.y) };
      return { ...state, ...pushHistory(state, { ...state.draft, pois }) };
    }

    case 'updatePoi': {
      const idx = state.draft.pois.findIndex((p) => p.id === action.id);
      if (idx < 0) return state;
      const current = state.draft.pois[idx]!;
      const patch = cleanPatch(action.patch);
      const patchRest: Partial<Poi> = { ...patch };
      delete patchRest.id;
      let next: Poi = { ...stripUndefined({ ...current, ...patchRest } as Poi), id: current.id };
      const keyChanged = next.category !== current.category || next.zone !== current.zone;
      const others = state.draft.pois.filter((p) => p.id !== current.id).map((p) => p.id);
      const requested = typeof action.patch.id === 'string' ? action.patch.id.trim() : '';
      if (requested !== '' && isValidExplicitId(requested, next, others)) {
        next = { ...next, id: requested };
      } else if (keyChanged) {
        next = { ...next, id: nextPoiId(others, next.category, next.zone) };
      }
      const pois = state.draft.pois.slice();
      pois[idx] = next;
      const selectedId = state.selectedId === current.id ? next.id : state.selectedId;
      const lastZone = next.zone !== current.zone ? next.zone : state.lastZone;
      return { ...state, ...pushHistory(state, { ...state.draft, pois }), selectedId, lastZone };
    }

    case 'deletePoi': {
      if (!state.draft.pois.some((p) => p.id === action.id)) return state;
      const pois = state.draft.pois.filter((p) => p.id !== action.id);
      const selectedId = state.selectedId === action.id ? null : state.selectedId;
      return { ...state, ...pushHistory(state, { ...state.draft, pois }), selectedId };
    }

    case 'undo': {
      const prev = state.past.at(-1);
      if (!prev) return state;
      return {
        ...state,
        draft: prev,
        past: state.past.slice(0, -1),
        future: [state.draft, ...state.future],
        selectedId: prev.pois.some((p) => p.id === state.selectedId) ? state.selectedId : null,
      };
    }

    case 'redo': {
      const [next, ...rest] = state.future;
      if (!next) return state;
      return {
        ...state,
        draft: next,
        past: [...state.past, state.draft],
        future: rest,
        selectedId: next.pois.some((p) => p.id === state.selectedId) ? state.selectedId : null,
      };
    }

    case 'replaceDraft':
      return { ...state, ...pushHistory(state, structuredClone(action.data)), selectedId: null };
  }
}
