import { describe, expect, it } from 'vitest';
import { buildPoiId, nextPoiId, parsePoiId, POI_ID_PATTERN } from './ids';

describe('buildPoiId', () => {
  it('zero-pads to two digits', () => {
    expect(buildPoiId('healing', 'laboratory', 1)).toBe('healing-laboratory-01');
    expect(buildPoiId('black-box', 'crew-quarters', 12)).toBe('black-box-crew-quarters-12');
  });
});

describe('parsePoiId', () => {
  it('parses a valid id', () => {
    expect(parsePoiId('self-destruct-hub-03')).toEqual({ category: 'self-destruct', zone: 'hub', n: 3 });
  });
  it('rejects unknown category, unknown zone, bad number', () => {
    expect(parsePoiId('bb-machinery-01')).toBeNull();
    expect(parsePoiId('healing-bridge-01')).toBeNull();
    expect(parsePoiId('healing-hub-1')).toBeNull();
    expect(parsePoiId('healing-hub-001')).toBeNull();
  });
  it('POI_ID_PATTERN matches the same set', () => {
    expect(POI_ID_PATTERN.test('weapon-production-07')).toBe(true);
    expect(POI_ID_PATTERN.test('weapon-production-7')).toBe(false);
  });
});

describe('nextPoiId', () => {
  it('starts at 01 when none exist', () => {
    expect(nextPoiId([], 'ammo', 'machinery')).toBe('ammo-machinery-01');
  });
  it('uses the next free number for that category+zone only', () => {
    const ids = ['ammo-machinery-01', 'ammo-machinery-02', 'ammo-hub-05', 'healing-machinery-01'];
    expect(nextPoiId(ids, 'ammo', 'machinery')).toBe('ammo-machinery-03');
    expect(nextPoiId(ids, 'ammo', 'hub')).toBe('ammo-hub-06');
  });
  it('fills the first gap (never renumbers, but reuses a freed slot)', () => {
    expect(nextPoiId(['ammo-hub-01', 'ammo-hub-03'], 'ammo', 'hub')).toBe('ammo-hub-02');
  });
});
