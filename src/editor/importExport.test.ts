import { describe, expect, it } from 'vitest';
import { emptyMapData } from '../data/schema';
import { parseImportText, serializeMapData } from './importExport';

describe('serializeMapData', () => {
  it('sorts pois by category order then id, pretty prints, trailing newline', () => {
    const text = serializeMapData({
      ...emptyMapData(),
      pois: [
        { id: 'weapon-hub-01', category: 'weapon', zone: 'hub', x: 1, y: 1 },
        { id: 'healing-hub-02', category: 'healing', zone: 'hub', x: 1, y: 1 },
        { id: 'healing-hub-01', category: 'healing', zone: 'hub', x: 1, y: 1 },
      ],
    });
    const data = JSON.parse(text);
    expect(data.pois.map((p: { id: string }) => p.id)).toEqual(['healing-hub-01', 'healing-hub-02', 'weapon-hub-01']);
    expect(text.endsWith('\n')).toBe(true);
    expect(text).toContain('\n  "version": 1');
  });
});

describe('parseImportText', () => {
  it('returns errors for invalid JSON and for schema violations', () => {
    expect(parseImportText('{not json')).toMatchObject({ ok: false });
    const bad = parseImportText(JSON.stringify({ ...emptyMapData(), version: 3 }));
    expect(bad.ok).toBe(false);
  });
  it('round-trips serialized data', () => {
    const r = parseImportText(serializeMapData(emptyMapData()));
    expect(r.ok).toBe(true);
  });
});
