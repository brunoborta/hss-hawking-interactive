import { useState, type ReactNode } from 'react';
import type { Poi } from '../data/schema';
import { displayName } from '../lib/display';
import { hasPoiImage, poiImageSrc } from '../lib/poiImage';

/**
 * The POI's screenshot (public/media/pics/<id>.png), or `fallback` when there is
 * none. Not having an image is a normal state, not an error.
 */
export function PoiImage({ poi, className, fallback = null }: { poi: Poi; className?: string; fallback?: ReactNode }) {
  // keyed by id so a failed load on one POI doesn't hide the next one's image
  return <Img key={poi.id} poi={poi} className={className} fallback={fallback} />;
}

function Img({ poi, className, fallback }: { poi: Poi; className?: string; fallback: ReactNode }) {
  const [broken, setBroken] = useState(false);
  if (broken || !hasPoiImage(poi.id)) return <>{fallback}</>;
  return (
    <img
      src={poiImageSrc(poi.id)}
      alt={displayName(poi)}
      loading="lazy"
      className={className}
      onError={() => setBroken(true)}
    />
  );
}
