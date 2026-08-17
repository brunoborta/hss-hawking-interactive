import { describe, expect, it } from 'vitest';
import { catHash, parseHash, poiHash } from './hash';

describe('hash', () => {
  it('parses poi and cat targets', () => {
    expect(parseHash('#poi/healing-hub-01')).toEqual({ kind: 'poi', id: 'healing-hub-01' });
    expect(parseHash('poi/healing-hub-01')).toEqual({ kind: 'poi', id: 'healing-hub-01' });
    expect(parseHash('#cat/black-box')).toEqual({ kind: 'cat', id: 'black-box' });
  });
  it('returns null for unknown shapes and unknown categories', () => {
    expect(parseHash('')).toBeNull();
    expect(parseHash('#foo/bar')).toBeNull();
    expect(parseHash('#cat/not-a-cat')).toBeNull();
    expect(parseHash('#poi/')).toBeNull();
  });
  it('serialises', () => {
    expect(poiHash('ammo-hub-02')).toBe('#poi/ammo-hub-02');
    expect(catHash('weapon')).toBe('#cat/weapon');
  });
});
