# HSS Hawking Interactive Map — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the MVP of a static, standalone interactive map of the HSS Hawking (from *Species Unknown*) with an in-game-styled legend filter, POI popups, and a lazy-loaded `?edit` mode that authors `hawking-map.json`.

**Architecture:** Vite + React SPA. `map/` renders any `MapData` with Leaflet (`CRS.Simple`, image overlay, SVG `divIcon` markers). `data/schema.ts` (Zod) is the single definition of the JSON format and is used at load, on import, and in tests/CI. `editor/` is a code-split module that owns a draft `MapData` through a pure, unit-tested reducer persisted to `localStorage`, and exports/imports the same JSON the viewer loads. Two one-off Python tools produce the upscaled base and the perspective-rectified in-game screenshot used as an authoring reference layer.

**Tech Stack:** Vite 8, React 19, TypeScript 5.9 (strict), Leaflet 1.9 + react-leaflet 5, Zod 4, Zustand 5, Tailwind 4 (`@tailwindcss/vite`), Vitest 4 + Testing Library, ESLint 10 + Prettier 3, GitHub Actions → GitHub Pages, Python 3.12 (OpenCV, Pillow) in `tools/`.

**Spec:** `docs/superpowers/specs/2026-08-17-hss-hawking-interactive-map-design.md`

## Global Constraints

- Static site, no backend, no accounts. Deployed to GitHub Pages at `https://brunoborta.github.io/hss-hawking-interactive/` → Vite `base: '/hss-hawking-interactive/'`.
- POI coordinates are pixels of the original base image, `1395×651`, origin top-left. Leaflet `[lat, lng] = [IMAGE_HEIGHT - y, x]` (CRS.Simple lat grows upward); conversion only in `src/lib/coords.ts`.
- Category ids (closed list, legend order): `healing`, `ammo`, `capsule`, `info`, `self-destruct`, `black-box`, `pipe-lever`, `weapon`.
- Zone ids (closed list): `shuttle-bay`, `production`, `laboratory`, `crew-quarters`, `machinery`, `hub`.
- POI `id` = `<category>-<zone>-<nn>` (two-digit, zero-padded); id parts must equal the POI's `category`/`zone`; ids unique; never renumber existing ids.
- `description` ≤ 280 chars, plain text (no `<`/`>`). `variant` and each `gameModes[]` entry kebab-case (`^[a-z0-9]+(-[a-z0-9]+)*$`). `media.src` matches `^media/[a-z0-9-]+\.(webp|png|jpg|jpeg|gif|mp4)$`.
- All UI/content strings in English. Icons are hand-drawn SVG; no game textures shipped.
- Editor code is only loaded when `?edit` is in the URL (`React.lazy`).
- Legend defaults to all categories visible on every load; filter state is not persisted.
- Tests: Vitest (jsdom). Do not test Leaflet itself. Every task ends with `npm test`, `npm run typecheck`, `npm run lint` green.
- Commit after each task with a conventional-commit message. Do not commit `node_modules`, `dist`.
- Node 24 / npm 11 / Python 3.12 are installed on the dev machine (Windows 11, PowerShell). Use PowerShell-compatible commands (`;` not `&&`).

---

## File structure (target)

```
.
├── .github/workflows/ci.yml            PR: lint, typecheck, test
├── .github/workflows/deploy.yml        main: ci + build + Pages deploy
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts                      vite + react + tailwind + vitest config
├── eslint.config.js
├── .prettierrc
├── public/
│   ├── base.webp                       upscaled base (Task 9); placeholder copy of source until then
│   ├── reference.png                   rectified in-game screenshot (Task 9)
│   └── media/                          optional POI images (empty, .gitkeep)
├── src/
│   ├── main.tsx                        mounts <App/>
│   ├── index.css                       tailwind import + leaflet overrides + theme tokens
│   ├── app/App.tsx                     picks ViewerApp or lazy EditorApp
│   ├── app/ViewerApp.tsx               visitor composition
│   ├── app/useEditShortcut.ts          'E' key → ?edit
│   ├── data/categories.ts              CATEGORY_IDS, CATEGORIES, CATEGORY_BY_ID
│   ├── data/zones.ts                   ZONE_IDS, ZONES, ZONE_BY_ID
│   ├── data/schema.ts                  zod schema, parseMapData/safeParseMapData, types
│   ├── data/hawking-map.json           published data
│   ├── data/publishedData.ts           parsed+validated published MapData
│   ├── icons/index.ts                  ICON_SVG record + CategoryIcon component
│   ├── lib/ids.ts                      buildPoiId/parsePoiId/nextPoiId
│   ├── lib/coords.ts                   toLatLng/fromLatLng/IMAGE_BOUNDS
│   ├── lib/display.ts                  displayName(poi)
│   ├── lib/hash.ts                     parseHash/poiHash/catHash (Task 12)
│   ├── legend/filterState.ts           VisibleSet helpers
│   ├── legend/Legend.tsx               in-game-styled legend + mobile drawer
│   ├── map/MapView.tsx                 MapContainer + BaseLayer + FitBounds + click handler
│   ├── map/MarkerLayer.tsx             markers (viewer popups or editor select/drag)
│   ├── map/PoiPopup.tsx                popup content
│   ├── map/ReferenceLayer.tsx          rectified screenshot overlay (editor)
│   ├── editor/editorReducer.ts         pure reducer + types
│   ├── editor/useEditorStore.ts        zustand + persist
│   ├── editor/importExport.ts          serializeMapData/parseImportText/downloadJson
│   ├── editor/EditorApp.tsx            editor composition (lazy chunk)
│   ├── editor/EditorPanel.tsx          right dock: tools, reference, inspector, list, actions
│   ├── editor/EditorTools.tsx
│   ├── editor/Inspector.tsx
│   ├── editor/PoiList.tsx
│   ├── editor/useEditorShortcuts.ts    Delete/Backspace/Esc/undo/redo
│   └── test/setup.ts                   jest-dom
├── tools/
│   ├── README.md
│   ├── requirements.txt
│   ├── source/hawking-base.webp        original 1395×651
│   ├── source/ingame-screenshot.png    original photo
│   ├── rectify-points.json             correspondences (screenshot px → base px)
│   ├── pick_points.py                  prints clicked coordinates
│   ├── rectify.py                      homography → public/reference.png (+ preview)
│   └── upscale.py                      Lanczos 4× fallback → public/base.webp
├── docs/DATA-GUIDELINES.md
└── README.md
```

---

### Task 1: Project scaffold and toolchain

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `eslint.config.js`, `.prettierrc`, `.prettierignore`, `src/main.tsx`, `src/index.css`, `src/app/App.tsx`, `src/test/setup.ts`, `src/app/App.test.tsx`, `public/media/.gitkeep`
- Move: `fan-concept-hss-hawking-production-logistics-area-v0-yz5qszmo023h1.webp` → `tools/source/hawking-base.webp`; `Screenshot 2026-08-17 204433.png` → `tools/source/ingame-screenshot.png`
- Copy: `tools/source/hawking-base.webp` → `public/base.webp` (placeholder until Task 9)
- Modify: `.gitignore` (add `dist`, `*.local`)

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `preview`, `test`, `test:watch`, `lint`, `format`, `typecheck`, `validate:data` (the last one is wired in Task 3 but declared here). Vitest configured with jsdom + `src/test/setup.ts`. Tailwind available via `@import "tailwindcss"` in `src/index.css`.

- [ ] **Step 1: Move source images and create the placeholder base**

```powershell
New-Item -ItemType Directory -Force tools/source, public/media | Out-Null
git mv "fan-concept-hss-hawking-production-logistics-area-v0-yz5qszmo023h1.webp" tools/source/hawking-base.webp 2>$null; if (-not $?) { Move-Item "fan-concept-hss-hawking-production-logistics-area-v0-yz5qszmo023h1.webp" tools/source/hawking-base.webp }
git mv "Screenshot 2026-08-17 204433.png" tools/source/ingame-screenshot.png 2>$null; if (-not $?) { Move-Item "Screenshot 2026-08-17 204433.png" tools/source/ingame-screenshot.png }
Copy-Item tools/source/hawking-base.webp public/base.webp
New-Item -ItemType File public/media/.gitkeep | Out-Null
```

(The images were untracked, so `Move-Item` is the branch that runs.)

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "hss-hawking-interactive",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "format": "prettier --write .",
    "typecheck": "tsc --noEmit",
    "validate:data": "vitest run src/data/publishedData.test.ts"
  },
  "dependencies": {
    "leaflet": "^1.9.4",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-leaflet": "^5.0.0",
    "zod": "^4.0.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.0",
    "@tailwindcss/vite": "^4.1.0",
    "@testing-library/dom": "^10.4.0",
    "@testing-library/jest-dom": "^7.0.0",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.0",
    "@types/leaflet": "^1.9.20",
    "@types/node": "^24.0.0",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "@vitejs/plugin-react": "^6.0.0",
    "eslint": "^10.0.0",
    "eslint-plugin-react-hooks": "^7.0.0",
    "eslint-plugin-react-refresh": "^0.5.0",
    "globals": "^17.0.0",
    "jsdom": "^30.0.0",
    "prettier": "^3.6.0",
    "tailwindcss": "^4.1.0",
    "typescript": "~5.9.3",
    "typescript-eslint": "^8.60.0",
    "vite": "^8.0.0",
    "vitest": "^4.0.0"
  }
}
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["vite/client", "node"]
  },
  "include": ["src", "vite.config.ts"]
}
```

- [ ] **Step 4: Write `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/hss-hawking-interactive/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
});
```

- [ ] **Step 5: Write `index.html`, `src/main.tsx`, `src/index.css`, `src/app/App.tsx`, `src/test/setup.ts`**

`index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>HSS Hawking — Interactive Map</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import './index.css';
import { App } from './app/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/index.css`:
```css
@import 'tailwindcss';

@theme {
  --color-hull: #0b2a33;
  --color-panel: #061a21;
  --color-cyan-line: #6fd6e8;
  --font-display: 'Rajdhani', 'Segoe UI', system-ui, sans-serif;
}

html,
body,
#root {
  height: 100%;
  margin: 0;
  background: var(--color-hull);
  color: #dfeff3;
  font-family: var(--font-display);
}

/* Leaflet theme overrides */
.leaflet-container {
  background: var(--color-hull);
  font-family: inherit;
}
.leaflet-control-zoom a {
  background: rgba(6, 26, 33, 0.85);
  color: var(--color-cyan-line);
  border-color: rgba(111, 214, 232, 0.35);
}
.leaflet-popup-content-wrapper,
.leaflet-popup-tip {
  background: rgba(6, 26, 33, 0.95);
  color: #dfeff3;
  border: 1px solid rgba(111, 214, 232, 0.5);
}
.leaflet-popup-content {
  margin: 12px 14px;
}
.poi-marker {
  background: none;
  border: none;
  transition: transform 120ms ease;
}
.poi-marker:hover {
  transform: scale(1.15);
  z-index: 1000 !important;
}
.poi-marker.is-selected svg {
  filter: drop-shadow(0 0 6px #fff);
}
```

`src/app/App.tsx` (temporary — replaced in Task 8):
```tsx
export function App() {
  return <h1 className="p-4 text-xl">HSS Hawking — Interactive Map</h1>;
}
```

`src/test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 6: Write `eslint.config.js`, `.prettierrc`, `.prettierignore`; extend `.gitignore`**

`eslint.config.js`:
```js
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'tools'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
);
```

`.prettierrc`:
```json
{ "singleQuote": true, "semi": true, "printWidth": 100, "trailingComma": "all" }
```

`.prettierignore`:
```
dist
node_modules
public
tools/source
*.webp
*.png
```

Append to `.gitignore`:
```
dist
*.local
```

- [ ] **Step 7: Write a smoke test `src/app/App.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders the title', () => {
    render(<App />);
    expect(screen.getByRole('heading')).toHaveTextContent('HSS Hawking');
  });
});
```

- [ ] **Step 8: Install and run everything**

Run: `npm install; npm test; npm run typecheck; npm run lint; npm run build`
Expected: install succeeds; 1 test passes; typecheck/lint clean; `dist/` produced. If `npm install` reports a peer conflict, read it and adjust the offending caret range — do not use `--legacy-peer-deps`.

- [ ] **Step 9: Commit**

```powershell
git add -A
git commit -m "chore: scaffold Vite + React + TS + Tailwind + Vitest toolchain"
```

---

### Task 2: Categories, zones and POI id helpers

**Files:**
- Create: `src/data/categories.ts`, `src/data/zones.ts`, `src/lib/ids.ts`, `src/lib/ids.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // categories.ts
  export const CATEGORY_IDS = ['healing','ammo','capsule','info','self-destruct','black-box','pipe-lever','weapon'] as const;
  export type CategoryId = (typeof CATEGORY_IDS)[number];
  export interface CategoryMeta { id: CategoryId; label: string; color: string; }
  export const CATEGORIES: readonly CategoryMeta[];          // legend order
  export const CATEGORY_BY_ID: Record<CategoryId, CategoryMeta>;
  export function isCategoryId(v: unknown): v is CategoryId;
  // zones.ts
  export const ZONE_IDS = ['shuttle-bay','production','laboratory','crew-quarters','machinery','hub'] as const;
  export type ZoneId = (typeof ZONE_IDS)[number];
  export interface ZoneMeta { id: ZoneId; label: string; }
  export const ZONES: readonly ZoneMeta[];
  export const ZONE_BY_ID: Record<ZoneId, ZoneMeta>;
  export function isZoneId(v: unknown): v is ZoneId;
  // ids.ts
  export function buildPoiId(category: CategoryId, zone: ZoneId, n: number): string;
  export function parsePoiId(id: string): { category: CategoryId; zone: ZoneId; n: number } | null;
  export function nextPoiId(existingIds: Iterable<string>, category: CategoryId, zone: ZoneId): string;
  export const POI_ID_PATTERN: RegExp;  // ^(<cats>)-(<zones>)-(\d{2})$
  ```

- [ ] **Step 1: Write the failing tests `src/lib/ids.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { buildPoiId, nextPoiId, parsePoiId, POI_ID_PATTERN } from './ids';

describe('buildPoiId', () => {
  it('zero-pads to two digits', () => {
    expect(buildPoiId('healing', 'laboratory', 1)).toBe('healing-laboratory-01');
    expect(buildPoiId('black-box', 'crew-quarters', 12)).toBe('black-box-crew-quarters-12');
  });
});

describe('parsePoiId', () => {
  it('parses a valid id', () => {
    expect(parsePoiId('self-destruct-hub-03')).toEqual({ category: 'self-destruct', zone: 'hub', n: 3 });
  });
  it('rejects unknown category, unknown zone, bad number', () => {
    expect(parsePoiId('bb-machinery-01')).toBeNull();
    expect(parsePoiId('healing-bridge-01')).toBeNull();
    expect(parsePoiId('healing-hub-1')).toBeNull();
    expect(parsePoiId('healing-hub-001')).toBeNull();
  });
  it('POI_ID_PATTERN matches the same set', () => {
    expect(POI_ID_PATTERN.test('weapon-production-07')).toBe(true);
    expect(POI_ID_PATTERN.test('weapon-production-7')).toBe(false);
  });
});

describe('nextPoiId', () => {
  it('starts at 01 when none exist', () => {
    expect(nextPoiId([], 'ammo', 'machinery')).toBe('ammo-machinery-01');
  });
  it('uses the next free number for that category+zone only', () => {
    const ids = ['ammo-machinery-01', 'ammo-machinery-02', 'ammo-hub-05', 'healing-machinery-01'];
    expect(nextPoiId(ids, 'ammo', 'machinery')).toBe('ammo-machinery-03');
    expect(nextPoiId(ids, 'ammo', 'hub')).toBe('ammo-hub-06');
  });
  it('always uses max+1 — freed numbers are never reused', () => {
    expect(nextPoiId(['ammo-hub-01', 'ammo-hub-03'], 'ammo', 'hub')).toBe('ammo-hub-04');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/ids.test.ts`
Expected: FAIL — cannot resolve `./ids`.

- [ ] **Step 3: Write `src/data/categories.ts` and `src/data/zones.ts`**

`src/data/categories.ts`:
```ts
export const CATEGORY_IDS = [
  'healing',
  'ammo',
  'capsule',
  'info',
  'self-destruct',
  'black-box',
  'pipe-lever',
  'weapon',
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  color: string;
}

export const CATEGORIES: readonly CategoryMeta[] = [
  { id: 'healing', label: 'Healing Point', color: '#4ade80' },
  { id: 'ammo', label: 'Ammunition', color: '#facc15' },
  { id: 'capsule', label: 'Respawn Capsule', color: '#e5e7eb' },
  { id: 'info', label: 'Information', color: '#f8fafc' },
  { id: 'self-destruct', label: 'Self-Destruction', color: '#f87171' },
  { id: 'black-box', label: 'Black Box', color: '#c084fc' },
  { id: 'pipe-lever', label: 'Pipe Lever', color: '#7dd3fc' },
  { id: 'weapon', label: 'Weapon', color: '#fb923c' },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<
  CategoryId,
  CategoryMeta
>;

export function isCategoryId(v: unknown): v is CategoryId {
  return typeof v === 'string' && (CATEGORY_IDS as readonly string[]).includes(v);
}
```

`src/data/zones.ts`:
```ts
export const ZONE_IDS = [
  'shuttle-bay',
  'production',
  'laboratory',
  'crew-quarters',
  'machinery',
  'hub',
] as const;

export type ZoneId = (typeof ZONE_IDS)[number];

export interface ZoneMeta {
  id: ZoneId;
  label: string;
}

export const ZONES: readonly ZoneMeta[] = [
  { id: 'shuttle-bay', label: 'Shuttle Bay' },
  { id: 'production', label: 'Production' },
  { id: 'laboratory', label: 'Laboratory' },
  { id: 'crew-quarters', label: 'Crew Quarters' },
  { id: 'machinery', label: 'Machinery' },
  { id: 'hub', label: 'Hub' },
];

export const ZONE_BY_ID = Object.fromEntries(ZONES.map((z) => [z.id, z])) as Record<ZoneId, ZoneMeta>;

export function isZoneId(v: unknown): v is ZoneId {
  return typeof v === 'string' && (ZONE_IDS as readonly string[]).includes(v);
}
```

- [ ] **Step 4: Write `src/lib/ids.ts`**

```ts
import { CATEGORY_IDS, isCategoryId, type CategoryId } from '../data/categories';
import { ZONE_IDS, isZoneId, type ZoneId } from '../data/zones';

const cats = CATEGORY_IDS.join('|');
const zones = ZONE_IDS.join('|');
export const POI_ID_PATTERN = new RegExp(`^(${cats})-(${zones})-(\\d{2})$`);

export function buildPoiId(category: CategoryId, zone: ZoneId, n: number): string {
  return `${category}-${zone}-${String(n).padStart(2, '0')}`;
}

export function parsePoiId(id: string): { category: CategoryId; zone: ZoneId; n: number } | null {
  const m = POI_ID_PATTERN.exec(id);
  if (!m) return null;
  const [, category, zone, num] = m;
  if (!isCategoryId(category) || !isZoneId(zone) || num === undefined) return null;
  return { category, zone, n: Number(num) };
}

export function nextPoiId(existingIds: Iterable<string>, category: CategoryId, zone: ZoneId): string {
  let max = 0;
  for (const id of existingIds) {
    const parsed = parsePoiId(id);
    if (parsed && parsed.category === category && parsed.zone === zone) max = Math.max(max, parsed.n);
  }
  return buildPoiId(category, zone, max + 1);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/ids.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 6: Commit**

```powershell
git add src/data/categories.ts src/data/zones.ts src/lib/ids.ts src/lib/ids.test.ts
git commit -m "feat(data): add category/zone registries and POI id helpers"
```

---

### Task 3: Data schema, published data file, data guidelines

**Files:**
- Create: `src/data/schema.ts`, `src/data/schema.test.ts`, `src/data/hawking-map.json`, `src/data/publishedData.ts`, `src/data/publishedData.test.ts`, `docs/DATA-GUIDELINES.md`

**Interfaces:**
- Consumes: `CategoryId`, `ZoneId`, `POI_ID_PATTERN`, `parsePoiId` (Task 2).
- Produces:
  ```ts
  export const IMAGE_WIDTH = 1395; export const IMAGE_HEIGHT = 651;
  export const poiSchema; export const mapDataSchema;
  export type Poi = z.infer<typeof poiSchema>;         // { id, category, zone, x, y, name?, description?, variant?, gameModes?, media?, notes? }
  export type MapData = z.infer<typeof mapDataSchema>; // { version: 1, image: {width, height}, pois: Poi[] }
  export function parseMapData(input: unknown): MapData;   // throws Error with joined issue messages
  export function safeParseMapData(input: unknown): { ok: true; data: MapData } | { ok: false; errors: string[] };
  export function emptyMapData(): MapData;
  // publishedData.ts
  export const publishedData: MapData;   // hawking-map.json parsed via parseMapData at module load
  ```

- [ ] **Step 1: Write the failing tests `src/data/schema.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { emptyMapData, parseMapData, safeParseMapData, type Poi } from './schema';

const validPoi: Poi = {
  id: 'healing-laboratory-01',
  category: 'healing',
  zone: 'laboratory',
  x: 500.5,
  y: 400,
};

function withPois(pois: unknown[]) {
  return { ...emptyMapData(), pois };
}

describe('mapDataSchema', () => {
  it('accepts an empty map', () => {
    expect(safeParseMapData(emptyMapData()).ok).toBe(true);
  });

  it('accepts a full valid POI', () => {
    const r = safeParseMapData(
      withPois([
        {
          ...validPoi,
          name: 'Lab Healing Station',
          description: 'Next to the airlock.',
          variant: 'medkit',
          gameModes: ['classic', 'hardcore'],
          media: { src: 'media/healing-laboratory-01.webp', alt: 'Healing station' },
          notes: 'verified in v1.2',
        },
      ]),
    );
    expect(r.ok).toBe(true);
  });

  it('rejects an id that does not match <category>-<zone>-<nn>', () => {
    const r = safeParseMapData(withPois([{ ...validPoi, id: 'bbmachinery' }]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join('\n')).toMatch(/id/);
  });

  it('rejects an id whose parts disagree with category/zone', () => {
    const r = safeParseMapData(withPois([{ ...validPoi, id: 'ammo-laboratory-01' }]));
    expect(r.ok).toBe(false);
    const r2 = safeParseMapData(withPois([{ ...validPoi, id: 'healing-hub-01' }]));
    expect(r2.ok).toBe(false);
  });

  it('rejects duplicate ids', () => {
    const r = safeParseMapData(withPois([validPoi, { ...validPoi, x: 10 }]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join('\n')).toMatch(/duplicate/i);
  });

  it('rejects coordinates outside the image', () => {
    expect(safeParseMapData(withPois([{ ...validPoi, x: -1 }])).ok).toBe(false);
    expect(safeParseMapData(withPois([{ ...validPoi, x: 1395.01 }])).ok).toBe(false);
    expect(safeParseMapData(withPois([{ ...validPoi, y: 652 }])).ok).toBe(false);
  });

  it('rejects long or html descriptions, bad variant/gameModes/media', () => {
    expect(safeParseMapData(withPois([{ ...validPoi, description: 'x'.repeat(281) }])).ok).toBe(false);
    expect(safeParseMapData(withPois([{ ...validPoi, description: '<b>hi</b>' }])).ok).toBe(false);
    expect(safeParseMapData(withPois([{ ...validPoi, variant: 'Shot Gun' }])).ok).toBe(false);
    expect(safeParseMapData(withPois([{ ...validPoi, gameModes: ['Classic'] }])).ok).toBe(false);
    expect(safeParseMapData(withPois([{ ...validPoi, media: { src: 'foo.png' } }])).ok).toBe(false);
  });

  it('rejects wrong version or image size', () => {
    expect(safeParseMapData({ ...emptyMapData(), version: 2 }).ok).toBe(false);
    expect(safeParseMapData({ ...emptyMapData(), image: { width: 100, height: 651 } }).ok).toBe(false);
  });

  it('parseMapData throws a readable error', () => {
    expect(() => parseMapData(withPois([{ ...validPoi, id: 'nope' }]))).toThrow(/pois\.0\.id/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/data/schema.test.ts`
Expected: FAIL — cannot resolve `./schema`.

- [ ] **Step 3: Write `src/data/schema.ts`**

```ts
import { z } from 'zod';
import { CATEGORY_IDS } from './categories';
import { ZONE_IDS } from './zones';
import { parsePoiId, POI_ID_PATTERN } from '../lib/ids';

export const IMAGE_WIDTH = 1395;
export const IMAGE_HEIGHT = 651;

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MEDIA_SRC = /^media\/[a-z0-9-]+\.(webp|png|jpg|jpeg|gif|mp4)$/;

export const poiSchema = z
  .object({
    id: z.string().regex(POI_ID_PATTERN, 'id must be <category>-<zone>-<nn>'),
    category: z.enum(CATEGORY_IDS),
    zone: z.enum(ZONE_IDS),
    x: z.number().min(0).max(IMAGE_WIDTH),
    y: z.number().min(0).max(IMAGE_HEIGHT),
    name: z.string().trim().min(1).max(80).optional(),
    description: z
      .string()
      .trim()
      .max(280, 'description must be at most 280 characters')
      .refine((s) => !/[<>]/.test(s), 'description must be plain text (no HTML)')
      .optional(),
    variant: z.string().regex(KEBAB, 'variant must be kebab-case').optional(),
    gameModes: z.array(z.string().regex(KEBAB, 'gameModes entries must be kebab-case')).optional(),
    media: z
      .object({
        src: z.string().regex(MEDIA_SRC, 'media.src must look like media/<id>.<ext>'),
        alt: z.string().trim().max(200).optional(),
      })
      .optional(),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((poi, ctx) => {
    const parsed = parsePoiId(poi.id);
    if (!parsed) return; // regex already reported
    if (parsed.category !== poi.category) {
      ctx.addIssue({ code: 'custom', path: ['id'], message: `id category "${parsed.category}" does not match category "${poi.category}"` });
    }
    if (parsed.zone !== poi.zone) {
      ctx.addIssue({ code: 'custom', path: ['id'], message: `id zone "${parsed.zone}" does not match zone "${poi.zone}"` });
    }
  });

export const mapDataSchema = z
  .object({
    version: z.literal(1),
    image: z.object({ width: z.literal(IMAGE_WIDTH), height: z.literal(IMAGE_HEIGHT) }),
    pois: z.array(poiSchema),
  })
  .superRefine((data, ctx) => {
    const seen = new Set<string>();
    data.pois.forEach((poi, i) => {
      if (seen.has(poi.id)) {
        ctx.addIssue({ code: 'custom', path: ['pois', i, 'id'], message: `duplicate id "${poi.id}"` });
      }
      seen.add(poi.id);
    });
  });

export type Poi = z.infer<typeof poiSchema>;
export type MapData = z.infer<typeof mapDataSchema>;

export function emptyMapData(): MapData {
  return { version: 1, image: { width: IMAGE_WIDTH, height: IMAGE_HEIGHT }, pois: [] };
}

function formatIssues(issues: z.core.$ZodIssue[]): string[] {
  return issues.map((issue) => `${issue.path.map(String).join('.') || '(root)'}: ${issue.message}`);
}

export function safeParseMapData(
  input: unknown,
): { ok: true; data: MapData } | { ok: false; errors: string[] } {
  const result = mapDataSchema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, errors: formatIssues(result.error.issues) };
}

export function parseMapData(input: unknown): MapData {
  const r = safeParseMapData(input);
  if (r.ok) return r.data;
  throw new Error(`Invalid map data:\n${r.errors.join('\n')}`);
}
```

Note: Zod 4 exposes issue types under `z.core.$ZodIssue`; if `tsc` complains, use `z.ZodError['issues']` as the parameter type instead (`function formatIssues(issues: z.ZodError['issues'])`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/data/schema.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Create the published data file and its loader + validation test**

`src/data/hawking-map.json`:
```json
{
  "version": 1,
  "image": { "width": 1395, "height": 651 },
  "pois": []
}
```

`src/data/publishedData.ts`:
```ts
import raw from './hawking-map.json';
import { parseMapData, type MapData } from './schema';

export const publishedData: MapData = parseMapData(raw);
```

`src/data/publishedData.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import raw from './hawking-map.json';
import { safeParseMapData } from './schema';

describe('hawking-map.json', () => {
  it('conforms to the schema', () => {
    const r = safeParseMapData(raw);
    if (!r.ok) throw new Error(r.errors.join('\n'));
    expect(r.ok).toBe(true);
  });
});
```

Run: `npm run validate:data`
Expected: PASS.

- [ ] **Step 6: Write `docs/DATA-GUIDELINES.md`**

```markdown
# Data guidelines — `src/data/hawking-map.json`

The map loads one JSON file. The editor (`?edit`) writes it; CI validates it with the same
schema (`src/data/schema.ts`). Anything that violates these rules fails validation.

## POI fields

| Field | Required | Rule | Good | Bad |
|---|---|---|---|---|
| `id` | yes | `<category>-<zone>-<nn>`, generated by the editor, **never renumbered once published** | `black-box-laboratory-01` | `bbmachinery`, `black-box-lab-1` |
| `category` | yes | one of `healing, ammo, capsule, info, self-destruct, black-box, pipe-lever, weapon` | `pipe-lever` | `lever` |
| `zone` | yes | one of `shuttle-bay, production, laboratory, crew-quarters, machinery, hub` (`hub` = central spine/corridors) | `machinery` | `engine-room` |
| `x`, `y` | yes | pixels of the 1395×651 base image | `812.5` | `-3` |
| `name` | no | Title Case, English, don't repeat the category. Omitted → "Category — Zone" | `Near the Airlock` | `healing point near airlock` |
| `description` | no | 1–2 sentences, plain text, ≤ 280 chars, no HTML | `Spawns only after the reactor puzzle.` | `<b>Important!</b>` |
| `variant` | no | kebab-case; for weapons, the weapon type | `shotgun` | `Shot Gun` |
| `gameModes` | no | kebab-case list; absent = all modes | `["classic"]` | `["Classic Mode"]` |
| `media.src` | no | `media/<id>.<ext>`, file placed in `public/media/` | `media/black-box-laboratory-01.gif` | `screenshots/bb.gif` |
| `notes` | no | maintainer notes, never shown | | |

## Workflow

1. Open the site with `?edit`, place/edit POIs, **Export JSON**.
2. Replace `src/data/hawking-map.json` with the export, run `npm run validate:data`.
3. Commit. CI validates again and deploys.

Contributors without Git: export the JSON and send it to the maintainer.
```

- [ ] **Step 7: Full check and commit**

Run: `npm test; npm run typecheck; npm run lint`
Expected: all green.

```powershell
git add src/data docs/DATA-GUIDELINES.md
git commit -m "feat(data): add zod schema, published data loader and data guidelines"
```

---

### Task 4: Coordinate and display helpers

**Files:**
- Create: `src/lib/coords.ts`, `src/lib/coords.test.ts`, `src/lib/display.ts`, `src/lib/display.test.ts`

**Interfaces:**
- Consumes: `IMAGE_WIDTH`, `IMAGE_HEIGHT`, `Poi` (Task 3), `CATEGORY_BY_ID`, `ZONE_BY_ID` (Task 2).
- Produces:
  ```ts
  export type LatLngTuple = [number, number];
  export const IMAGE_BOUNDS: [LatLngTuple, LatLngTuple]; // [[0,0],[IMAGE_HEIGHT, IMAGE_WIDTH]]
  export function toLatLng(p: { x: number; y: number }): LatLngTuple;   // [IMAGE_HEIGHT - y, x]
  export function fromLatLng(ll: { lat: number; lng: number }): { x: number; y: number }; // clamped to image, 1 decimal
  export function displayName(poi: Pick<Poi,'name'|'category'|'zone'>): string; // name ?? "<Category label> — <Zone label>"
  ```

- [ ] **Step 1: Write failing tests**

`src/lib/coords.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { fromLatLng, IMAGE_BOUNDS, toLatLng } from './coords';

describe('coords', () => {
  it('bounds cover the whole base image', () => {
    expect(IMAGE_BOUNDS).toEqual([[0, 0], [651, 1395]]);
  });
  it('toLatLng flips y (CRS.Simple lat grows upward) and swaps to [lat, lng]', () => {
    expect(toLatLng({ x: 10, y: 20 })).toEqual([631, 10]);
    expect(toLatLng({ x: 0, y: 0 })).toEqual([651, 0]);
    expect(toLatLng({ x: 1395, y: 651 })).toEqual([0, 1395]);
  });
  it('fromLatLng flips back, rounds to 1 decimal and clamps', () => {
    expect(fromLatLng({ lat: 631, lng: 10 })).toEqual({ x: 10, y: 20 });
    expect(fromLatLng({ lat: 630.74, lng: 10.04 })).toEqual({ x: 10, y: 20.3 });
    expect(fromLatLng({ lat: -5, lng: 2000 })).toEqual({ x: 1395, y: 651 });
    expect(fromLatLng({ lat: 700, lng: -3 })).toEqual({ x: 0, y: 0 });
  });
  it('round-trips', () => {
    expect(fromLatLng({ lat: toLatLng({ x: 812.5, y: 333.3 })[0], lng: toLatLng({ x: 812.5, y: 333.3 })[1] })).toEqual({ x: 812.5, y: 333.3 });
  });
});
```

`src/lib/display.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { displayName } from './display';

describe('displayName', () => {
  it('uses name when present', () => {
    expect(displayName({ name: 'Near the Airlock', category: 'healing', zone: 'hub' })).toBe('Near the Airlock');
  });
  it('falls back to "Category — Zone"', () => {
    expect(displayName({ category: 'black-box', zone: 'crew-quarters' })).toBe('Black Box — Crew Quarters');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib`
Expected: coords/display tests FAIL (module not found); ids tests still pass.

- [ ] **Step 3: Implement**

`src/lib/coords.ts`:
```ts
import { IMAGE_HEIGHT, IMAGE_WIDTH } from '../data/schema';

export type LatLngTuple = [number, number];

export const IMAGE_BOUNDS: [LatLngTuple, LatLngTuple] = [
  [0, 0],
  [IMAGE_HEIGHT, IMAGE_WIDTH],
];

// CRS.Simple latitude grows upward, but image y grows downward, so flip y against IMAGE_HEIGHT.
export function toLatLng(p: { x: number; y: number }): LatLngTuple {
  return [IMAGE_HEIGHT - p.y, p.x];
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function fromLatLng(ll: { lat: number; lng: number }): { x: number; y: number } {
  const round1 = (v: number) => Math.round(v * 10) / 10;
  return {
    x: round1(clamp(ll.lng, 0, IMAGE_WIDTH)),
    y: round1(clamp(IMAGE_HEIGHT - ll.lat, 0, IMAGE_HEIGHT)),
  };
}
```

`src/lib/display.ts`:
```ts
import { CATEGORY_BY_ID } from '../data/categories';
import type { Poi } from '../data/schema';
import { ZONE_BY_ID } from '../data/zones';

export function displayName(poi: Pick<Poi, 'name' | 'category' | 'zone'>): string {
  if (poi.name && poi.name.trim()) return poi.name;
  return `${CATEGORY_BY_ID[poi.category].label} — ${ZONE_BY_ID[poi.zone].label}`;
}
```

- [ ] **Step 4: Run tests, then commit**

Run: `npx vitest run src/lib`
Expected: PASS.

```powershell
git add src/lib
git commit -m "feat(lib): add coordinate conversion and display-name helpers"
```

---

### Task 5: Category icons (SVG)

**Files:**
- Create: `src/icons/index.ts`, `src/icons/CategoryIcon.tsx`, `src/icons/icons.test.tsx`

**Interfaces:**
- Consumes: `CATEGORY_IDS`, `CategoryId`, `CATEGORY_BY_ID` (Task 2).
- Produces:
  ```ts
  export const ICON_SVG: Record<CategoryId, string>;  // full <svg ...>…</svg> markup, 24×24 viewBox, uses category color + currentColor
  export function CategoryIcon(props: { category: CategoryId; size?: number; className?: string }): JSX.Element;
  ```

- [ ] **Step 1: Write failing test `src/icons/icons.test.tsx`**

```ts
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CATEGORY_IDS } from '../data/categories';
import { ICON_SVG } from './index';
import { CategoryIcon } from './CategoryIcon';

describe('icons', () => {
  it('has an svg string for every category', () => {
    for (const id of CATEGORY_IDS) {
      expect(ICON_SVG[id]).toMatch(/^<svg[\s\S]*<\/svg>$/);
      expect(ICON_SVG[id]).toContain('viewBox="0 0 24 24"');
    }
  });
  it('CategoryIcon renders an svg with the requested size', () => {
    const { container } = render(<CategoryIcon category="healing" size={40} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('width')).toBe('40');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/icons`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/icons/index.ts`**

Each icon: a filled circle badge in the category colour with a simple white glyph, echoing the in-game icons (green cross, yellow ammo, figure-in-circle capsule, pin/i, red hazard, purple box, lever, gun). All 24×24.

```ts
import { CATEGORY_BY_ID, type CategoryId } from '../data/categories';

function badge(color: string, glyph: string, glyphColor = '#0b2a33'): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">` +
    `<circle cx="12" cy="12" r="11" fill="${color}" stroke="#0b2a33" stroke-width="1.5"/>` +
    `<g fill="${glyphColor}" stroke="${glyphColor}" stroke-linecap="round" stroke-linejoin="round">${glyph}</g>` +
    `</svg>`
  );
}

const c = (id: CategoryId) => CATEGORY_BY_ID[id].color;

export const ICON_SVG: Record<CategoryId, string> = {
  healing: badge(c('healing'), `<path d="M12 6.5v11M6.5 12h11" stroke-width="3" fill="none"/>`),
  ammo: badge(
    c('ammo'),
    `<path d="M9 17V10a3 3 0 0 1 6 0v7z" stroke-width="1"/><rect x="8.5" y="17" width="7" height="2" rx="0.5"/>`,
  ),
  capsule: badge(
    '#6b7280',
    `<circle cx="12" cy="8.5" r="2.4" fill="#fff" stroke="none"/><path d="M8 18v-3.5a4 4 0 0 1 8 0V18z" fill="#fff" stroke="none"/>`,
  ),
  info: badge(
    '#1f2937',
    `<circle cx="12" cy="7.5" r="1.4" fill="#fff" stroke="none"/><rect x="10.8" y="10" width="2.4" height="7.5" rx="1" fill="#fff" stroke="none"/>`,
    '#fff',
  ),
  'self-destruct': badge(
    c('self-destruct'),
    `<circle cx="12" cy="12" r="5.5" fill="none" stroke-width="2"/><path d="M12 5.5v3M12 15.5v3M5.5 12h3M15.5 12h3" stroke-width="2"/><circle cx="12" cy="12" r="1.8" stroke="none"/>`,
  ),
  'black-box': badge(
    c('black-box'),
    `<rect x="6.5" y="8" width="11" height="9" rx="1.2" stroke-width="1.5" fill="none"/><path d="M6.5 11h11M9.5 8V6.5h5V8" stroke-width="1.5" fill="none"/>`,
  ),
  'pipe-lever': badge(
    c('pipe-lever'),
    `<path d="M7 17h10M12 17V9" stroke-width="2.5" fill="none"/><path d="M12 9l4-3.5" stroke-width="2.5" fill="none"/><circle cx="16.3" cy="5.3" r="1.6" stroke="none"/>`,
  ),
  weapon: badge(
    c('weapon'),
    `<path d="M5 10h13v3h-6l-1 4h-3l1-4H5z" stroke-width="1" /><path d="M18 10.5h1.5" stroke-width="2"/>`,
  ),
};
```

- [ ] **Step 4: Write `src/icons/CategoryIcon.tsx`**

```tsx
import type { CategoryId } from '../data/categories';
import { ICON_SVG } from './index';

export function CategoryIcon({
  category,
  size = 24,
  className,
}: {
  category: CategoryId;
  size?: number;
  className?: string;
}) {
  const html = ICON_SVG[category].replace('width="24" height="24"', `width="${size}" height="${size}"`);
  return (
    <span
      className={className}
      style={{ display: 'inline-flex', width: size, height: size }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

- [ ] **Step 5: Run tests, lint, commit**

Run: `npx vitest run src/icons; npm run lint`
Expected: PASS, lint clean.

```powershell
git add src/icons
git commit -m "feat(icons): add SVG category icons"
```

- [ ] **Step 6: Visual sanity (manual)** — temporarily render all eight `<CategoryIcon size={48}/>` in `App.tsx`, run `npm run dev`, look at them in the browser, adjust paths if a glyph is unreadable, then revert `App.tsx`. Do not commit the temporary change.

---

### Task 6: Legend — filter state and component

**Files:**
- Create: `src/legend/filterState.ts`, `src/legend/filterState.test.ts`, `src/legend/Legend.tsx`, `src/legend/Legend.test.tsx`

**Interfaces:**
- Consumes: `CATEGORIES`, `CategoryId`, `CATEGORY_IDS` (Task 2), `CategoryIcon` (Task 5).
- Produces:
  ```ts
  export type VisibleSet = ReadonlySet<CategoryId>;
  export function allVisible(): VisibleSet;
  export function noneVisible(): VisibleSet;
  export function toggleCategory(set: VisibleSet, id: CategoryId): VisibleSet;
  export function soloCategory(id: CategoryId): VisibleSet;
  export function isAllVisible(set: VisibleSet): boolean;
  export function Legend(props: { visible: VisibleSet; counts: Partial<Record<CategoryId, number>>; onChange: (next: VisibleSet) => void }): JSX.Element;
  ```

- [ ] **Step 1: Write failing tests**

`src/legend/filterState.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { CATEGORY_IDS } from '../data/categories';
import { allVisible, isAllVisible, noneVisible, soloCategory, toggleCategory } from './filterState';

describe('filterState', () => {
  it('allVisible contains every category', () => {
    expect([...allVisible()].sort()).toEqual([...CATEGORY_IDS].sort());
    expect(isAllVisible(allVisible())).toBe(true);
  });
  it('noneVisible is empty', () => {
    expect(noneVisible().size).toBe(0);
    expect(isAllVisible(noneVisible())).toBe(false);
  });
  it('toggle removes then re-adds without mutating input', () => {
    const a = allVisible();
    const b = toggleCategory(a, 'ammo');
    expect(b.has('ammo')).toBe(false);
    expect(a.has('ammo')).toBe(true);
    expect(toggleCategory(b, 'ammo').has('ammo')).toBe(true);
  });
  it('solo yields exactly one category', () => {
    expect([...soloCategory('weapon')]).toEqual(['weapon']);
  });
});
```

`src/legend/Legend.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { allVisible, noneVisible } from './filterState';
import { Legend } from './Legend';

describe('Legend', () => {
  it('renders one button per category, pressed when visible', () => {
    render(<Legend visible={allVisible()} counts={{}} onChange={() => {}} />);
    const items = screen.getAllByRole('button', { pressed: true });
    expect(items).toHaveLength(8);
    expect(screen.getByRole('button', { name: /healing point/i })).toBeInTheDocument();
  });

  it('click toggles a category', async () => {
    const onChange = vi.fn();
    render(<Legend visible={allVisible()} counts={{}} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /ammunition/i }));
    const next = onChange.mock.calls[0]?.[0] as Set<string>;
    expect(next.has('ammo')).toBe(false);
    expect(next.size).toBe(7);
  });

  it('double-click solos a category', async () => {
    const onChange = vi.fn();
    render(<Legend visible={allVisible()} counts={{}} onChange={onChange} />);
    await userEvent.dblClick(screen.getByRole('button', { name: /black box/i }));
    const last = onChange.mock.calls.at(-1)?.[0] as Set<string>;
    expect([...last]).toEqual(['black-box']);
  });

  it('All / None buttons', async () => {
    const onChange = vi.fn();
    render(<Legend visible={noneVisible()} counts={{}} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /^all$/i }));
    expect((onChange.mock.calls[0]?.[0] as Set<string>).size).toBe(8);
    await userEvent.click(screen.getByRole('button', { name: /^none$/i }));
    expect((onChange.mock.calls[1]?.[0] as Set<string>).size).toBe(0);
  });

  it('shows the count in the item title', () => {
    render(<Legend visible={allVisible()} counts={{ healing: 5 }} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /healing point/i })).toHaveAttribute('title', expect.stringContaining('5'));
  });

  it('has a drawer handle that toggles aria-expanded', async () => {
    render(<Legend visible={allVisible()} counts={{}} onChange={() => {}} />);
    const handle = screen.getByRole('button', { name: /legend/i });
    expect(handle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(handle);
    expect(handle).toHaveAttribute('aria-expanded', 'true');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/legend`
Expected: FAIL (modules not found).

- [ ] **Step 3: Write `src/legend/filterState.ts`**

```ts
import { CATEGORY_IDS, type CategoryId } from '../data/categories';

export type VisibleSet = ReadonlySet<CategoryId>;

export function allVisible(): VisibleSet {
  return new Set<CategoryId>(CATEGORY_IDS);
}

export function noneVisible(): VisibleSet {
  return new Set<CategoryId>();
}

export function toggleCategory(set: VisibleSet, id: CategoryId): VisibleSet {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export function soloCategory(id: CategoryId): VisibleSet {
  return new Set<CategoryId>([id]);
}

export function isAllVisible(set: VisibleSet): boolean {
  return CATEGORY_IDS.every((id) => set.has(id));
}
```

- [ ] **Step 4: Write `src/legend/Legend.tsx`**

Design notes (from spec §7): bottom-centre panel, dark translucent, thin cyan border, rounded, uppercase spaced type; CSS grid with `grid-auto-flow: column` and 3 rows; dimmed when off; All/None on the right edge; on `< md` it is a pull-up drawer with a handle. The handle button is always rendered (hidden on desktop via CSS) so the test can find it.

```tsx
import { useState } from 'react';
import { CATEGORIES, type CategoryId } from '../data/categories';
import { CategoryIcon } from '../icons/CategoryIcon';
import { allVisible, noneVisible, soloCategory, toggleCategory, type VisibleSet } from './filterState';

interface LegendProps {
  visible: VisibleSet;
  counts: Partial<Record<CategoryId, number>>;
  onChange: (next: VisibleSet) => void;
}

export function Legend({ visible, counts, onChange }: LegendProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={
        'pointer-events-none fixed inset-x-0 bottom-0 z-[1000] flex flex-col items-center ' +
        'md:bottom-4'
      }
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls="legend-panel"
        onClick={() => setOpen((o) => !o)}
        className={
          'pointer-events-auto mb-[-1px] rounded-t-md border border-b-0 border-cyan-line/50 bg-panel/90 ' +
          'px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-line md:hidden'
        }
      >
        Legend
      </button>

      <div
        id="legend-panel"
        className={
          'pointer-events-auto w-full max-w-3xl rounded-t-xl border border-cyan-line/50 bg-panel/85 ' +
          'px-4 py-3 shadow-[0_0_24px_rgba(111,214,232,0.15)] backdrop-blur-sm ' +
          'transition-transform duration-200 md:rounded-xl ' +
          (open ? 'translate-y-0' : 'translate-y-full md:translate-y-0')
        }
      >
        <div className="flex items-start gap-4">
          <ul
            className="grid flex-1 gap-x-6 gap-y-1"
            style={{ gridAutoFlow: 'column', gridTemplateRows: 'repeat(3, auto)' }}
          >
            {CATEGORIES.map((cat) => {
              const on = visible.has(cat.id);
              const count = counts[cat.id] ?? 0;
              return (
                <li key={cat.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    title={`${cat.label} (${count})`}
                    onClick={() => onChange(toggleCategory(visible, cat.id))}
                    onDoubleClick={() => onChange(soloCategory(cat.id))}
                    className={
                      'flex w-full items-center gap-2 rounded px-1 py-0.5 text-left text-[11px] font-semibold ' +
                      'uppercase tracking-[0.15em] transition-opacity hover:bg-white/5 ' +
                      (on ? 'opacity-100' : 'opacity-35 saturate-0')
                    }
                  >
                    <CategoryIcon category={cat.id} size={18} />
                    <span>{cat.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-col gap-1 border-l border-cyan-line/30 pl-3">
            <button
              type="button"
              onClick={() => onChange(allVisible())}
              className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-line hover:bg-white/5"
            >
              All
            </button>
            <button
              type="button"
              onClick={() => onChange(noneVisible())}
              className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-line hover:bg-white/5"
            >
              None
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run tests, lint, commit**

Run: `npx vitest run src/legend; npm run lint; npm run typecheck`
Expected: PASS (10 tests), clean.

```powershell
git add src/legend
git commit -m "feat(legend): add in-game-styled legend with category filters and mobile drawer"
```

---

### Task 7: Map rendering — MapView, MarkerLayer, PoiPopup, ReferenceLayer

**Files:**
- Create: `src/map/MapView.tsx`, `src/map/MarkerLayer.tsx`, `src/map/PoiPopup.tsx`, `src/map/ReferenceLayer.tsx`, `src/map/markerIcon.ts`, `src/map/markerIcon.test.ts`, `src/map/PoiPopup.test.tsx`

**Interfaces:**
- Consumes: `IMAGE_BOUNDS`, `toLatLng`, `fromLatLng` (Task 4), `ICON_SVG` (Task 5), `Poi` (Task 3), `VisibleSet` (Task 6), `displayName` (Task 4), `CATEGORY_BY_ID`, `ZONE_BY_ID`.
- Produces:
  ```ts
  export function MapView(props: { children?: ReactNode; onMapClick?: (p: { x: number; y: number }) => void; addMode?: boolean }): JSX.Element;
  export function MarkerLayer(props: {
    pois: readonly Poi[];
    visible: VisibleSet;
    mode: 'view' | 'edit';
    selectedId?: string | null;
    onSelect?: (id: string) => void;
    onMove?: (id: string, p: { x: number; y: number }) => void;
    onPopupOpen?: (id: string) => void;
    openPoiId?: string | null;          // Task 12: open this POI's popup imperatively
  }): JSX.Element;
  export function PoiPopup(props: { poi: Poi }): JSX.Element;
  export function ReferenceLayer(props: { opacity: number; visible: boolean }): JSX.Element | null;
  export function markerIcon(category: CategoryId, selected: boolean): L.DivIcon;
  ```

- [ ] **Step 1: Write failing tests**

`src/map/markerIcon.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { markerIcon } from './markerIcon';

describe('markerIcon', () => {
  it('builds a divIcon with the category svg and 32px anchor at centre', () => {
    const icon = markerIcon('healing', false);
    const opts = icon.options;
    expect(String(opts.html)).toContain('<svg');
    expect(opts.iconSize).toEqual([32, 32]);
    expect(opts.iconAnchor).toEqual([16, 16]);
    expect(opts.className).toContain('poi-marker');
    expect(opts.className).not.toContain('is-selected');
  });
  it('adds is-selected when selected', () => {
    expect(markerIcon('ammo', true).options.className).toContain('is-selected');
  });
});
```

`src/map/PoiPopup.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PoiPopup } from './PoiPopup';

describe('PoiPopup', () => {
  it('shows fallback name, category, zone, description, variant, modes and media', () => {
    render(
      <PoiPopup
        poi={{
          id: 'weapon-production-01',
          category: 'weapon',
          zone: 'production',
          x: 1,
          y: 2,
          description: 'Behind the crates.',
          variant: 'shotgun',
          gameModes: ['classic'],
          media: { src: 'media/weapon-production-01.webp', alt: 'Shotgun' },
        }}
      />,
    );
    expect(screen.getByRole('heading')).toHaveTextContent('Weapon — Production');
    expect(screen.getByText('Behind the crates.')).toBeInTheDocument();
    expect(screen.getByText(/shotgun/)).toBeInTheDocument();
    expect(screen.getByText(/classic/)).toBeInTheDocument();
    const img = screen.getByRole('img', { name: 'Shotgun' });
    expect(img).toHaveAttribute('src', expect.stringContaining('media/weapon-production-01.webp'));
    expect(img).toHaveAttribute('loading', 'lazy');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/map`
Expected: FAIL (modules not found).

- [ ] **Step 3: Write `src/map/markerIcon.ts`**

```ts
import L from 'leaflet';
import type { CategoryId } from '../data/categories';
import { ICON_SVG } from '../icons/index';

const SIZE = 32;
const cache = new Map<string, L.DivIcon>();

export function markerIcon(category: CategoryId, selected: boolean): L.DivIcon {
  const key = `${category}:${selected ? 1 : 0}`;
  let icon = cache.get(key);
  if (!icon) {
    icon = L.divIcon({
      html: ICON_SVG[category].replace('width="24" height="24"', `width="${SIZE}" height="${SIZE}"`),
      className: `poi-marker poi-marker--${category}${selected ? ' is-selected' : ''}`,
      iconSize: [SIZE, SIZE],
      iconAnchor: [SIZE / 2, SIZE / 2],
      popupAnchor: [0, -SIZE / 2],
      tooltipAnchor: [SIZE / 2, 0],
    });
    cache.set(key, icon);
  }
  return icon;
}
```

- [ ] **Step 4: Write `src/map/PoiPopup.tsx`**

```tsx
import { CATEGORY_BY_ID } from '../data/categories';
import type { Poi } from '../data/schema';
import { ZONE_BY_ID } from '../data/zones';
import { CategoryIcon } from '../icons/CategoryIcon';
import { displayName } from '../lib/display';

const BASE = import.meta.env.BASE_URL;

export function PoiPopup({ poi }: { poi: Poi }) {
  const cat = CATEGORY_BY_ID[poi.category];
  return (
    <div className="min-w-[200px] max-w-[280px] text-sm">
      <div className="mb-1 flex items-center gap-2">
        <CategoryIcon category={poi.category} size={20} />
        <h3 className="text-base font-semibold leading-tight">{displayName(poi)}</h3>
      </div>
      <div className="mb-2 flex flex-wrap gap-1 text-[10px] uppercase tracking-[0.15em] text-cyan-line/90">
        <span>{cat.label}</span>
        <span>·</span>
        <span>{ZONE_BY_ID[poi.zone].label}</span>
        {poi.variant && (
          <>
            <span>·</span>
            <span>{poi.variant}</span>
          </>
        )}
      </div>
      {poi.media && (
        <img
          src={`${BASE}${poi.media.src}`}
          alt={poi.media.alt ?? displayName(poi)}
          loading="lazy"
          className="mb-2 w-full rounded border border-cyan-line/30"
        />
      )}
      {poi.description && <p className="leading-snug">{poi.description}</p>}
      {poi.gameModes && poi.gameModes.length > 0 && (
        <p className="mt-2 text-xs text-white/60">Modes: {poi.gameModes.join(', ')}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Write `src/map/MapView.tsx`**

```tsx
import { CRS } from 'leaflet';
import { useEffect, type ReactNode } from 'react';
import { ImageOverlay, MapContainer, useMap, useMapEvents } from 'react-leaflet';
import { fromLatLng, IMAGE_BOUNDS } from '../lib/coords';

const BASE_IMAGE = `${import.meta.env.BASE_URL}base.webp`;

function FitAndLimit() {
  const map = useMap();
  useEffect(() => {
    const fit = () => {
      map.invalidateSize();
      const fitZoom = map.getBoundsZoom(IMAGE_BOUNDS, false);
      map.setMinZoom(fitZoom);
      map.fitBounds(IMAGE_BOUNDS, { animate: false });
    };
    fit();
    const ro = new ResizeObserver(() => fit());
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
```

- [ ] **Step 6: Write `src/map/MarkerLayer.tsx`**

```tsx
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
```

- [ ] **Step 7: Write `src/map/ReferenceLayer.tsx`**

```tsx
import { ImageOverlay } from 'react-leaflet';
import { IMAGE_BOUNDS } from '../lib/coords';

const REFERENCE_IMAGE = `${import.meta.env.BASE_URL}reference.png`;

export function ReferenceLayer({ opacity, visible }: { opacity: number; visible: boolean }) {
  if (!visible) return null;
  return <ImageOverlay url={REFERENCE_IMAGE} bounds={IMAGE_BOUNDS} opacity={opacity} zIndex={5} />;
}
```

- [ ] **Step 8: Run tests, typecheck, lint, commit**

Run: `npx vitest run src/map; npm run typecheck; npm run lint`
Expected: PASS (3 tests), clean. If `react-leaflet` types complain about `bounds` on `MapContainer`, replace with `center={[325, 697]} zoom={-1}` (FitAndLimit re-fits on mount anyway).

```powershell
git add src/map
git commit -m "feat(map): add Leaflet map view, SVG markers, popup and reference layer"
```

---

### Task 8: Viewer app wiring and `E` shortcut

**Files:**
- Create: `src/app/ViewerApp.tsx`, `src/app/useEditShortcut.ts`, `src/app/useEditShortcut.test.ts`, `src/app/countByCategory.ts`, `src/app/countByCategory.test.ts`
- Modify: `src/app/App.tsx`, `src/app/App.test.tsx`

**Interfaces:**
- Consumes: `publishedData` (Task 3), `MapView`, `MarkerLayer` (Task 7), `Legend`, `allVisible` (Task 6).
- Produces:
  ```ts
  export function countByCategory(pois: readonly Poi[]): Partial<Record<CategoryId, number>>;
  export function useEditShortcut(): void;    // 'e'/'E' outside inputs → location.assign('?edit' + hash)
  export function isEditMode(search: string): boolean;  // new URLSearchParams(search).has('edit')
  export function ViewerApp(): JSX.Element;
  export function App(): JSX.Element;         // this task: renders <ViewerApp/> only; Task 11 adds the ?edit branch to a lazy EditorApp
  ```

- [ ] **Step 1: Write failing tests**

`src/app/countByCategory.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { countByCategory } from './countByCategory';

describe('countByCategory', () => {
  it('counts pois per category', () => {
    const pois = [
      { id: 'ammo-hub-01', category: 'ammo', zone: 'hub', x: 1, y: 1 },
      { id: 'ammo-hub-02', category: 'ammo', zone: 'hub', x: 2, y: 2 },
      { id: 'healing-hub-01', category: 'healing', zone: 'hub', x: 3, y: 3 },
    ] as const;
    expect(countByCategory(pois)).toEqual({ ammo: 2, healing: 1 });
  });
});
```

`src/app/useEditShortcut.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { isEditMode } from './useEditShortcut';

describe('isEditMode', () => {
  it('detects ?edit', () => {
    expect(isEditMode('?edit')).toBe(true);
    expect(isEditMode('?edit=1&x=2')).toBe(true);
    expect(isEditMode('')).toBe(false);
    expect(isEditMode('?editor')).toBe(false);
  });
});
```

Update `src/app/App.test.tsx` — the App now renders a Leaflet map, which jsdom cannot lay out. Mock the map:
```tsx
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../map/MapView', () => ({ MapView: ({ children }: { children?: ReactNode }) => <div data-testid="map">{children}</div> }));
vi.mock('../map/MarkerLayer', () => ({ MarkerLayer: () => null }));

import { App } from './App';

describe('App', () => {
  it('renders map and legend', () => {
    render(<App />);
    expect(screen.getByTestId('map')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/app`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/app/countByCategory.ts`:
```ts
import type { CategoryId } from '../data/categories';
import type { Poi } from '../data/schema';

export function countByCategory(pois: readonly Poi[]): Partial<Record<CategoryId, number>> {
  const out: Partial<Record<CategoryId, number>> = {};
  for (const p of pois) out[p.category] = (out[p.category] ?? 0) + 1;
  return out;
}
```

`src/app/useEditShortcut.ts`:
```ts
import { useEffect } from 'react';

export function isEditMode(search: string): boolean {
  return new URLSearchParams(search).has('edit');
}

function isTypingTarget(t: EventTarget | null): boolean {
  return (
    t instanceof HTMLElement &&
    (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
  );
}

export function useEditShortcut(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'e' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (isEditMode(window.location.search)) return;
      window.location.assign(`${window.location.pathname}?edit${window.location.hash}`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
```

`src/app/ViewerApp.tsx`:
```tsx
import { useMemo, useState } from 'react';
import { publishedData } from '../data/publishedData';
import { Legend } from '../legend/Legend';
import { allVisible, type VisibleSet } from '../legend/filterState';
import { MapView } from '../map/MapView';
import { MarkerLayer } from '../map/MarkerLayer';
import { countByCategory } from './countByCategory';
import { useEditShortcut } from './useEditShortcut';

export function ViewerApp() {
  const [visible, setVisible] = useState<VisibleSet>(() => allVisible());
  const counts = useMemo(() => countByCategory(publishedData.pois), []);
  useEditShortcut();

  return (
    <div className="relative h-full w-full">
      <MapView>
        <MarkerLayer pois={publishedData.pois} visible={visible} mode="view" />
      </MapView>
      <Legend visible={visible} counts={counts} onChange={setVisible} />
    </div>
  );
}
```

`src/app/App.tsx`:
```tsx
import { ViewerApp } from './ViewerApp';

export function App() {
  return <ViewerApp />;
}
```

- [ ] **Step 4: Run all tests, typecheck, lint**

Run: `npm test; npm run typecheck; npm run lint`
Expected: green.

- [ ] **Step 5: Manual verification**

Run: `npm run dev` and open the printed URL (it includes `/hss-hawking-interactive/`).
Check: the whole ship fits the viewport; wheel zoom and drag work; the legend panel sits bottom-centre with 3 columns; narrowing the window below 768px turns it into a drawer with a "Legend" handle; pressing `E` reloads with `?edit` (nothing else changes yet). To see markers, temporarily add one POI to `hawking-map.json` (`{"id":"healing-hub-01","category":"healing","zone":"hub","x":650,"y":320}`), confirm hover tooltip + click popup, then remove it.

- [ ] **Step 6: Commit**

```powershell
git add src/app
git commit -m "feat(app): wire viewer app with map, legend and edit shortcut"
```

---

### Task 9: Asset tools — upscale base and rectify the in-game screenshot

**Files:**
- Create: `tools/requirements.txt`, `tools/README.md`, `tools/upscale.py`, `tools/pick_points.py`, `tools/rectify.py`, `tools/rectify-points.json`
- Replace: `public/base.webp` (upscaled), create `public/reference.png`

**Interfaces:**
- Produces: `public/base.webp` (5580×2604, lossy WebP q≈85) and `public/reference.png` (1395×651 RGBA). Both consumed by Task 7 components by URL only.

- [ ] **Step 1: Write `tools/requirements.txt` and install**

```
opencv-python>=4.10
numpy>=1.26
Pillow>=10.0
```

Run: `python -m pip install -r tools/requirements.txt`
Expected: installs (numpy/Pillow may already exist).

- [ ] **Step 2: Write `tools/upscale.py`**

```python
"""Upscale tools/source/hawking-base.webp 4x -> public/base.webp.

Preferred path (better edges): run realesrgan-ncnn-vulkan (portable binary,
https://github.com/xinntao/Real-ESRGAN/releases) with:
    realesrgan-ncnn-vulkan -i tools/source/hawking-base.webp -o base4x.png -s 4 -n realesrgan-x4plus-anime
then: python tools/upscale.py --from base4x.png
Fallback (no external binary): python tools/upscale.py   (Lanczos + light unsharp mask)
"""
import argparse
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "tools" / "source" / "hawking-base.webp"
OUT = ROOT / "public" / "base.webp"
SCALE = 4


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="pre", help="already-upscaled PNG to convert instead of Lanczos")
    ap.add_argument("--quality", type=int, default=85)
    args = ap.parse_args()

    if args.pre:
        img = Image.open(args.pre).convert("RGB")
    else:
        src = Image.open(SRC).convert("RGB")
        img = src.resize((src.width * SCALE, src.height * SCALE), Image.LANCZOS)
        img = img.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))

    assert img.width == 1395 * SCALE and img.height == 651 * SCALE, img.size
    img.save(OUT, "WEBP", quality=args.quality, method=6)
    print(f"wrote {OUT} {img.size} {OUT.stat().st_size // 1024} KiB")


if __name__ == "__main__":
    main()
```

Run: `python tools/upscale.py`
Expected: `wrote ...public/base.webp (5580, 2604) ~N KiB`. Open it and confirm it looks sharp-ish; if the file exceeds ~2.5 MB, rerun with `--quality 75`.

- [ ] **Step 3: Write `tools/pick_points.py`**

```python
"""Click on an image to print pixel coordinates (for building rectify-points.json).
Usage: python tools/pick_points.py tools/source/ingame-screenshot.png
Left-click prints "x, y"; press q to quit. The window may be scaled to fit; printed
coordinates are always in original image pixels.
"""
import sys

import cv2

path = sys.argv[1]
img = cv2.imread(path)
h, w = img.shape[:2]
scale = min(1.0, 1400 / w, 800 / h)
view = cv2.resize(img, (int(w * scale), int(h * scale)))


def on_mouse(event, x, y, flags, param):
    if event == cv2.EVENT_LBUTTONDOWN:
        print(f"{x / scale:.1f}, {y / scale:.1f}", flush=True)


cv2.namedWindow("pick")
cv2.setMouseCallback("pick", on_mouse)
while True:
    cv2.imshow("pick", view)
    if cv2.waitKey(20) & 0xFF == ord("q"):
        break
cv2.destroyAllWindows()
```

- [ ] **Step 4: Build `tools/rectify-points.json`**

Pick 6–8 correspondences between `ingame-screenshot.png` (`src`) and `hawking-base.webp` (`dst`), preferring hull corners and distinctive room corners spread across the whole map (both ends of the ship, top and bottom). Use `pick_points.py` on each image (or any viewer that shows pixel coordinates; the Read tool on the images also works for rough picks). Starting estimates to refine visually (screenshot → base):

```json
{
  "src": "tools/source/ingame-screenshot.png",
  "dst": "tools/source/hawking-base.webp",
  "points": [
    { "name": "shuttle-bay-tip",         "src": [172, 165],  "dst": [255, 60] },
    { "name": "hull-left-tip",           "src": [96, 322],   "dst": [40, 310] },
    { "name": "crew-quarters-top-right", "src": [845, 25],   "dst": [1015, 8] },
    { "name": "machinery-right-tip",     "src": [828, 250],  "dst": [1385, 300] },
    { "name": "machinery-bottom-right",  "src": [800, 383],  "dst": [1330, 495] },
    { "name": "laboratory-bottom",       "src": [520, 490],  "dst": [740, 640] },
    { "name": "hub-centre",              "src": [500, 262],  "dst": [652, 322] },
    { "name": "production-bottom-left",  "src": [270, 405],  "dst": [455, 490] }
  ]
}
```

These are eyeballed and **will be off**; the preview in Step 6 is how you converge.

- [ ] **Step 5: Write `tools/rectify.py`**

```python
"""Warp the in-game screenshot onto the base image frame -> public/reference.png.
Usage:
  python tools/rectify.py            # writes public/reference.png
  python tools/rectify.py --preview  # also writes tools/rectify-preview.png (50/50 blend) to check alignment
"""
import argparse
import json
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
POINTS = ROOT / "tools" / "rectify-points.json"
OUT = ROOT / "public" / "reference.png"
PREVIEW = ROOT / "tools" / "rectify-preview.png"
W, H = 1395, 651


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview", action="store_true")
    args = ap.parse_args()

    cfg = json.loads(POINTS.read_text())
    src_img = cv2.imread(str(ROOT / cfg["src"]), cv2.IMREAD_COLOR)
    dst_img = cv2.imread(str(ROOT / cfg["dst"]), cv2.IMREAD_COLOR)
    assert src_img is not None and dst_img is not None
    assert dst_img.shape[1] == W and dst_img.shape[0] == H, dst_img.shape

    src_pts = np.float32([p["src"] for p in cfg["points"]])
    dst_pts = np.float32([p["dst"] for p in cfg["points"]])
    assert len(src_pts) >= 4, "need at least 4 correspondences"

    homography, mask = cv2.findHomography(src_pts, dst_pts, method=cv2.RANSAC, ransacReprojThreshold=6.0)
    inliers = int(mask.sum()) if mask is not None else 0
    print(f"homography inliers: {inliers}/{len(src_pts)}")

    warped = cv2.warpPerspective(src_img, homography, (W, H), flags=cv2.INTER_LINEAR,
                                 borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0))

    # residuals per point (in base pixels) so bad picks are obvious
    proj = cv2.perspectiveTransform(src_pts.reshape(-1, 1, 2), homography).reshape(-1, 2)
    for p, q in zip(cfg["points"], proj):
        err = float(np.hypot(*(q - np.float32(p["dst"]))))
        print(f"  {p['name']:<26} residual {err:5.1f}px")

    # alpha: opaque where the warp produced pixels, transparent outside
    alpha = cv2.warpPerspective(np.full(src_img.shape[:2], 255, np.uint8), homography, (W, H))
    rgba = cv2.cvtColor(warped, cv2.COLOR_BGR2BGRA)
    rgba[:, :, 3] = alpha
    cv2.imwrite(str(OUT), rgba)
    print(f"wrote {OUT}")

    if args.preview:
        blend = cv2.addWeighted(dst_img, 0.5, warped, 0.5, 0)
        cv2.imwrite(str(PREVIEW), blend)
        print(f"wrote {PREVIEW}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 6: Iterate until aligned**

Run: `python tools/rectify.py --preview`, then look at `tools/rectify-preview.png`. Zone outlines and hull edges from the screenshot should sit on top of the base. Adjust the worst-residual points (or add more) in `rectify-points.json` and rerun until residuals are mostly < 8 px and the preview looks aligned across the whole ship. If the panel is visibly curved and one homography cannot fit both ends, note it in `tools/README.md` and accept the residual (it is a tracing aid).

- [ ] **Step 7: Write `tools/README.md`**

```markdown
# tools/

One-off asset generation. Outputs are committed to `public/`; rerun only when sources change.

- `source/hawking-base.webp` — original 1395×651 clean floor plan (map base).
- `source/ingame-screenshot.png` — photo of the in-game wall map (POI reference).

## Setup
    python -m pip install -r tools/requirements.txt

## Base upscale → public/base.webp
Preferred: Real-ESRGAN portable binary, then convert:
    realesrgan-ncnn-vulkan -i tools/source/hawking-base.webp -o base4x.png -s 4 -n realesrgan-x4plus-anime
    python tools/upscale.py --from base4x.png
Fallback (Lanczos + unsharp):
    python tools/upscale.py

## Rectified reference → public/reference.png
1. Pick correspondences: `python tools/pick_points.py tools/source/ingame-screenshot.png` (and the base).
2. Edit `tools/rectify-points.json` (`src` = screenshot px, `dst` = base px).
3. `python tools/rectify.py --preview` and inspect `tools/rectify-preview.png`; iterate.
`rectify-preview.png` is gitignored.
```

Add `tools/rectify-preview.png` to `.gitignore`.

- [ ] **Step 8: Verify in the app and commit**

Run: `npm run dev` — the base should now be crisp when zoomed in (Task 7's `ImageOverlay` picks the new `public/base.webp` automatically).

```powershell
git add tools public/base.webp public/reference.png .gitignore
git commit -m "feat(tools): add base upscale and screenshot rectification tools; generate assets"
```

---

### Task 10: Editor state — reducer, store, import/export

**Files:**
- Create: `src/editor/editorReducer.ts`, `src/editor/editorReducer.test.ts`, `src/editor/useEditorStore.ts`, `src/editor/importExport.ts`, `src/editor/importExport.test.ts`

**Interfaces:**
- Consumes: `MapData`, `Poi`, `safeParseMapData`, `emptyMapData` (Task 3), `nextPoiId`, `parsePoiId` (Task 2), `CategoryId`, `ZoneId`.
- Produces:
  ```ts
  export type Tool = { kind: 'select' } | { kind: 'add'; category: CategoryId };
  export interface EditorState { draft: MapData; selectedId: string | null; tool: Tool; lastZone: ZoneId; past: MapData[]; future: MapData[]; }
  export type EditorAction =
    | { type: 'addPoi'; x: number; y: number }                     // uses tool.category (no-op if tool is select) and lastZone
    | { type: 'movePoi'; id: string; x: number; y: number }
    | { type: 'updatePoi'; id: string; patch: Partial<Omit<Poi, 'id'>> & { id?: string } }
    | { type: 'deletePoi'; id: string }
    | { type: 'select'; id: string | null }
    | { type: 'setTool'; tool: Tool }
    | { type: 'undo' } | { type: 'redo' }
    | { type: 'replaceDraft'; data: MapData };                    // import / reset
  export function initialEditorState(published: MapData): EditorState;
  export function editorReducer(state: EditorState, action: EditorAction): EditorState;
  export const HISTORY_LIMIT = 100;
  // store
  export const useEditorStore: UseBoundStore<StoreApi<EditorState & { dispatch: (a: EditorAction) => void; hydrated: boolean }>>;
  export const EDITOR_STORAGE_KEY = 'hawking-editor-draft-v1';
  // importExport
  export function serializeMapData(data: MapData): string;   // pois sorted by category (CATEGORY_IDS order) then id; 2-space JSON + trailing newline
  export function parseImportText(text: string): { ok: true; data: MapData } | { ok: false; errors: string[] };
  export function downloadJson(filename: string, text: string): void;
  ```

- [ ] **Step 1: Write failing tests**

`src/editor/editorReducer.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { emptyMapData, type MapData, type Poi } from '../data/schema';
import { editorReducer, initialEditorState, type EditorState } from './editorReducer';

const p = (over: Partial<Poi> & Pick<Poi, 'id' | 'category' | 'zone'>): Poi => ({ x: 10, y: 10, ...over });

function stateWith(pois: Poi[]): EditorState {
  const data: MapData = { ...emptyMapData(), pois };
  return initialEditorState(data);
}

describe('editorReducer', () => {
  it('addPoi with add tool creates a poi with generated id and lastZone, selects it', () => {
    let s = stateWith([p({ id: 'ammo-hub-01', category: 'ammo', zone: 'hub' })]);
    s = editorReducer(s, { type: 'setTool', tool: { kind: 'add', category: 'ammo' } });
    s = editorReducer(s, { type: 'addPoi', x: 100.26, y: 200 });
    expect(s.draft.pois).toHaveLength(2);
    expect(s.draft.pois[1]).toMatchObject({ id: 'ammo-hub-02', category: 'ammo', zone: 'hub', x: 100.3, y: 200 });
    expect(s.selectedId).toBe('ammo-hub-02');
    expect(s.past).toHaveLength(1);
  });

  it('addPoi with select tool is a no-op', () => {
    const s0 = stateWith([]);
    expect(editorReducer(s0, { type: 'addPoi', x: 1, y: 1 })).toBe(s0);
  });

  it('movePoi updates coordinates and records history', () => {
    let s = stateWith([p({ id: 'ammo-hub-01', category: 'ammo', zone: 'hub' })]);
    s = editorReducer(s, { type: 'movePoi', id: 'ammo-hub-01', x: 50, y: 60 });
    expect(s.draft.pois[0]).toMatchObject({ x: 50, y: 60 });
    expect(s.past).toHaveLength(1);
  });

  it('updatePoi changes fields; changing zone regenerates the id and updates lastZone', () => {
    let s = stateWith([p({ id: 'ammo-hub-01', category: 'ammo', zone: 'hub' }), p({ id: 'ammo-machinery-01', category: 'ammo', zone: 'machinery' })]);
    s = editorReducer(s, { type: 'updatePoi', id: 'ammo-hub-01', patch: { name: 'Near Lift', zone: 'machinery' } });
    expect(s.draft.pois[0]).toMatchObject({ id: 'ammo-machinery-02', zone: 'machinery', name: 'Near Lift' });
    expect(s.lastZone).toBe('machinery');
    expect(s.selectedId).toBe(null); // nothing was selected
  });

  it('updatePoi keeps selection pointing at the renamed poi', () => {
    let s = stateWith([p({ id: 'ammo-hub-01', category: 'ammo', zone: 'hub' })]);
    s = editorReducer(s, { type: 'select', id: 'ammo-hub-01' });
    s = editorReducer(s, { type: 'updatePoi', id: 'ammo-hub-01', patch: { category: 'healing' } });
    expect(s.draft.pois[0]?.id).toBe('healing-hub-01');
    expect(s.selectedId).toBe('healing-hub-01');
  });

  it('updatePoi with explicit id override uses it verbatim', () => {
    let s = stateWith([p({ id: 'ammo-hub-01', category: 'ammo', zone: 'hub' })]);
    s = editorReducer(s, { type: 'updatePoi', id: 'ammo-hub-01', patch: { id: 'ammo-hub-07' } });
    expect(s.draft.pois[0]?.id).toBe('ammo-hub-07');
  });

  it('updatePoi strips empty optional strings', () => {
    let s = stateWith([p({ id: 'ammo-hub-01', category: 'ammo', zone: 'hub', name: 'x' })]);
    s = editorReducer(s, { type: 'updatePoi', id: 'ammo-hub-01', patch: { name: '', description: '  ' } });
    expect(s.draft.pois[0]).not.toHaveProperty('name');
    expect(s.draft.pois[0]).not.toHaveProperty('description');
  });

  it('deletePoi removes and clears selection', () => {
    let s = stateWith([p({ id: 'ammo-hub-01', category: 'ammo', zone: 'hub' })]);
    s = editorReducer(s, { type: 'select', id: 'ammo-hub-01' });
    s = editorReducer(s, { type: 'deletePoi', id: 'ammo-hub-01' });
    expect(s.draft.pois).toHaveLength(0);
    expect(s.selectedId).toBeNull();
  });

  it('undo/redo walk history; new mutation clears future', () => {
    let s = stateWith([]);
    s = editorReducer(s, { type: 'setTool', tool: { kind: 'add', category: 'info' } });
    s = editorReducer(s, { type: 'addPoi', x: 1, y: 1 });
    s = editorReducer(s, { type: 'addPoi', x: 2, y: 2 });
    expect(s.draft.pois).toHaveLength(2);
    s = editorReducer(s, { type: 'undo' });
    expect(s.draft.pois).toHaveLength(1);
    expect(s.future).toHaveLength(1);
    s = editorReducer(s, { type: 'redo' });
    expect(s.draft.pois).toHaveLength(2);
    s = editorReducer(s, { type: 'undo' });
    s = editorReducer(s, { type: 'addPoi', x: 3, y: 3 });
    expect(s.future).toHaveLength(0);
    expect(editorReducer(stateWith([]), { type: 'undo' }).past).toHaveLength(0);
  });

  it('replaceDraft swaps the whole draft, keeps history, clears selection', () => {
    let s = stateWith([p({ id: 'ammo-hub-01', category: 'ammo', zone: 'hub' })]);
    s = editorReducer(s, { type: 'select', id: 'ammo-hub-01' });
    s = editorReducer(s, { type: 'replaceDraft', data: emptyMapData() });
    expect(s.draft.pois).toHaveLength(0);
    expect(s.selectedId).toBeNull();
    expect(s.past).toHaveLength(1);
  });
});
```

`src/editor/importExport.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { emptyMapData } from '../data/schema';
import { parseImportText, serializeMapData } from './importExport';

describe('serializeMapData', () => {
  it('sorts pois by category order then id, pretty prints, trailing newline', () => {
    const text = serializeMapData({
      ...emptyMapData(),
      pois: [
        { id: 'weapon-hub-01', category: 'weapon', zone: 'hub', x: 1, y: 1 },
        { id: 'healing-hub-02', category: 'healing', zone: 'hub', x: 1, y: 1 },
        { id: 'healing-hub-01', category: 'healing', zone: 'hub', x: 1, y: 1 },
      ],
    });
    const data = JSON.parse(text);
    expect(data.pois.map((p: { id: string }) => p.id)).toEqual(['healing-hub-01', 'healing-hub-02', 'weapon-hub-01']);
    expect(text.endsWith('\n')).toBe(true);
    expect(text).toContain('\n  "version": 1');
  });
});

describe('parseImportText', () => {
  it('returns errors for invalid JSON and for schema violations', () => {
    expect(parseImportText('{not json')).toMatchObject({ ok: false });
    const bad = parseImportText(JSON.stringify({ ...emptyMapData(), version: 3 }));
    expect(bad.ok).toBe(false);
  });
  it('round-trips serialized data', () => {
    const r = parseImportText(serializeMapData(emptyMapData()));
    expect(r.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/editor`
Expected: FAIL (modules not found).

- [ ] **Step 3: Write `src/editor/editorReducer.ts`**

```ts
import type { CategoryId } from '../data/categories';
import type { MapData, Poi } from '../data/schema';
import type { ZoneId } from '../data/zones';
import { nextPoiId } from '../lib/ids';

export type Tool = { kind: 'select' } | { kind: 'add'; category: CategoryId };

export interface EditorState {
  draft: MapData;
  selectedId: string | null;
  tool: Tool;
  lastZone: ZoneId;
  past: MapData[];
  future: MapData[];
}

export type EditorAction =
  | { type: 'addPoi'; x: number; y: number }
  | { type: 'movePoi'; id: string; x: number; y: number }
  | { type: 'updatePoi'; id: string; patch: Partial<Omit<Poi, 'id'>> & { id?: string } }
  | { type: 'deletePoi'; id: string }
  | { type: 'select'; id: string | null }
  | { type: 'setTool'; tool: Tool }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'replaceDraft'; data: MapData };

export const HISTORY_LIMIT = 100;

export function initialEditorState(published: MapData): EditorState {
  return {
    draft: structuredClone(published),
    selectedId: null,
    tool: { kind: 'select' },
    lastZone: 'hub',
    past: [],
    future: [],
  };
}

const round1 = (v: number) => Math.round(v * 10) / 10;

function pushHistory(state: EditorState, draft: MapData): Pick<EditorState, 'draft' | 'past' | 'future'> {
  const past = [...state.past, state.draft].slice(-HISTORY_LIMIT);
  return { draft, past, future: [] };
}

const OPTIONAL_STRINGS = ['name', 'description', 'variant', 'notes'] as const;

function cleanPatch(patch: EditorAction extends { type: 'updatePoi'; patch: infer P } ? P : never) {
  const out: Record<string, unknown> = { ...patch };
  for (const k of OPTIONAL_STRINGS) {
    if (k in out && typeof out[k] === 'string' && (out[k] as string).trim() === '') out[k] = undefined;
  }
  if ('gameModes' in out && Array.isArray(out.gameModes) && out.gameModes.length === 0) out.gameModes = undefined;
  if ('media' in out && out.media && typeof out.media === 'object' && !(out.media as { src?: string }).src) out.media = undefined;
  return out as Partial<Poi>;
}

function stripUndefined(poi: Poi): Poi {
  return Object.fromEntries(Object.entries(poi).filter(([, v]) => v !== undefined)) as Poi;
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'select':
      return { ...state, selectedId: action.id };

    case 'setTool':
      return { ...state, tool: action.tool };

    case 'addPoi': {
      if (state.tool.kind !== 'add') return state;
      const category = state.tool.category;
      const zone = state.lastZone;
      const id = nextPoiId(state.draft.pois.map((p) => p.id), category, zone);
      const poi: Poi = { id, category, zone, x: round1(action.x), y: round1(action.y) };
      const draft: MapData = { ...state.draft, pois: [...state.draft.pois, poi] };
      return { ...state, ...pushHistory(state, draft), selectedId: id };
    }

    case 'movePoi': {
      const idx = state.draft.pois.findIndex((p) => p.id === action.id);
      if (idx < 0) return state;
      const pois = state.draft.pois.slice();
      pois[idx] = { ...pois[idx]!, x: round1(action.x), y: round1(action.y) };
      return { ...state, ...pushHistory(state, { ...state.draft, pois }) };
    }

    case 'updatePoi': {
      const idx = state.draft.pois.findIndex((p) => p.id === action.id);
      if (idx < 0) return state;
      const current = state.draft.pois[idx]!;
      const patch = cleanPatch(action.patch);
      let next: Poi = stripUndefined({ ...current, ...patch });
      const explicitId = typeof action.patch.id === 'string' && action.patch.id.trim() !== '';
      const keyChanged = next.category !== current.category || next.zone !== current.zone;
      if (explicitId) {
        next = { ...next, id: action.patch.id!.trim() };
      } else if (keyChanged) {
        const others = state.draft.pois.filter((p) => p.id !== current.id).map((p) => p.id);
        next = { ...next, id: nextPoiId(others, next.category, next.zone) };
      }
      const pois = state.draft.pois.slice();
      pois[idx] = next;
      const selectedId = state.selectedId === current.id ? next.id : state.selectedId;
      const lastZone = next.zone !== current.zone ? next.zone : state.lastZone;
      return { ...state, ...pushHistory(state, { ...state.draft, pois }), selectedId, lastZone };
    }

    case 'deletePoi': {
      if (!state.draft.pois.some((p) => p.id === action.id)) return state;
      const pois = state.draft.pois.filter((p) => p.id !== action.id);
      const selectedId = state.selectedId === action.id ? null : state.selectedId;
      return { ...state, ...pushHistory(state, { ...state.draft, pois }), selectedId };
    }

    case 'undo': {
      const prev = state.past.at(-1);
      if (!prev) return state;
      return {
        ...state,
        draft: prev,
        past: state.past.slice(0, -1),
        future: [state.draft, ...state.future],
        selectedId: prev.pois.some((p) => p.id === state.selectedId) ? state.selectedId : null,
      };
    }

    case 'redo': {
      const [next, ...rest] = state.future;
      if (!next) return state;
      return {
        ...state,
        draft: next,
        past: [...state.past, state.draft],
        future: rest,
        selectedId: next.pois.some((p) => p.id === state.selectedId) ? state.selectedId : null,
      };
    }

    case 'replaceDraft':
      return { ...state, ...pushHistory(state, structuredClone(action.data)), selectedId: null };
  }
}
```

If TypeScript rejects the conditional type in `cleanPatch`'s parameter, declare it as `type UpdatePatch = Partial<Omit<Poi, 'id'>> & { id?: string }` and use that in both the action union and the helper.

- [ ] **Step 4: Write `src/editor/importExport.ts`**

```ts
import { CATEGORY_IDS } from '../data/categories';
import { safeParseMapData, type MapData } from '../data/schema';

export function serializeMapData(data: MapData): string {
  const order = new Map(CATEGORY_IDS.map((id, i) => [id, i]));
  const pois = [...data.pois].sort((a, b) => {
    const ca = order.get(a.category) ?? 99;
    const cb = order.get(b.category) ?? 99;
    if (ca !== cb) return ca - cb;
    return a.id.localeCompare(b.id);
  });
  return JSON.stringify({ ...data, pois }, null, 2) + '\n';
}

export function parseImportText(text: string): { ok: true; data: MapData } | { ok: false; errors: string[] } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (e) {
    return { ok: false, errors: [`Not valid JSON: ${(e as Error).message}`] };
  }
  return safeParseMapData(json);
}

export function downloadJson(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 5: Write `src/editor/useEditorStore.ts`**

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { publishedData } from '../data/publishedData';
import { editorReducer, initialEditorState, type EditorAction, type EditorState } from './editorReducer';

export const EDITOR_STORAGE_KEY = 'hawking-editor-draft-v1';

type EditorStore = EditorState & {
  hydrated: boolean;
  dispatch: (action: EditorAction) => void;
  hasSavedDraft: () => boolean;
};

export const useEditorStore = create<EditorStore>()(
  persist(
    (set, get) => ({
      ...initialEditorState(publishedData),
      hydrated: false,
      dispatch: (action) => set((s) => editorReducer(s, action)),
      hasSavedDraft: () => JSON.stringify(get().draft) !== JSON.stringify(publishedData),
    }),
    {
      name: EDITOR_STORAGE_KEY,
      partialize: (s) => ({ draft: s.draft, lastZone: s.lastZone }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
```

`setHydrated` must exist on the store; add it to the type and to the object: `setHydrated: () => set({ hydrated: true }),` and `setHydrated: () => void;`.

- [ ] **Step 6: Run tests, typecheck, lint, commit**

Run: `npx vitest run src/editor; npm run typecheck; npm run lint`
Expected: PASS (13 tests), clean.

```powershell
git add src/editor
git commit -m "feat(editor): add pure editor reducer, persisted store and JSON import/export"
```

---

### Task 11: Editor UI and lazy loading

**Files:**
- Create: `src/editor/EditorApp.tsx`, `src/editor/EditorPanel.tsx`, `src/editor/EditorTools.tsx`, `src/editor/Inspector.tsx`, `src/editor/PoiList.tsx`, `src/editor/useEditorShortcuts.ts`, `src/editor/Inspector.test.tsx`
- Modify: `src/app/App.tsx`, `src/app/App.test.tsx`

**Interfaces:**
- Consumes: everything from Tasks 6, 7, 10; `ReferenceLayer` (Task 7).
- Produces:
  ```ts
  export default function EditorApp(): JSX.Element;         // default export for React.lazy
  export function EditorPanel(): JSX.Element;               // reads/writes useEditorStore
  export function EditorTools(props: { tool: Tool; onSetTool: (t: Tool) => void; onDeleteSelected: () => void; hasSelection: boolean }): JSX.Element;
  export function Inspector(props: { poi: Poi; onChange: (patch: Partial<Omit<Poi,'id'>> & { id?: string }) => void }): JSX.Element;
  export function PoiList(props: { pois: readonly Poi[]; selectedId: string | null; onSelect: (id: string) => void }): JSX.Element;
  export function useEditorShortcuts(): void;               // Delete/Backspace → deletePoi(selected); Esc → select tool + deselect; Ctrl/Cmd+Z / Ctrl+Shift+Z / Ctrl+Y → undo/redo (ignored while typing)
  ```

- [ ] **Step 1: Write failing test `src/editor/Inspector.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Inspector } from './Inspector';

const poi = { id: 'ammo-hub-01', category: 'ammo', zone: 'hub', x: 10, y: 20 } as const;

describe('Inspector', () => {
  it('shows read-only id and emits patches on change', async () => {
    const onChange = vi.fn();
    render(<Inspector poi={poi} onChange={onChange} />);
    expect(screen.getByLabelText(/^id$/i)).toHaveValue('ammo-hub-01');
    expect(screen.getByLabelText(/^id$/i)).toHaveAttribute('readonly');

    await userEvent.selectOptions(screen.getByLabelText(/zone/i), 'machinery');
    expect(onChange).toHaveBeenLastCalledWith({ zone: 'machinery' });

    const name = screen.getByLabelText(/^name$/i);
    await userEvent.type(name, 'A');
    expect(onChange).toHaveBeenLastCalledWith({ name: 'A' });
  });

  it('game modes are comma-separated and kebab-normalised', async () => {
    const onChange = vi.fn();
    render(<Inspector poi={poi} onChange={onChange} />);
    const modes = screen.getByLabelText(/game modes/i);
    await userEvent.type(modes, 'Classic, Hard Core');
    expect(onChange).toHaveBeenLastCalledWith({ gameModes: ['classic', 'hard-core'] });
  });

  it('advanced toggle makes id editable', async () => {
    const onChange = vi.fn();
    render(<Inspector poi={poi} onChange={onChange} />);
    await userEvent.click(screen.getByRole('checkbox', { name: /advanced/i }));
    const id = screen.getByLabelText(/^id$/i);
    expect(id).not.toHaveAttribute('readonly');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/editor/Inspector.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write `src/editor/Inspector.tsx`**

Note: `Inspector` is a controlled form that reports every keystroke as a patch (the reducer normalises empty strings). To keep typing smooth, it keeps local text state for `gameModes` and numeric fields and emits normalised patches. `kebab()` lowercases, trims, replaces whitespace/underscores with `-`, strips other characters.

```tsx
import { useEffect, useState } from 'react';
import { CATEGORIES } from '../data/categories';
import type { Poi } from '../data/schema';
import { ZONES } from '../data/zones';

type Patch = Partial<Omit<Poi, 'id'>> & { id?: string };

export function kebab(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1 text-xs">
      <span className="uppercase tracking-[0.15em] text-cyan-line/80">{label}</span>
      {children}
    </label>
  );
}

const input = 'rounded border border-cyan-line/30 bg-black/30 px-2 py-1 text-sm text-white outline-none focus:border-cyan-line';

export function Inspector({ poi, onChange }: { poi: Poi; onChange: (patch: Patch) => void }) {
  const [advanced, setAdvanced] = useState(false);
  const [modesText, setModesText] = useState((poi.gameModes ?? []).join(', '));
  useEffect(() => setModesText((poi.gameModes ?? []).join(', ')), [poi.id, poi.gameModes]);

  return (
    <div className="flex flex-col gap-2">
      <Field label="ID" htmlFor="insp-id">
        <input
          id="insp-id"
          className={input}
          value={poi.id}
          readOnly={!advanced}
          onChange={(e) => onChange({ id: e.target.value })}
        />
      </Field>
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={advanced} onChange={(e) => setAdvanced(e.target.checked)} />
        Advanced (edit id manually)
      </label>

      <Field label="Category" htmlFor="insp-category">
        <select id="insp-category" className={input} value={poi.category} onChange={(e) => onChange({ category: e.target.value as Poi['category'] })}>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </Field>

      <Field label="Zone" htmlFor="insp-zone">
        <select id="insp-zone" className={input} value={poi.zone} onChange={(e) => onChange({ zone: e.target.value as Poi['zone'] })}>
          {ZONES.map((z) => (
            <option key={z.id} value={z.id}>{z.label}</option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="X" htmlFor="insp-x">
          <input id="insp-x" type="number" step="0.1" className={input} value={poi.x} onChange={(e) => onChange({ x: Number(e.target.value) })} />
        </Field>
        <Field label="Y" htmlFor="insp-y">
          <input id="insp-y" type="number" step="0.1" className={input} value={poi.y} onChange={(e) => onChange({ y: Number(e.target.value) })} />
        </Field>
      </div>

      <Field label="Name" htmlFor="insp-name">
        <input id="insp-name" className={input} value={poi.name ?? ''} onChange={(e) => onChange({ name: e.target.value })} />
      </Field>

      <Field label="Description" htmlFor="insp-description">
        <textarea id="insp-description" rows={3} maxLength={280} className={input} value={poi.description ?? ''} onChange={(e) => onChange({ description: e.target.value })} />
      </Field>

      <Field label="Variant" htmlFor="insp-variant">
        <input id="insp-variant" className={input} value={poi.variant ?? ''} onChange={(e) => onChange({ variant: kebab(e.target.value) })} />
      </Field>

      <Field label="Game modes (comma-separated)" htmlFor="insp-modes">
        <input
          id="insp-modes"
          className={input}
          value={modesText}
          onChange={(e) => {
            setModesText(e.target.value);
            const list = e.target.value.split(',').map(kebab).filter(Boolean);
            onChange({ gameModes: list });
          }}
        />
      </Field>

      <Field label="Media src (media/<id>.<ext>)" htmlFor="insp-media">
        <input id="insp-media" className={input} value={poi.media?.src ?? ''} onChange={(e) => onChange({ media: e.target.value ? { src: e.target.value, alt: poi.media?.alt } : undefined })} />
      </Field>

      <Field label="Notes (not shown)" htmlFor="insp-notes">
        <textarea id="insp-notes" rows={2} className={input} value={poi.notes ?? ''} onChange={(e) => onChange({ notes: e.target.value })} />
      </Field>
    </div>
  );
}
```

Add `import type React from 'react';` at the top if `React.ReactNode` is not resolved (or import `type ReactNode` and use it).

- [ ] **Step 4: Run the Inspector test**

Run: `npx vitest run src/editor/Inspector.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Write `src/editor/EditorTools.tsx` and `src/editor/PoiList.tsx`**

`EditorTools.tsx`:
```tsx
import { CATEGORIES } from '../data/categories';
import { CategoryIcon } from '../icons/CategoryIcon';
import type { Tool } from './editorReducer';

const btn = 'rounded border px-2 py-1 text-xs uppercase tracking-[0.15em] transition-colors';
const on = 'border-cyan-line bg-cyan-line/20 text-white';
const off = 'border-cyan-line/30 text-cyan-line/80 hover:bg-white/5';

export function EditorTools({
  tool,
  onSetTool,
  onDeleteSelected,
  hasSelection,
}: {
  tool: Tool;
  onSetTool: (t: Tool) => void;
  onDeleteSelected: () => void;
  hasSelection: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1">
        <button type="button" className={`${btn} ${tool.kind === 'select' ? on : off}`} onClick={() => onSetTool({ kind: 'select' })}>
          Select
        </button>
        <button type="button" className={`${btn} ${off} disabled:opacity-40`} disabled={!hasSelection} onClick={onDeleteSelected}>
          Delete
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        {CATEGORIES.map((c) => {
          const active = tool.kind === 'add' && tool.category === c.id;
          return (
            <button
              key={c.id}
              type="button"
              title={`Add ${c.label}`}
              aria-pressed={active}
              className={`${btn} flex items-center gap-1 ${active ? on : off}`}
              onClick={() => onSetTool(active ? { kind: 'select' } : { kind: 'add', category: c.id })}
            >
              <CategoryIcon category={c.id} size={16} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

`PoiList.tsx`:
```tsx
import { useState } from 'react';
import { CATEGORIES, type CategoryId } from '../data/categories';
import type { Poi } from '../data/schema';
import { CategoryIcon } from '../icons/CategoryIcon';
import { displayName } from '../lib/display';

export function PoiList({
  pois,
  selectedId,
  onSelect,
}: {
  pois: readonly Poi[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [filter, setFilter] = useState<CategoryId | 'all'>('all');
  const shown = pois.filter((p) => filter === 'all' || p.category === filter);
  return (
    <div className="flex flex-col gap-1">
      <select
        aria-label="Filter list by category"
        className="rounded border border-cyan-line/30 bg-black/30 px-2 py-1 text-xs"
        value={filter}
        onChange={(e) => setFilter(e.target.value as CategoryId | 'all')}
      >
        <option value="all">All categories ({pois.length})</option>
        {CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label} ({pois.filter((p) => p.category === c.id).length})
          </option>
        ))}
      </select>
      <ul className="max-h-56 overflow-y-auto text-xs">
        {shown.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onSelect(p.id)}
              className={
                'flex w-full items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-white/5 ' +
                (p.id === selectedId ? 'bg-cyan-line/20' : '')
              }
            >
              <CategoryIcon category={p.category} size={14} />
              <span className="truncate">{displayName(p)}</span>
              <span className="ml-auto text-white/40">{p.id}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 6: Write `src/editor/useEditorShortcuts.ts`**

```ts
import { useEffect } from 'react';
import { useEditorStore } from './useEditorStore';

function isTyping(t: EventTarget | null): boolean {
  return (
    t instanceof HTMLElement &&
    (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
  );
}

export function useEditorShortcuts(): void {
  const dispatch = useEditorStore((s) => s.dispatch);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const { selectedId } = useEditorStore.getState();
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: 'undo' });
      } else if ((mod && e.key.toLowerCase() === 'z' && e.shiftKey) || (mod && e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        dispatch({ type: 'redo' });
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        dispatch({ type: 'deletePoi', id: selectedId });
      } else if (e.key === 'Escape') {
        dispatch({ type: 'setTool', tool: { kind: 'select' } });
        dispatch({ type: 'select', id: null });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch]);
}
```

- [ ] **Step 7: Write `src/editor/EditorPanel.tsx`**

```tsx
import { useRef, useState } from 'react';
import { publishedData } from '../data/publishedData';
import { EditorTools } from './EditorTools';
import { Inspector } from './Inspector';
import { PoiList } from './PoiList';
import { downloadJson, parseImportText, serializeMapData } from './importExport';
import { useEditorStore } from './useEditorStore';

const btn = 'rounded border border-cyan-line/30 px-2 py-1 text-xs uppercase tracking-[0.15em] text-cyan-line hover:bg-white/5 disabled:opacity-40';

export function EditorPanel({
  referenceVisible,
  referenceOpacity,
  onReferenceVisible,
  onReferenceOpacity,
  onLocate,
}: {
  referenceVisible: boolean;
  referenceOpacity: number;
  onReferenceVisible: (v: boolean) => void;
  onReferenceOpacity: (v: number) => void;
  onLocate: (id: string) => void;
}) {
  const draft = useEditorStore((s) => s.draft);
  const selectedId = useEditorStore((s) => s.selectedId);
  const tool = useEditorStore((s) => s.tool);
  const past = useEditorStore((s) => s.past.length);
  const future = useEditorStore((s) => s.future.length);
  const dispatch = useEditorStore((s) => s.dispatch);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const selected = draft.pois.find((p) => p.id === selectedId) ?? null;

  const onImportFile = async (file: File) => {
    const r = parseImportText(await file.text());
    if (!r.ok) {
      setImportErrors(r.errors);
      return;
    }
    if (window.confirm(`Replace the current draft with ${r.data.pois.length} POIs from "${file.name}"?`)) {
      dispatch({ type: 'replaceDraft', data: r.data });
      setImportErrors([]);
    }
  };

  return (
    <aside className="pointer-events-auto flex h-full w-[340px] flex-col gap-4 overflow-y-auto border-l border-cyan-line/40 bg-panel/95 p-3 text-sm backdrop-blur">
      <header className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-line">Editor</h2>
        <a href={window.location.pathname} className="text-xs text-white/60 hover:text-white">
          Exit
        </a>
      </header>

      <section>
        <EditorTools
          tool={tool}
          onSetTool={(t) => dispatch({ type: 'setTool', tool: t })}
          hasSelection={!!selected}
          onDeleteSelected={() => selected && dispatch({ type: 'deletePoi', id: selected.id })}
        />
      </section>

      <section className="flex flex-col gap-1">
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={referenceVisible} onChange={(e) => onReferenceVisible(e.target.checked)} />
          Reference overlay (in-game screenshot)
        </label>
        <input
          aria-label="Reference opacity"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={referenceOpacity}
          onChange={(e) => onReferenceOpacity(Number(e.target.value))}
        />
      </section>

      <section>
        <h3 className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/50">Selected POI</h3>
        {selected ? (
          <Inspector poi={selected} onChange={(patch) => dispatch({ type: 'updatePoi', id: selected.id, patch })} />
        ) : (
          <p className="text-xs text-white/50">Click a marker to edit it, or pick a category above and click the map to add one.</p>
        )}
      </section>

      <section>
        <h3 className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/50">POIs</h3>
        <PoiList
          pois={draft.pois}
          selectedId={selectedId}
          onSelect={(id) => {
            dispatch({ type: 'select', id });
            onLocate(id);
          }}
        />
      </section>

      <section className="mt-auto flex flex-col gap-2">
        <div className="flex gap-1">
          <button type="button" className={btn} disabled={past === 0} onClick={() => dispatch({ type: 'undo' })}>Undo</button>
          <button type="button" className={btn} disabled={future === 0} onClick={() => dispatch({ type: 'redo' })}>Redo</button>
        </div>
        <div className="flex gap-1">
          <button type="button" className={btn} onClick={() => fileRef.current?.click()}>Import JSON</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onImportFile(f);
              e.target.value = '';
            }}
          />
          <button type="button" className={btn} onClick={() => downloadJson('hawking-map.json', serializeMapData(draft))}>Export JSON</button>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            className={btn}
            onClick={() => window.confirm('Discard the draft and reload the published data?') && dispatch({ type: 'replaceDraft', data: publishedData })}
          >
            Reset to published
          </button>
        </div>
        {importErrors.length > 0 && (
          <ul className="max-h-32 overflow-y-auto rounded border border-red-400/50 bg-red-950/40 p-2 text-xs text-red-200">
            {importErrors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
        <p className="text-[10px] text-white/40">Draft autosaves in this browser. Export and commit to publish.</p>
      </section>
    </aside>
  );
}
```

`window.confirm` blocks; that is acceptable here — it is a maintainer tool. (When driving the app with browser automation, avoid clicking Import/Reset.)

- [ ] **Step 8: Write `src/editor/EditorApp.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react';
import { countByCategory } from '../app/countByCategory';
import { Legend } from '../legend/Legend';
import { allVisible, type VisibleSet } from '../legend/filterState';
import { MapView } from '../map/MapView';
import { MarkerLayer } from '../map/MarkerLayer';
import { ReferenceLayer } from '../map/ReferenceLayer';
import { EditorPanel } from './EditorPanel';
import { useEditorShortcuts } from './useEditorShortcuts';
import { useEditorStore } from './useEditorStore';

export default function EditorApp() {
  const draft = useEditorStore((s) => s.draft);
  const selectedId = useEditorStore((s) => s.selectedId);
  const tool = useEditorStore((s) => s.tool);
  const hydrated = useEditorStore((s) => s.hydrated);
  const dispatch = useEditorStore((s) => s.dispatch);
  const hasSavedDraft = useEditorStore((s) => s.hasSavedDraft);

  const [visible, setVisible] = useState<VisibleSet>(() => allVisible());
  const [refVisible, setRefVisible] = useState(true);
  const [refOpacity, setRefOpacity] = useState(0.5);
  const [locateId, setLocateId] = useState<string | null>(null);
  const counts = useMemo(() => countByCategory(draft.pois), [draft.pois]);

  useEditorShortcuts();

  // Ask once, after hydration, whether to continue a saved draft.
  const [asked, setAsked] = useState(false);
  useEffect(() => {
    if (!hydrated || asked) return;
    setAsked(true);
    if (hasSavedDraft() && !window.confirm('A saved draft was found. Continue editing it? (Cancel = start from the published data)')) {
      dispatch({ type: 'replaceDraft', data: JSON.parse(JSON.stringify(useEditorStore.getInitialState().draft)) });
    }
  }, [hydrated, asked, hasSavedDraft, dispatch]);

  return (
    <div className="flex h-full w-full">
      <div className="relative min-w-0 flex-1">
        <MapView addMode={tool.kind === 'add'} onMapClick={(p) => dispatch({ type: 'addPoi', ...p })}>
          <ReferenceLayer visible={refVisible} opacity={refOpacity} />
          <MarkerLayer
            pois={draft.pois}
            visible={visible}
            mode="edit"
            selectedId={selectedId}
            onSelect={(id) => dispatch({ type: 'select', id })}
            onMove={(id, p) => dispatch({ type: 'movePoi', id, ...p })}
            openPoiId={locateId}
          />
        </MapView>
        <Legend visible={visible} counts={counts} onChange={setVisible} />
      </div>
      <EditorPanel
        referenceVisible={refVisible}
        referenceOpacity={refOpacity}
        onReferenceVisible={setRefVisible}
        onReferenceOpacity={setRefOpacity}
        onLocate={(id) => {
          setLocateId(null);
          requestAnimationFrame(() => setLocateId(id));
        }}
      />
    </div>
  );
}
```

`useEditorStore.getInitialState()` exists in Zustand 5. In edit mode `MarkerLayer` renders no `<Popup>`, so `openPoiId` only pans to the marker (the `openPopup()` call is a no-op without a bound popup) — that is the intended "locate" behaviour.

- [ ] **Step 9: Update `src/app/App.tsx` and its test**

```tsx
import { lazy, Suspense } from 'react';
import { isEditMode } from './useEditShortcut';
import { ViewerApp } from './ViewerApp';

const EditorApp = lazy(() => import('../editor/EditorApp'));

export function App() {
  if (isEditMode(window.location.search)) {
    return (
      <Suspense fallback={<div className="p-4 text-sm text-cyan-line">Loading editor…</div>}>
        <EditorApp />
      </Suspense>
    );
  }
  return <ViewerApp />;
}
```

Add to `src/app/App.test.tsx`:
```tsx
it('renders the editor when ?edit is present', async () => {
  window.history.pushState({}, '', '/?edit');
  render(<App />);
  expect(await screen.findByRole('heading', { name: /editor/i })).toBeInTheDocument();
  window.history.pushState({}, '', '/');
});
```
(`ReferenceLayer` must also be mocked in that test file: `vi.mock('../map/ReferenceLayer', () => ({ ReferenceLayer: () => null }));`.)

- [ ] **Step 10: Run everything**

Run: `npm test; npm run typecheck; npm run lint; npm run build`
Expected: green; the build output lists a separate `EditorApp-*.js` chunk.

- [ ] **Step 11: Manual verification**

Run `npm run dev`, open `…/?edit`:
- Reference overlay visible at 50 %, slider changes opacity, checkbox hides it.
- Pick a category, click the map → marker appears, inspector shows generated id, `lastZone` default `hub`.
- Change zone in inspector → id regenerates.
- Drag marker → X/Y update. `Delete` key removes. `Esc` returns to Select. Ctrl+Z / Ctrl+Shift+Z work.
- Export downloads `hawking-map.json`; Import of that file (confirm dialog) succeeds; Import of a broken file shows errors.
- Reload page → confirm dialog offers to continue the draft.
- Legend toggles still filter markers.

- [ ] **Step 12: Commit**

```powershell
git add src/editor src/app
git commit -m "feat(editor): add lazy-loaded editor UI with tools, inspector, list, import/export"
```

---

### Task 12: Permalinks (`#poi/<id>`, `#cat/<id>`)

**Files:**
- Create: `src/lib/hash.ts`, `src/lib/hash.test.ts`, `src/app/usePermalink.ts`
- Modify: `src/app/ViewerApp.tsx`

**Interfaces:**
- Consumes: `isCategoryId`, `soloCategory`, `MarkerLayer.openPoiId`/`onPopupOpen`.
- Produces:
  ```ts
  export type HashTarget = { kind: 'poi'; id: string } | { kind: 'cat'; id: CategoryId } | null;
  export function parseHash(hash: string): HashTarget;   // accepts with or without leading '#'
  export function poiHash(id: string): string;           // '#poi/<id>'
  export function catHash(id: CategoryId): string;       // '#cat/<id>'
  export function usePermalink(args: { pois: readonly Poi[]; setVisible: (v: VisibleSet) => void }): { openPoiId: string | null; onPopupOpen: (id: string) => void };
  ```

- [ ] **Step 1: Write failing tests `src/lib/hash.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { catHash, parseHash, poiHash } from './hash';

describe('hash', () => {
  it('parses poi and cat targets', () => {
    expect(parseHash('#poi/healing-hub-01')).toEqual({ kind: 'poi', id: 'healing-hub-01' });
    expect(parseHash('poi/healing-hub-01')).toEqual({ kind: 'poi', id: 'healing-hub-01' });
    expect(parseHash('#cat/black-box')).toEqual({ kind: 'cat', id: 'black-box' });
  });
  it('returns null for unknown shapes and unknown categories', () => {
    expect(parseHash('')).toBeNull();
    expect(parseHash('#foo/bar')).toBeNull();
    expect(parseHash('#cat/not-a-cat')).toBeNull();
    expect(parseHash('#poi/')).toBeNull();
  });
  it('serialises', () => {
    expect(poiHash('ammo-hub-02')).toBe('#poi/ammo-hub-02');
    expect(catHash('weapon')).toBe('#cat/weapon');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/hash.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write `src/lib/hash.ts`**

```ts
import { isCategoryId, type CategoryId } from '../data/categories';

export type HashTarget = { kind: 'poi'; id: string } | { kind: 'cat'; id: CategoryId } | null;

export function parseHash(hash: string): HashTarget {
  const h = hash.startsWith('#') ? hash.slice(1) : hash;
  const m = /^(poi|cat)\/([a-z0-9-]+)$/.exec(h);
  if (!m) return null;
  const [, kind, id] = m;
  if (kind === 'poi' && id) return { kind: 'poi', id };
  if (kind === 'cat' && isCategoryId(id)) return { kind: 'cat', id };
  return null;
}

export function poiHash(id: string): string {
  return `#poi/${id}`;
}

export function catHash(id: CategoryId): string {
  return `#cat/${id}`;
}
```

- [ ] **Step 4: Write `src/app/usePermalink.ts`**

```ts
import { useEffect, useState } from 'react';
import type { Poi } from '../data/schema';
import { soloCategory, type VisibleSet } from '../legend/filterState';
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
```

- [ ] **Step 5: Wire into `src/app/ViewerApp.tsx`**

Replace the body with:
```tsx
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
```
and add `import { usePermalink } from './usePermalink';`.

Edge: if the target POI's category is currently hidden, the marker is not mounted and nothing opens. Handle it in `usePermalink`'s `apply`: for `poi` targets, also call `setVisible(allVisible())` before `setOpenPoiId` (import `allVisible`).

- [ ] **Step 6: Run tests, manual check, commit**

Run: `npm test; npm run typecheck; npm run lint`
Manual: with a temporary POI in the JSON, open `…/#poi/healing-hub-01` → popup opens centred; open `…/#cat/healing` → only healing visible; clicking a marker updates the hash. Remove the temporary POI.

```powershell
git add src/lib/hash.ts src/lib/hash.test.ts src/app/usePermalink.ts src/app/ViewerApp.tsx
git commit -m "feat(app): add #poi and #cat permalinks"
```

---

### Task 13: CI, deploy and README

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `README.md` (replace the one-liner)

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

```yaml
name: CI
on:
  pull_request:
  push:
    branches-ignore: [main]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
```

- [ ] **Step 2: Write `.github/workflows/deploy.yml`**

```yaml
name: Deploy
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Write `README.md`**

```markdown
# HSS Hawking — Interactive Map

Interactive map of the HSS Hawking (the ship from *Species Unknown*): healing points, ammunition,
respawn capsules, information terminals, self-destruction, black-box spawns, pipe levers, weapons.

**Live:** https://brunoborta.github.io/hss-hawking-interactive/

## Develop
    npm install
    npm run dev        # http://localhost:5173/hss-hawking-interactive/
    npm test           # unit tests (Vitest)
    npm run build      # tsc + vite build → dist/
    npm run preview    # serve dist/ locally

## Edit the map
Open the site with `?edit` (or press `E`). Place markers, edit fields, then **Export JSON** and
replace `src/data/hawking-map.json`. Rules: `docs/DATA-GUIDELINES.md`. Regenerating the base /
reference images: `tools/README.md`.

## Links
- `#poi/<id>` opens a POI, e.g. `…/#poi/self-destruct-machinery-01`
- `#cat/<category>` shows one category, e.g. `…/#cat/black-box`

## Layout
- `src/map` Leaflet rendering · `src/legend` filter UI · `src/editor` authoring mode (lazy)
- `src/data` schema + published data · `tools/` asset generation · `docs/` specs and guidelines
```

- [ ] **Step 4: Verify the build locally, commit, push, enable Pages**

Run: `npm run build; npm run preview` — open the preview URL and confirm the app loads at `/hss-hawking-interactive/`.

```powershell
git add .github README.md
git commit -m "ci: add CI and GitHub Pages deploy workflows; write README"
git push origin main
```

Then in the GitHub repo settings → Pages → Source: **GitHub Actions**. Watch the Deploy workflow; open the live URL.

---

## Self-review against the spec

- §5 architecture/boundaries → Tasks 1, 7, 10, 11 (map/editor separation; schema single source; lazy editor). ✔
- §5 coordinate system → Task 4 (`coords.ts`), Task 7 (`IMAGE_BOUNDS`). ✔
- §6 data model + rules + `DATA-GUIDELINES.md` → Task 3. ✔
- §7 MapView/MarkerLayer/PoiPopup/Legend (3-row grid, dim, All/None, dbl-click solo, drawer, counts in tooltip, not persisted) → Tasks 6, 7, 8. ✔
- §7 permalinks (MVP+1) → Task 12. ✔
- §8 editor: activation `?edit`/`E`, tools, reference layer, inspector (read-only id + advanced), list, undo/redo, import/export, reset, draft persistence + continue prompt, keyboard, `lastZone` → Tasks 8, 10, 11. ✔
- §8 rectify + upscale tools → Task 9. ✔
- §9 icons → Task 5. ✔
- §10 scripts, CI, Pages, base path, lazy chunk → Tasks 1, 11, 13. ✔
- §11 tests: schema, reducer, hash, coords, filter logic, real JSON, Legend component → Tasks 3, 4, 6, 10, 12. ✔
- Type consistency check: `MarkerLayer` props (`mode`, `selectedId`, `onSelect`, `onMove`, `onPopupOpen`, `openPoiId`) match uses in Tasks 8, 11, 12; `EditorAction` shapes in Task 11 match Task 10; `VisibleSet` helpers used consistently. ✔
