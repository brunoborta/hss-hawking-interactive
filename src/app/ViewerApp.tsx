import { useMemo, useState } from 'react';
import { publishedData } from '../data/publishedData';
import { Legend } from '../legend/Legend';
import { allVisible, type VisibleSet } from '../legend/filterState';
import { MapView } from '../map/MapView';
import { MarkerLayer } from '../map/MarkerLayer';
import { countByCategory } from './countByCategory';
import { useEditShortcut } from './useEditShortcut';
import { usePermalink } from './usePermalink';

export function ViewerApp() {
  const [visible, setVisible] = useState<VisibleSet>(() => allVisible());
  const counts = useMemo(() => countByCategory(publishedData.pois), []);
  const { openPoiId, onPopupOpen } = usePermalink({ pois: publishedData.pois, setVisible });
  useEditShortcut();

  return (
    <div className="relative h-full w-full">
      <MapView>
        <MarkerLayer
          pois={publishedData.pois}
          visible={visible}
          mode="view"
          openPoiId={openPoiId}
          onPopupOpen={onPopupOpen}
        />
      </MapView>
      <Legend visible={visible} counts={counts} onChange={setVisible} />
    </div>
  );
}
