/// <reference types="vitest/config" />
import { readdirSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export const POI_IMAGES_DIR = 'public/media/pics';

/** Exposes `virtual:poi-images` — the POI ids that have a `<id>.webp` in public/media/pics. */
function poiImages(): Plugin {
  const id = 'virtual:poi-images';
  const resolved = '\0' + id;
  return {
    name: 'poi-images',
    resolveId(source) {
      return source === id ? resolved : null;
    },
    load(source) {
      if (source !== resolved) return null;
      const ids = readdirSync(POI_IMAGES_DIR)
        .filter((f) => f.endsWith('.webp'))
        .map((f) => f.slice(0, -'.webp'.length))
        .sort();
      return `export const poiImageIds = ${JSON.stringify(ids)};`;
    },
  };
}

export default defineConfig({
  base: '/hss-hawking-interactive/',
  plugins: [react(), tailwindcss(), poiImages()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
});
