# HSS Hawking Interactive Map — Design Spec

**Date:** 2026-08-17
**Status:** Approved for planning
**Scope:** MVP of a standalone, static interactive map of the HSS Hawking (the ship from *Species Unknown*), with a built-in editor mode for authoring point-of-interest data.

---

## 1. Goal and context

Build a public fan site that shows the HSS Hawking floor plan with every point of interest (POI) marked: healing points, ammunition, respawn capsules, information terminals, the self-destruction console, black-box spawn locations, pipe-puzzle levers, and weapons. The in-game map shows some of these but not all (e.g. pipe levers, black-box spawns), and it is only visible inside the game.

The long-term goal is to embed or link this map from the community wiki. Wikis rarely allow arbitrary embeds, so the MVP is a **standalone static site** with a clean data format; wiki integration is a later concern.

Source material in `tools/source/`:

- `hawking-base.webp` (1395×651) — clean floor plan with coloured zones and English zone labels (Shuttle Bay, Production, Laboratory, Crew Quarters, Machinery). Used as the map base.
- `ingame-screenshot.png` — photo of the in-game wall map, in perspective, showing POI icons and the legend panel. Used (a) as a rectified reference layer for authoring and (b) as the visual reference for the legend design.

## 2. Non-goals (MVP)

- No backend, accounts, or server-side state.
- No duct-system drawing (phase 2).
- No search.
- No zone hover/toggle (phase 2).
- No wiki-specific export formats.
- No i18n; UI and content are in English.

## 3. Users and flows

**Visitor** — opens the site, pans/zooms, toggles categories in a legend styled like the in-game one, clicks a marker to see a popup (name, category, optional image/GIF, description). Works on desktop and mobile.

**Maintainer / contributor** — opens `?edit`, places and edits markers over the base map (with the rectified in-game screenshot as an adjustable-opacity reference), exports `hawking-map.json`. The maintainer commits that file; CI validates and deploys. Contributors without Git send the exported JSON to the maintainer (Discord/issue). Phase 2 may add a "Suggest change" flow.

## 4. Technology

| Concern | Choice | Why |
|---|---|---|
| Build / framework | Vite + React 19 + TypeScript (`strict`) | Static SPA; SSR brings nothing here |
| Map rendering | Leaflet via `react-leaflet`, `CRS.Simple` | Battle-tested game-map stack: pan/zoom/touch/inertia, draggable markers, popups, `fitBounds`, tile layers if ever needed; `leaflet-geoman-free` available for phase-2 polylines |
| Data validation | Zod | Single source of truth for the JSON format; used at load, import, and in tests/CI |
| Editor state | Zustand (+ `persist`) | Small, testable reducer; localStorage draft persistence |
| Styling | Tailwind v4 | Fast for panels/legend; Leaflet CSS overridden for theme |
| Tests | Vitest + Testing Library | Logic-heavy units; no Leaflet testing |
| Lint/format | ESLint + Prettier | |
| CI/CD | GitHub Actions → GitHub Pages | |
| One-off asset tools | Python (OpenCV, Pillow) in `tools/` | Perspective rectification and upscaling; outputs committed to `public/` |

Alternatives considered: single-SVG viewport with `react-zoom-pan-pinch` (lighter, fully declarative, but re-implements map UX — popups, zoom controls, touch tuning — and has no tiling path); Canvas/WebGL (overkill).

## 5. Architecture

```
src/
  app/        App.tsx, hash handling, providers
  map/        MapView, BaseLayer, ReferenceLayer, MarkerLayer, PoiPopup
  legend/     Legend (category filter, All/None, mobile drawer)
  editor/     EditorPanel, EditorTools, Inspector, PoiList, useEditorStore, importExport
  data/       schema.ts (zod), categories.ts, zones.ts, hawking-map.json
  icons/      one React SVG component per category
  lib/        coords.ts, hash.ts, storage.ts, ids.ts
public/       base.webp (upscaled), reference.png (rectified), media/, favicon
tools/        upscale.py, rectify.py, README.md, source/
docs/         DATA-GUIDELINES.md, superpowers/specs, superpowers/plans
```

Boundaries:

- `map/` renders whatever `MapData` it is given via props plus a `visibleCategories` set. It does not know about the editor.
- `editor/` owns a **draft** `MapData` (same type as published data) and hands it to `map/`. It is code-split (`React.lazy`) and only loaded when `?edit` is present.
- `data/schema.ts` is the only definition of the file format. `categories.ts` / `zones.ts` hold the closed lists (id, label, icon, colour, legend order).
- `lib/*` are pure modules with unit tests.

### Coordinate system

POI coordinates are **pixels of the original base image (1395×651)**, origin top-left, decimal `x`/`y`. The upscaled base is displayed with `ImageOverlay` bounds `[[0,0],[651,1395]]`, so data is independent of the raster resolution and would survive a later swap to an SVG base. Leaflet's `[lat, lng]` = `[IMAGE_HEIGHT - y, x]` (CRS.Simple lat grows upward); the conversion lives only in `lib/coords.ts`.

## 6. Data model

`src/data/hawking-map.json`:

```ts
type MapData = {
  version: 1;
  image: { width: 1395; height: 651 };
  pois: Poi[];
};

type CategoryId =
  | "healing" | "ammo" | "capsule" | "info"
  | "self-destruct" | "black-box" | "pipe-lever" | "weapon"
  | "command-deck" | "shuttle";   // added after MVP: single fixed spots (map pin / player ship)

type ZoneId =
  | "shuttle-bay" | "production" | "laboratory"
  | "crew-quarters" | "machinery" | "hub";

type Poi = {
  id: string;             // `${category}-${zone}-${nn}`, e.g. "black-box-laboratory-01"
  category: CategoryId;
  zone: ZoneId;           // required
  x: number; y: number;   // base-image pixels
  name?: string;          // Title Case, English; omitted → "<Category> — <Zone>"
  description?: string;   // plain text, ≤ 280 chars
  variant?: string;       // kebab-case; e.g. weapon type
  gameModes?: string[];   // kebab-case; empty/absent = all modes
  media?: { src: string; alt?: string };  // "media/<id>.<ext>" under public/
  notes?: string;         // maintainer-only, never rendered
};
```

Rules enforced by the schema (and therefore by load, import, tests, CI):

- `id` matches `^(<category>)-(<zone>)-\d{2}$` **and** its category/zone parts equal the POI's `category`/`zone`; ids are unique.
- `x`/`y` within image bounds.
- `description` ≤ 280 chars, no HTML.
- `variant`, `gameModes[]`, `media.src` match kebab-case / path patterns.

Category and zone metadata (labels, icons, colours, legend order) live in code, not in the JSON. Ids are stable once published — they are what the wiki links to. Phase 2 bumps `version` to 2 and adds `ducts` with a migration.

Data conventions are documented for humans in `docs/DATA-GUIDELINES.md` (short, with good/bad examples), linked from the README.

## 7. Visitor experience

**MapView**

- `MapContainer` with `crs={CRS.Simple}`, dark background matching the artwork, no attribution control, zoom control in a corner.
- `BaseLayer`: `ImageOverlay` of `public/base.webp` (4× upscale of the source) with bounds `[[0,0],[651,1395]]`.
- `minZoom` computed so the whole ship fits the viewport (`fitBounds` on mount and resize); `maxZoom` ≈ 3; `maxBounds` with some padding.

**MarkerLayer**

- One `Marker` per POI in `visibleCategories`, `icon = L.divIcon` containing the category's inline SVG (~32 px, fixed screen size, so icons stay crisp at any zoom).
- Hover: subtle scale + tooltip with the display name. Click: opens `PoiPopup`.

**PoiPopup**

- Display name (or auto "Category — Zone"), category badge, `variant`, `gameModes` if any, lazy-loaded `media` if any, description.

**Legend** — visually modelled on the in-game panel in the screenshot:

- Bottom-centre panel, dark translucent, thin cyan border, rounded corners, uppercase spaced typography.
- CSS grid with `grid-auto-flow: column` and 3 rows, so 10 categories form 4 columns (3+3+3+1); a new category simply starts a new column. Icon left, label right.
- Click toggles a category; disabled items are dimmed (~35% opacity, desaturated icon). Double-click = "only this one". Small **All** / **None** buttons at the panel's right edge in the same style.
- Per-category counts appear only in a hover tooltip, not in the panel.
- Mobile: the panel becomes a **pull-up drawer** with a handle at the bottom edge.
- Filter state (`Set<CategoryId>`) lives in `App`, defaults to all-on on every load (predictable for wiki visitors), not persisted.

**Permalink (MVP+1, right after A+B)** — `#poi/<id>` centres and opens that POI; `#cat/<id>` shows only that category. Pure `lib/hash.ts` + one effect. Rationale: lets wiki pages deep-link to a specific POI/category, which is the main bridge to the wiki.

## 8. Editor mode

**Activation** — `?edit` in the URL (or pressing `E`, which adds the param). Without it, no editor code is loaded (lazy chunk).

**Layout** — `EditorPanel` docked on the right over the same `MapView`:

1. **Tools**: `Select` (default), `Add <category>` (row of the 8 icons), `Delete`.
2. **Reference layer**: toggle + opacity slider for `public/reference.png` (rectified in-game screenshot), rendered as an `ImageOverlay` above the base and below markers.
3. **Inspector** for the selected POI: id (read-only, derived; an "advanced" toggle allows manual override, still schema-validated), category, zone, name, description, variant, gameModes, media src, notes, numeric `x`/`y`.
4. **POI list**, filterable by category; click centres and selects.
5. **Actions**: Undo / Redo, Import JSON, Export JSON, Reset to published, Clear draft.

**Map interactions** — In `Add` mode a click creates a POI at that coordinate with a generated id (`<category>-<zone>-<nn>`, next free `nn` for that category+zone; existing ids are never renumbered) and focuses the inspector; markers are draggable (drag updates `x`/`y`); click selects; `Delete`/`Backspace` deletes the selection; `Esc` returns to `Select`. Legend filters still apply; default all-on. Zone for a new POI: the last-used zone, editable in the inspector (a later upgrade can infer zone from position once zones are vectorised).

**State** — `useEditorStore` (Zustand): `{ draft: MapData, selectedId, tool, lastZone, past[], future[] }`. All mutations go through a pure `editorReducer(state, action)` (unit-tested). `persist` middleware stores the draft in `localStorage` (`hawking-editor-draft-v1`, debounced). On opening `?edit` with a saved draft, ask "Continue draft or start from published?".

**Import / Export** — Export: `JSON.stringify(draft, null, 2)`, POIs sorted by category then id (stable git diffs), downloaded as `hawking-map.json`. Import: file input → `schema.parse` → on success replace draft (with confirmation); on failure show Zod errors, keep current draft.

**Reference image generation** (`tools/rectify.py`, run once, output committed) — 6–8 manually chosen point correspondences (zone corners, recognisable rooms) between the screenshot and the base → `cv2.findHomography` + `warpPerspective` to 1395×651 → `public/reference.png`. If the in-game panel is curved and a single homography is not enough, split into two halves or accept residual error (it is only a tracing aid).

**Base upscale** (`tools/upscale.py`) — 4× upscale of the source `.webp` (Real-ESRGAN or equivalent; fallback Lanczos) → `public/base.webp`. `tools/README.md` documents how to regenerate both.

## 9. Icons

Eight SVG icons drawn by hand as React components in `src/icons/`, using the in-game icons (screenshot, or extracted textures used only as reference) as visual guidance: healing (green cross), ammo (yellow bullet), capsule (white figure in grey circle), info (pin / "i"), self-destruct (red hazard), black box (purple box), pipe lever, weapon. In-game textures are **not** shipped (raster, and studio-owned).

## 10. Build, CI, deploy

- npm scripts: `dev`, `build`, `preview`, `test`, `lint`, `typecheck`, `validate:data` (schema over the committed JSON; also part of `test`).
- GitHub Actions: on PR → lint + typecheck + test; on push to `main` → same + build + deploy to GitHub Pages. Vite `base` set to the repo path.
- Editor is a separate lazy chunk; visitors never download it.

## 11. Testing

Vitest unit tests for: schema (valid/invalid cases, id regex, uniqueness, bounds), `editorReducer` (add/move/delete/undo/redo, id generation and non-renumbering), `lib/hash.ts` (parse/serialise), `lib/coords.ts`, legend filter logic (toggle/all/none/solo), and the real `hawking-map.json` against the schema. Testing Library only where components carry logic (Legend). Leaflet itself is not tested.

## 12. Phase 2 and later (recorded, out of scope)

1. **Duct system**: polyline drawing/editing tool in the editor (`leaflet-geoman-free`), `ducts` layer toggled from the legend, `version: 2` migration.
2. **Permalinks** `#poi/…` and `#cat/…` if not already done as MVP+1.
3. **Zones**: hover shows zone name, legend toggle for zone overlays; enabled by vectorising the base.
4. **Vector base**: trace zones to SVG (potrace/vtracer per colour + manual cleanup); crisp infinite zoom; unlocks zone polygons and zone inference for new POIs.
5. **"Suggest change"**: export only the diff vs. published data and open a pre-filled GitHub issue (no backend, GitHub account required).
6. Search by POI/room name (currently judged low value).
7. UI i18n; wiki-specific integration (embed or native-map JSON export).
8. **Media upload in the editor**: instead of typing `media.src` by hand, the maintainer/contributor picks an image or GIF in the Inspector; the editor previews it (object URL), stores it alongside the draft (IndexedDB), and **Export** produces a `.zip` containing `hawking-map.json` plus `media/<id>.<ext>` files, ready to drop into `public/`. Import accepts the same zip. Editor also shows live schema-validity feedback (see final review notes).
9. **Editor polish**: "Clear draft" button distinct from "Reset to published"; validate a rehydrated draft against the schema.
