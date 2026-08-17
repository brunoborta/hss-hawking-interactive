import { describe, expect, it } from 'vitest';
import { fromLatLng, IMAGE_BOUNDS, toLatLng } from './coords';

describe('coords', () => {
  it('bounds cover the whole base image', () => {
    expect(IMAGE_BOUNDS).toEqual([[0, 0], [651, 1395]]);
  });
  it('toLatLng flips y (CRS.Simple lat grows upward) and swaps to [lat, lng]', () => {
    expect(toLatLng({ x: 10, y: 20 })).toEqual([631, 10]);
    expect(toLatLng({ x: 0, y: 0 })).toEqual([651, 0]);
    expect(toLatLng({ x: 1395, y: 651 })).toEqual([0, 1395]);
  });
  it('fromLatLng flips back, rounds to 1 decimal and clamps', () => {
    expect(fromLatLng({ lat: 631, lng: 10 })).toEqual({ x: 10, y: 20 });
    expect(fromLatLng({ lat: 630.74, lng: 10.04 })).toEqual({ x: 10, y: 20.3 });
    expect(fromLatLng({ lat: -5, lng: 2000 })).toEqual({ x: 1395, y: 651 });
    expect(fromLatLng({ lat: 700, lng: -3 })).toEqual({ x: 0, y: 0 });
  });
  it('round-trips', () => {
    expect(fromLatLng({ lat: toLatLng({ x: 812.5, y: 333.3 })[0], lng: toLatLng({ x: 812.5, y: 333.3 })[1] })).toEqual({ x: 812.5, y: 333.3 });
  });
});
