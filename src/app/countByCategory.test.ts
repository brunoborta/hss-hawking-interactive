import { describe, expect, it } from 'vitest';
import { countByCategory } from './countByCategory';

describe('countByCategory', () => {
  it('counts pois per category', () => {
    const pois = [
      { id: 'ammo-hub-01', category: 'ammo', zone: 'hub', x: 1, y: 1 },
      { id: 'ammo-hub-02', category: 'ammo', zone: 'hub', x: 2, y: 2 },
      { id: 'healing-hub-01', category: 'healing', zone: 'hub', x: 3, y: 3 },
    ] as const;
    expect(countByCategory(pois)).toEqual({ ammo: 2, healing: 1 });
  });
});
