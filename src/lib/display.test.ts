import { describe, expect, it } from 'vitest';
import { displayName } from './display';

describe('displayName', () => {
  it('uses name when present', () => {
    expect(displayName({ name: 'Near the Airlock', category: 'healing', zone: 'hub' })).toBe('Near the Airlock');
  });
  it('falls back to "Category — Zone"', () => {
    expect(displayName({ category: 'black-box', zone: 'crew-quarters' })).toBe('Black Box — Crew Quarters');
  });
});
