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
