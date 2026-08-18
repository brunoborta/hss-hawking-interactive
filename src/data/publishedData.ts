import raw from './hawking-map.json';
import { parseMapData, type MapData } from './schema';

export const publishedData: MapData = parseMapData(raw);
