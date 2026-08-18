import { ImageOverlay } from 'react-leaflet';
import { IMAGE_BOUNDS } from '../lib/coords';

const REFERENCE_IMAGE = `${import.meta.env.BASE_URL}reference.png`;

export function ReferenceLayer({ opacity, visible }: { opacity: number; visible: boolean }) {
  if (!visible) return null;
  return <ImageOverlay url={REFERENCE_IMAGE} bounds={IMAGE_BOUNDS} opacity={opacity} zIndex={5} />;
}
