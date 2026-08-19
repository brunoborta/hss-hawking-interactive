import { poiImageIds } from 'virtual:poi-images';

const IDS: ReadonlySet<string> = new Set(poiImageIds);
const BASE = import.meta.env.BASE_URL;

/** Images live in public/media/pics/<poi-id>.png — convention, no per-POI config. */
export function hasPoiImage(id: string): boolean {
  return IDS.has(id);
}

export function poiImageSrc(id: string): string {
  return `${BASE}media/pics/${id}.png`;
}
