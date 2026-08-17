import { CRS } from 'leaflet';
import { useEffect, type ReactNode } from 'react';
import { ImageOverlay, MapContainer, useMap, useMapEvents } from 'react-leaflet';
import { fromLatLng, IMAGE_BOUNDS } from '../lib/coords';

const BASE_IMAGE = `${import.meta.env.BASE_URL}base.webp`;

function FitAndLimit() {
  const map = useMap();
  useEffect(() => {
    let lastW = 0;
    let lastH = 0;
    const fit = () => {
      map.invalidateSize();
      const fitZoom = map.getBoundsZoom(IMAGE_BOUNDS, false);
      map.setMinZoom(fitZoom);
      map.fitBounds(IMAGE_BOUNDS, { animate: false });
      const el = map.getContainer();
      lastW = el.clientWidth;
      lastH = el.clientHeight;
    };
    fit();
    const ro = new ResizeObserver(() => {
      const el = map.getContainer();
      if (el.clientWidth === lastW && el.clientHeight === lastH) return;
      fit();
    });
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map]);
  return null;
}

function ClickCatcher({ onMapClick }: { onMapClick?: (p: { x: number; y: number }) => void }) {
  useMapEvents({
    click(e) {
      onMapClick?.(fromLatLng(e.latlng));
    },
  });
  return null;
}

export function MapView({
  children,
  onMapClick,
  addMode = false,
}: {
  children?: ReactNode;
  onMapClick?: (p: { x: number; y: number }) => void;
  addMode?: boolean;
}) {
  return (
    <MapContainer
      crs={CRS.Simple}
      bounds={IMAGE_BOUNDS}
      maxBounds={[
        [-120, -160],
        [651 + 120, 1395 + 160],
      ]}
      maxBoundsViscosity={0.8}
      minZoom={-4}
      maxZoom={3}
      zoomSnap={0.25}
      zoomDelta={0.5}
      wheelPxPerZoomLevel={90}
      attributionControl={false}
      className={'h-full w-full' + (addMode ? ' cursor-crosshair' : '')}
    >
      <ImageOverlay url={BASE_IMAGE} bounds={IMAGE_BOUNDS} />
      <FitAndLimit />
      <ClickCatcher onMapClick={onMapClick} />
      {children}
    </MapContainer>
  );
}
