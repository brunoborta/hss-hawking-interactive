import { describe, expect, it } from 'vitest';
import { fromLatLng, IMAGE_BOUNDS, toLatLng } from './coords';

describe('coords', () => {
  it('bounds cover the whole base image', () => {
    expect(IMAGE_BOUNDS).toEqual([[0, 0], [651, 1395]]);
  });
  it('toLatLng swaps to [y, x]', () => {
    expect(toLatLng({ x: 10, y: 20 })).toEqual([20, 10]);
  });
  it('fromLatLng swaps back, rounds to 1 decimal and clamps', () => {
    expect(fromLatLng({ lat: 20.26, lng: 10.04 })).toEqual({ x: 10, y: 20.3 });
    expect(fromLatLng({ lat: -5, lng: 2000 })).toEqual({ x: 1395, y: 0 });
  });
});
