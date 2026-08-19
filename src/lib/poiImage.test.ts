import { describe, expect, it, vi } from 'vitest';

vi.mock('virtual:poi-images', () => ({ poiImageIds: ['ammo-hub-01', 'capsule-hub-02'] }));

import { hasPoiImage, poiImageSrc } from './poiImage';

describe('poiImage', () => {
  it('knows which ids have an image', () => {
    expect(hasPoiImage('ammo-hub-01')).toBe(true);
    expect(hasPoiImage('capsule-hub-03')).toBe(false);
  });

  it('builds the conventional src under media/pics', () => {
    expect(poiImageSrc('ammo-hub-01')).toMatch(/media\/pics\/ammo-hub-01\.png$/);
    expect(poiImageSrc('ammo-hub-01').startsWith(import.meta.env.BASE_URL)).toBe(true);
  });
});
