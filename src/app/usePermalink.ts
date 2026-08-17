import { useEffect, useState } from 'react';
import type { Poi } from '../data/schema';
import { allVisible, soloCategory, type VisibleSet } from '../legend/filterState';
import { parseHash, poiHash } from '../lib/hash';

export function usePermalink({
  pois,
  setVisible,
}: {
  pois: readonly Poi[];
  setVisible: (v: VisibleSet) => void;
}): { openPoiId: string | null; onPopupOpen: (id: string) => void } {
  const [openPoiId, setOpenPoiId] = useState<string | null>(null);

  useEffect(() => {
    const apply = () => {
      const target = parseHash(window.location.hash);
      if (!target) return;
      if (target.kind === 'cat') {
        setVisible(soloCategory(target.id));
        setOpenPoiId(null);
      } else if (pois.some((p) => p.id === target.id)) {
        setVisible(allVisible());
        setOpenPoiId(target.id);
      }
    };
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, [pois, setVisible]);

  const onPopupOpen = (id: string) => {
    if (window.location.hash !== poiHash(id)) window.history.replaceState(null, '', poiHash(id));
  };

  return { openPoiId, onPopupOpen };
}
