import type { Marker as LeafletMarker } from 'leaflet';
import { useEffect, useRef } from 'react';
import { Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import type { Poi } from '../data/schema';
import { fromLatLng, toLatLng } from '../lib/coords';
import { displayName } from '../lib/display';
import type { VisibleSet } from '../legend/filterState';
import { markerIcon } from './markerIcon';
import { PoiPopup } from './PoiPopup';

interface MarkerLayerProps {
  pois: readonly Poi[];
  visible: VisibleSet;
  mode: 'view' | 'edit';
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onMove?: (id: string, p: { x: number; y: number }) => void;
  onPopupOpen?: (id: string) => void;
  openPoiId?: string | null;
}

function PoiMarker({
  poi,
  mode,
  selected,
  onSelect,
  onMove,
  onPopupOpen,
  shouldOpen,
}: {
  poi: Poi;
  mode: 'view' | 'edit';
  selected: boolean;
  onSelect?: (id: string) => void;
  onMove?: (id: string, p: { x: number; y: number }) => void;
  onPopupOpen?: (id: string) => void;
  shouldOpen: boolean;
}) {
  const ref = useRef<LeafletMarker>(null);
  const map = useMap();

  useEffect(() => {
    if (shouldOpen && ref.current) {
      map.setView(toLatLng(poi), Math.max(map.getZoom(), 1), { animate: true });
      ref.current.openPopup();
    }
  }, [shouldOpen, map, poi]);

  return (
    <Marker
      ref={ref}
      position={toLatLng(poi)}
      icon={markerIcon(poi.category, selected)}
      draggable={mode === 'edit'}
      eventHandlers={{
        click: () => {
          if (mode === 'edit') onSelect?.(poi.id);
        },
        dragend: (e) => {
          const m = e.target as LeafletMarker;
          onMove?.(poi.id, fromLatLng(m.getLatLng()));
        },
        popupopen: () => onPopupOpen?.(poi.id),
      }}
    >
      <Tooltip direction="right" offset={[4, 0]} opacity={0.95}>
        {displayName(poi)}
      </Tooltip>
      {mode === 'view' && (
        <Popup autoPan>
          <PoiPopup poi={poi} />
        </Popup>
      )}
    </Marker>
  );
}

export function MarkerLayer({
  pois,
  visible,
  mode,
  selectedId = null,
  onSelect,
  onMove,
  onPopupOpen,
  openPoiId = null,
}: MarkerLayerProps) {
  return (
    <>
      {pois
        .filter((p) => visible.has(p.category))
        .map((poi) => (
          <PoiMarker
            key={poi.id}
            poi={poi}
            mode={mode}
            selected={poi.id === selectedId}
            onSelect={onSelect}
            onMove={onMove}
            onPopupOpen={onPopupOpen}
            shouldOpen={openPoiId === poi.id}
          />
        ))}
    </>
  );
}
