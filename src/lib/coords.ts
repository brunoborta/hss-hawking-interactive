import { IMAGE_HEIGHT, IMAGE_WIDTH } from '../data/schema';

export type LatLngTuple = [number, number];

export const IMAGE_BOUNDS: [LatLngTuple, LatLngTuple] = [
  [0, 0],
  [IMAGE_HEIGHT, IMAGE_WIDTH],
];

// CRS.Simple latitude grows upward, but image y grows downward, so flip y against IMAGE_HEIGHT.
export function toLatLng(p: { x: number; y: number }): LatLngTuple {
  return [IMAGE_HEIGHT - p.y, p.x];
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function fromLatLng(ll: { lat: number; lng: number }): { x: number; y: number } {
  const round1 = (v: number) => Math.round(v * 10) / 10;
  return {
    x: round1(clamp(ll.lng, 0, IMAGE_WIDTH)),
    y: round1(clamp(IMAGE_HEIGHT - ll.lat, 0, IMAGE_HEIGHT)),
  };
}
