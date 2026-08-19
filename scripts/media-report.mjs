// Lists POIs without a public/media/pics/<id>.png and images without a POI.
// Missing images are not errors — this is just a to-do list. Exit code is always 0.
import { readdirSync, readFileSync } from 'node:fs';

const PICS_DIR = 'public/media/pics';
const data = JSON.parse(readFileSync('src/data/hawking-map.json', 'utf8'));
const poiIds = data.pois.map((p) => p.id);
const imageIds = readdirSync(PICS_DIR)
  .filter((f) => f.endsWith('.png'))
  .map((f) => f.slice(0, -'.png'.length));

const missing = poiIds.filter((id) => !imageIds.includes(id));
const orphans = imageIds.filter((id) => !poiIds.includes(id));

console.log(`${poiIds.length} POIs, ${imageIds.length} images in ${PICS_DIR}\n`);
console.log(`POIs without image (${missing.length}):`);
for (const id of missing) console.log(`  - ${id}`);
console.log(`\nImages without POI (${orphans.length}):`);
for (const id of orphans) console.log(`  - ${id}.png`);
