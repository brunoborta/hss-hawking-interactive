import { CATEGORY_IDS } from '../data/categories';
import { safeParseMapData, type MapData } from '../data/schema';

export function serializeMapData(data: MapData): string {
  const order = new Map(CATEGORY_IDS.map((id, i) => [id, i]));
  const pois = [...data.pois].sort((a, b) => {
    const ca = order.get(a.category) ?? 99;
    const cb = order.get(b.category) ?? 99;
    if (ca !== cb) return ca - cb;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  return JSON.stringify({ ...data, pois }, null, 2) + '\n';
}

export function parseImportText(text: string): { ok: true; data: MapData } | { ok: false; errors: string[] } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (e) {
    return { ok: false, errors: [`Not valid JSON: ${(e as Error).message}`] };
  }
  return safeParseMapData(json);
}

export function downloadJson(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
