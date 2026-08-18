import { describe, expect, it } from 'vitest';
import { emptyMapData, parseMapData, safeParseMapData, type Poi } from './schema';

const validPoi: Poi = {
  id: 'healing-laboratory-01',
  category: 'healing',
  zone: 'laboratory',
  x: 500.5,
  y: 400,
};

function withPois(pois: unknown[]) {
  return { ...emptyMapData(), pois };
}

describe('mapDataSchema', () => {
  it('accepts an empty map', () => {
    expect(safeParseMapData(emptyMapData()).ok).toBe(true);
  });

  it('accepts a full valid POI', () => {
    const r = safeParseMapData(
      withPois([
        {
          ...validPoi,
          name: 'Lab Healing Station',
          description: 'Next to the airlock.',
          variant: 'medkit',
          gameModes: ['classic', 'hardcore'],
          media: { src: 'media/healing-laboratory-01.webp', alt: 'Healing station' },
          notes: 'verified in v1.2',
        },
      ]),
    );
    expect(r.ok).toBe(true);
  });

  it('rejects an id that does not match <category>-<zone>-<nn>', () => {
    const r = safeParseMapData(withPois([{ ...validPoi, id: 'bbmachinery' }]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join('\n')).toMatch(/id/);
  });

  it('rejects an id whose parts disagree with category/zone', () => {
    const r = safeParseMapData(withPois([{ ...validPoi, id: 'ammo-laboratory-01' }]));
    expect(r.ok).toBe(false);
    const r2 = safeParseMapData(withPois([{ ...validPoi, id: 'healing-hub-01' }]));
    expect(r2.ok).toBe(false);
  });

  it('rejects duplicate ids', () => {
    const r = safeParseMapData(withPois([validPoi, { ...validPoi, x: 10 }]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join('\n')).toMatch(/duplicate/i);
  });

  it('rejects coordinates outside the image', () => {
    expect(safeParseMapData(withPois([{ ...validPoi, x: -1 }])).ok).toBe(false);
    expect(safeParseMapData(withPois([{ ...validPoi, x: 1395.01 }])).ok).toBe(false);
    expect(safeParseMapData(withPois([{ ...validPoi, y: 652 }])).ok).toBe(false);
  });

  it('rejects long or html descriptions, bad variant/gameModes/media', () => {
    expect(safeParseMapData(withPois([{ ...validPoi, description: 'x'.repeat(281) }])).ok).toBe(false);
    expect(safeParseMapData(withPois([{ ...validPoi, description: '<b>hi</b>' }])).ok).toBe(false);
    expect(safeParseMapData(withPois([{ ...validPoi, variant: 'Shot Gun' }])).ok).toBe(false);
    expect(safeParseMapData(withPois([{ ...validPoi, gameModes: ['Classic'] }])).ok).toBe(false);
    expect(safeParseMapData(withPois([{ ...validPoi, media: { src: 'foo.png' } }])).ok).toBe(false);
  });

  it('rejects wrong version or image size', () => {
    expect(safeParseMapData({ ...emptyMapData(), version: 2 }).ok).toBe(false);
    expect(safeParseMapData({ ...emptyMapData(), image: { width: 100, height: 651 } }).ok).toBe(false);
  });

  it('parseMapData throws a readable error', () => {
    expect(() => parseMapData(withPois([{ ...validPoi, id: 'nope' }]))).toThrow(/pois\.0\.id/);
  });
});
