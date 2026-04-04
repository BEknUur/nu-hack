# CLAUDE.md — Shadow Map Project

Read this file **before doing anything**. It contains the full project context.

---

## What This Project Is

An interactive Leaflet map that visualizes **building and terrain shadows** for any date and time of day. The user moves a time slider and shadows shift in real time. Clicking any point on the map tells you whether it is in sun or shade.

Uses the `leaflet-shadow-simulator` library (shademap.app). Buildings are loaded from OpenStreetMap via the Overpass API.

---

## Repository Structure

```
/map
├── frontend/          ← the only app — all code lives here
├── plans/             ← markdown task-planning documents
└── CLAUDE.md          ← this file
```

**Everything you need is inside `frontend/`.** There is no backend — frontend only.

---

## Tech Stack

| Layer | Technology |1
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build tool | Vite 8 |
| Styles | Tailwind CSS v3 |
| Map | Leaflet 1.9 |
| Shadows | leaflet-shadow-simulator 0.67 |
| Buildings | Overpass API + osmtogeojson |
| Path alias | `@/` → `src/` |

---

## Getting Started

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
```

Requires `frontend/.env` (not committed to git):
```
VITE_SHADEMAP_API_KEY=<your key from shademap.app>
```
Template: `frontend/.env.example`

---

## src/ Architecture

```
src/
├── config/
│   └── map.ts                        # All constants: map center, zoom, shadow color, terrain source
├── types/
│   ├── map.ts                        # Shared types: ClickInfo
│   └── leaflet-shadow-simulator.d.ts # Hand-written types — the library ships no official .d.ts
├── services/
│   └── overpass.ts                   # fetchBuildings(bbox) — pure async function, no React
├── hooks/
│   ├── useDateTime.ts                # Date/time state, formatting helpers, sliderValue
│   └── useShadeMapSetup.ts           # Leaflet map + ShadeMap layer lifecycle (init & cleanup)
├── components/
│   ├── MapView/                      # Just <div ref={containerRef} /> — pure container
│   ├── ControlPanel/                 # Pure UI: date picker, time slider, Shadows/Sun Exposure toggle
│   └── SunInfoPopup/                 # Pure UI: shows coordinates + sun/shade result on click
└── pages/
    └── MapPage/                      # Orchestrator: hooks, state, useEffects, renders components
```

**Rule:** `pages/` owns business logic. `components/` is pure JSX — only props in, callbacks out.

---

## Key Decisions and Gotchas

### leaflet-shadow-simulator is not a standard Leaflet Layer
The library exports `ShadeMapLeaflet extends EventEmitter` — not `L.Layer`.
- To remove: call `shadeMap.onRemove()` — **not** `shadeMap.remove()` (does not exist)
- `setSunExposure(enabled, options)` — `options` are **required** even when `enabled` is `false`
- `on('idle', cb)` — returns an unsubscribe function, not `this`

### Time slider uses 30-minute steps
Slider range is `0–47` (48 steps × 30 min = 24 h). Conversion:
```ts
setHour(Math.floor(val / 2))
setMinute((val % 2) * 30)
```

### Slider gradient uses a CSS variable
Tailwind cannot express a dynamic gradient. We use a `--pct` CSS custom property:
```tsx
style={{ '--pct': `${sliderPct}%` } as React.CSSProperties}
```
The `.time-slider` and `.date-picker::-webkit-*` styles live in `src/index.css` — the only hand-written CSS in the project.

### Stale closure in getFeatures
`getFeatures` is passed to the ShadeMap constructor once and never re-created. React state inside it would be stale. Use a ref instead:
```ts
// inside useShadeMapSetup.ts
const onLoadingChangeRef = useRef(onLoadingChange);
onLoadingChangeRef.current = onLoadingChange; // kept fresh on every render
```

### Buildings only load at zoom ≥ 15
Overpass API would time out on a large bounding box. Guard in `getFeatures`:
```ts
if (!m || m.getZoom() < MAP_CONFIG.buildingsMinZoom) return [];
```

### Building height from OSM
Priority: `height` → `building:height` → `building:levels × 3` → `3` (1-storey default).
Logic lives in `services/overpass.ts → getBuildingHeight()`.

---

## CSS and Tailwind

- Tailwind v3, config: `frontend/tailwind.config.js`
- Custom animations are defined in `tailwind.config.js → theme.extend.keyframes`:
  - `animate-pulse-dot` — pulsing loading dot in the control panel
  - `animate-slide-up` — SunInfoPopup entrance from below
- `@tailwind` warnings in the IDE CSS linter are **not errors** — the linter simply does not know about Tailwind directives. Everything works fine.
- Arbitrary values use bracket syntax: `bg-[rgba(8,12,28,0.9)]`, `z-[1000]`, `w-[272px]`

---

## Environment Variables

| Variable | Used in |
|----------|---------|
| `VITE_SHADEMAP_API_KEY` | `hooks/useShadeMapSetup.ts` → ShadeMap constructor |

Get a key at: https://shademap.app/about/

---

## Known Quirks

- **React StrictMode** runs effects twice in development. The guard `if (!containerRef.current || mapRef.current) return;` prevents double-initialisation.
- **Terrain shadows** are always visible (DEM tiles from AWS S3). **Building shadows** only appear at zoom ≥ 15.
- `NS_BINDING_ABORTED` in the browser console is normal — Leaflet cancels in-flight tile requests when the viewport changes quickly.
- Default map center is **Almaty** `[43.238, 76.945]`. Change it in `config/map.ts → MAP_CONFIG.center`.
