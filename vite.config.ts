/// <reference types="vitest/config" />
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export const POI_IMAGES_DIR = 'public/media/pics';

/**
 * Exposes `virtual:poi-images` — the POI ids that have a `<id>.webp` in public/media/pics.
 * In dev the directory is watched, so adding/removing an image reloads without a restart.
 */
function poiImages(): Plugin {
  const id = 'virtual:poi-images';
  const resolved = '\0' + id;
  const dir = resolve(POI_IMAGES_DIR);
  return {
    name: 'poi-images',
    configureServer(server) {
      server.watcher.add(dir);
      const onChange = (file: string) => {
        if (!resolve(file).startsWith(dir) || !file.endsWith('.webp')) return;
        const mod = server.moduleGraph.getModuleById(resolved);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', onChange);
      server.watcher.on('unlink', onChange);
    },
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
