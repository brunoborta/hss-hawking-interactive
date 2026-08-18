import { CATEGORY_BY_ID, type CategoryId } from '../data/categories';
import { ZONE_BY_ID } from '../data/zones';
import { IMAGE_HEIGHT, IMAGE_WIDTH, type MapData, type Poi } from '../data/schema';
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
  lastEdit: { type: 'updatePoi'; id: string } | null;
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
    lastEdit: null,
  };
}

const round1 = (v: number) => Math.round(v * 10) / 10;
const clamp = (v: number, max: number) => Math.min(max, Math.max(0, v));

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
      return { ...state, selectedId: action.id, lastEdit: null };

    case 'setTool':
      return { ...state, tool: action.tool, lastEdit: null };

    case 'addPoi': {
      if (state.tool.kind !== 'add') return state;
      const category = state.tool.category;
      const meta = CATEGORY_BY_ID[category];
      if (meta.maxCount !== undefined && state.draft.pois.filter((p) => p.category === category).length >= meta.maxCount) {
        return state;
      }
      const zone = meta.defaults.zone ?? state.lastZone;
      const id = nextPoiId(state.draft.pois.map((p) => p.id), category, zone);
      const poi: Poi = {
        id,
        category,
        zone,
        x: round1(action.x),
        y: round1(action.y),
        name:
          meta.defaults.nameWithZone === false
            ? meta.defaults.namePrefix
            : `${meta.defaults.namePrefix} - ${ZONE_BY_ID[zone].label}`,
        gameModes: [...meta.defaults.gameModes],
        ...(meta.defaults.description ? { description: meta.defaults.description } : {}),
      };
      const draft: MapData = { ...state.draft, pois: [...state.draft.pois, poi] };
      return { ...state, ...pushHistory(state, draft), selectedId: id, lastEdit: null };
    }

    case 'movePoi': {
      const idx = state.draft.pois.findIndex((p) => p.id === action.id);
      if (idx < 0) return state;
      const pois = state.draft.pois.slice();
      const x = round1(clamp(action.x, IMAGE_WIDTH));
      const y = round1(clamp(action.y, IMAGE_HEIGHT));
      pois[idx] = { ...pois[idx]!, x, y };
      return { ...state, ...pushHistory(state, { ...state.draft, pois }), lastEdit: null };
    }

    case 'updatePoi': {
      const idx = state.draft.pois.findIndex((p) => p.id === action.id);
      if (idx < 0) return state;
      const current = state.draft.pois[idx]!;
      const patch = cleanPatch(action.patch);
      const patchRest: Partial<Poi> = { ...patch };
      delete patchRest.id;
      if (typeof patchRest.x === 'number') patchRest.x = round1(clamp(patchRest.x, IMAGE_WIDTH));
      if (typeof patchRest.y === 'number') patchRest.y = round1(clamp(patchRest.y, IMAGE_HEIGHT));
      let next: Poi = { ...stripUndefined({ ...current, ...patchRest } as Poi), id: current.id };
      const keyChanged = next.category !== current.category || next.zone !== current.zone;
      const others = state.draft.pois.filter((p) => p.id !== current.id).map((p) => p.id);
      const requested = typeof action.patch.id === 'string' ? action.patch.id.trim() : '';
      if (requested !== '' && isValidExplicitId(requested, next, others)) {
        next = { ...next, id: requested };
      } else if (keyChanged) {
        next = { ...next, id: nextPoiId(others, next.category, next.zone) };
      }

      if (JSON.stringify(stripUndefined(next)) === JSON.stringify(stripUndefined(current))) {
        return state;
      }

      const pois = state.draft.pois.slice();
      pois[idx] = next;
      const selectedId = state.selectedId === current.id ? next.id : state.selectedId;
      const lastZone = next.zone !== current.zone ? next.zone : state.lastZone;
      const draft: MapData = { ...state.draft, pois };
      const lastEdit: EditorState['lastEdit'] = { type: 'updatePoi', id: next.id };

      if (state.lastEdit?.type === 'updatePoi' && state.lastEdit.id === action.id && state.past.length > 0) {
        return { ...state, draft, future: [], selectedId, lastZone, lastEdit };
      }

      return { ...state, ...pushHistory(state, draft), selectedId, lastZone, lastEdit };
    }

    case 'deletePoi': {
      if (!state.draft.pois.some((p) => p.id === action.id)) return state;
      const pois = state.draft.pois.filter((p) => p.id !== action.id);
      const selectedId = state.selectedId === action.id ? null : state.selectedId;
      return { ...state, ...pushHistory(state, { ...state.draft, pois }), selectedId, lastEdit: null };
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
        lastEdit: null,
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
        lastEdit: null,
      };
    }

    case 'replaceDraft':
      return { ...state, ...pushHistory(state, structuredClone(action.data)), selectedId: null, lastEdit: null };
  }
}
