# CLAUDE.md — Decentra (Shadow Map)

Read this file before doing anything.

---

## What This Is

## IMPORTANT/CRITIVAL DO NOT USE REACT LUCID ICONS

Interactive map that visualizes **building and terrain shadows** for any date/time. Users move a time slider and shadows shift in real time. Clicking a point tells if it's in sun or shade.

Built for the **alem+ hackathon** (deadline: April 5 2026). Uses `mapbox-gl-shadow-simulator` for shadows, MapLibre GL for rendering, OpenStreetMap buildings via Overpass API.

Default map center: **Astana** `[51.089, 71.416]`.

---

## Quick Start

```bash
# Frontend (React)
cd frontend && npm install && npm run dev    # http://localhost:5173

# Backend (FastAPI) — needs Python 3.12+, uv
cd backend && uv sync && uv run uvicorn main:app --host 0.0.0.0 --port 8003 --reload

# Or via Docker
make app-up        # starts postgres + backend (port 8003)
make dev-frontend  # starts frontend (port 5173)
```

Requires `frontend/.env`:
```
VITE_SHADEMAP_API_KEY=<from shademap.app>
VITE_BACKEND_URL=http://localhost:8003
```

---

## Repository Structure

```
decentra/
├── frontend/           # React 19 + TypeScript + Vite + MapLibre GL
├── backend/            # FastAPI + SQLAlchemy + PostgreSQL
├── dataset/            # Building data generation scripts
│   └── output/         # block-summary.json, block-buildings.geojson
├── docker-compose/     # app.yml (backend+frontend), postgres.yml
├── dockerfiles/        # backend.Dockerfile, frontend.Dockerfile
├── envs/               # dev.env, prod.env
├── Makefile            # All build/run commands
└── CLAUDE.md           # This file
```

---

## Tech Stack

| Layer | Frontend | Backend |
|-------|----------|---------|
| Framework | React 19 + TypeScript | FastAPI + Pydantic |
| Build | Vite 8 | uvicorn |
| Map | MapLibre GL 5.21 | — |
| Shadows | mapbox-gl-shadow-simulator 0.68 | — |
| Styles | Tailwind CSS v3 | — |
| Database | — | PostgreSQL + SQLAlchemy |
| LLM | — | AlemLLM (llm.alem.ai) |
| Path alias | `@/` = `src/` | — |

---

## Scenario Modes (Features)

The app has multiple modes selected by URL. Each mode has its own state hook, UI component, map layers, and optional backend endpoint.

| Route | Mode | What It Does | Backend Endpoint |
|-------|------|-------------|-----------------|
| `/app` | default | Shadow map + building info + sun exposure | `/ml/best-side/predict` |
| `/app/trees` | trees | Find optimal tree planting locations | `/ml/tree-optimizer/rank`, `/explain` |
| `/app/workers` | workers | Simulate outdoor worker crew rotations | (client-side simulation) |
| `/app/solar-flowers` | solarFlowers | Find optimal solar tracker placements | `/ml/solar-optimizer/rank` |
| `/app/apartments` | apartments | Building analysis | Same as default |

**Mode selection**: `getScenarioMode(caseId)` in `frontend/src/pages/MapPage/constants.ts`

---

## Backend API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/ml/tree-optimizer/rank` | Rank tree planting candidates in area |
| POST | `/ml/tree-optimizer/explain` | AI explanation for a tree candidate |
| POST | `/ml/solar-optimizer/rank` | Rank solar panel candidates in area |
| POST | `/ml/best-side/predict` | Predict best sun-exposed building side |
| POST | `/ml-data/geocoding/search` | Geocode addresses (Nominatim proxy) |
| POST | `/ml-data/overpass/buildings` | Fetch buildings (Overpass proxy) |
| POST | `/alemllm/chat` | Chat with AlemLLM |
| GET | `/health` | Health check |

All endpoints accept/return JSON. CORS allows all origins.

---

## Frontend Architecture

```
frontend/src/
├── config/            # map.ts (center, zoom, shadow), runtime.ts (engine=maplibre)
├── types/             # TypeScript types for each feature
├── services/          # API call functions (one per backend service)
├── utils/             # Pure functions: geometry, coordinates, candidates
├── hooks/             # Shared hooks: useDateTime, useMapEngine, useGeocoding
│   └── maplibre/      # MapLibre constants, layer helpers, sources
├── i18n/              # Translations: ru, kk, en
├── components/        # Pure UI components (props in, callbacks out)
│   ├── SolarFlowersWizard/   # Multi-step solar wizard
│   ├── TreeOptimizerWizard/  # Multi-step tree wizard
│   ├── WorkerRotationPanel/  # Worker simulation panel
│   ├── SolarCandidateCard/   # Solar candidate detail card
│   ├── TreeCandidateCard/    # Tree candidate detail card
│   └── ...
└── pages/
    └── MapPage/       # THE orchestrator page
        ├── index.tsx           # Initializes all hooks, renders mode components
        ├── constants.ts        # getScenarioMode(), UI messages by language
        ├── useMapPageEffects.ts # Wires ALL map hooks together
        ├── useTreeState.ts     # Tree mode state machine
        ├── useWorkerState.ts   # Worker mode state machine
        ├── useSolarFlowersState.ts # Solar mode state machine
        ├── MapPageTreeMode.tsx     # Tree mode UI shell
        ├── MapPageWorkerMode.tsx   # Worker mode UI shell
        ├── MapPageSolarFlowersMode.tsx # Solar mode UI shell
        ├── MapPageStandardInfo.tsx     # Default mode UI
        └── hooks/              # MapLibre layer hooks per feature
            ├── useTreeCandidateLayer.ts
            ├── useSolarCandidateLayer.ts
            ├── useSolar3DLayer.ts
            ├── useWorkerCrewLayer.ts
            ├── useMapLibreAreaDrawing.ts  # Drawing rectangles/circles/polygons
            ├── useMapLibreAoiOverlay.ts   # Area-of-interest dashed overlay
            └── useMapViewEffects.ts       # 3D, satellite, shadow date sync
```

**Rule:** `pages/` owns business logic. `components/` is pure JSX.

---

## How to Add a New Scenario Mode

Follow this pattern (example: "wind" mode at `/app/wind`):

1. **`constants.ts`** — add to `getScenarioMode()`: `if (caseId === 'wind') return 'wind'`
2. **`types.ts`** — add `'wind'` to `ScenarioMode` union
3. **`useWindState.ts`** — state hook following `useSolarFlowersState` pattern: wizard steps, area geometry, candidates, loading/error
4. **`MapPageWindMode.tsx`** — UI shell, renders wizard + cards
5. **`hooks/useWindCandidateLayer.ts`** — MapLibre circle layer for candidates (copy from `useSolarCandidateLayer.ts`)
6. **`index.tsx`** — add `const wind = useWindState(...)`, `const isWindMode = ...`, wire into `useMapPageEffects`, render `<MapPageWindMode>`
7. **`useMapPageEffects.ts`** — call the new layer hooks
8. **Backend** (optional) — add `backend/services/wind/` with router + service + schemas

Each scenario is self-contained: URL → state hook → mode component → layer hooks.

---

## MapLibre Layer Pattern

Every feature renders on the map via this pattern:

```typescript
// In hooks/useFeatureLayer.ts
useEffect(() => {
  if (engine !== 'maplibre') return;
  const map = rawMapRef.current as maplibregl.Map;

  const update = () => {
    // 1. Create source if missing
    if (!map.getSource(SOURCE_ID)) {
      map.addSource(SOURCE_ID, { type: 'geojson', data: EMPTY_FEATURE_COLLECTION });
    }
    // 2. Create layer if missing
    if (!map.getLayer(LAYER_ID)) {
      map.addLayer({ id: LAYER_ID, type: 'circle', source: SOURCE_ID, paint: {...} });
    }
    // 3. Set data
    source.setData({ type: 'FeatureCollection', features: candidates.map(c => ...) });
  };

  if (map.isStyleLoaded()) update();
  else map.once('load', update);

  // 4. Interaction handlers
  map.on('click', onClick);
  return () => { map.off('click', onClick); };
}, [dependencies]);
```

Layer IDs are constants in `hooks/maplibre/constants.ts`. GeoJSON uses `[lng, lat]` coordinate order.

---

## Area Drawing System

`useMapLibreAreaDrawing` handles 4 draw modes: `rectangle`, `circle`, `polygon`, `freehand`.

Flow: `arm drawing` → `mousedown` → `mousemove (preview)` → `mouseup (finish)` → geometry returned as `RankAreaGeometry` (GeoJSON Polygon/MultiPolygon).

Geometry utils in `utils/treeArea.ts`: `rectangleToPolygon()`, `circleToPolygon()`, `polygonFromVertices()`, `freehandToPolygon()`.

---

## Key Gotchas

- **MapLibre is the active engine** (`config/runtime.ts`). Leaflet code exists but is unused.
- **Shadow simulator** adds a custom layer to MapLibre — renders within the same WebGL canvas, not a separate overlay.
- **Buildings only load at zoom >= 13** (configurable in `config/map.ts`).
- **Coordinates**: GeoJSON uses `[lng, lat]`, Leaflet uses `[lat, lng]`. All geometry types use GeoJSON convention.
- **Backend field names** use `snake_case`. Frontend uses `camelCase`. Services translate between them.
- **React StrictMode** runs effects twice in dev. Guards like `if (mapRef.current) return` prevent double init.
- **Stale closures**: Functions passed to ShadeMap constructor are never re-created. Use refs: `onLoadingChangeRef.current = onLoadingChange`.
- **Time slider**: range `0-1439` (minutes in a day).

---

## Environment Variables

**Frontend** (`frontend/.env`):
| Variable | Purpose |
|----------|---------|
| `VITE_SHADEMAP_API_KEY` | Shadow map API key (shademap.app) |
| `VITE_BACKEND_URL` | Backend URL (default: http://localhost:8000) |

**Backend** (`envs/dev.env` or `backend/.env`):
| Variable | Purpose |
|----------|---------|
| `ALEM_LLM_API_KEY` | AlemLLM API key |
| `ALEM_POSTGRES_HOST` | PostgreSQL host |
| `ALEM_POSTGRES_PORT` | PostgreSQL port |
| `ALEM_POSTGRES_USER` | PostgreSQL user |
| `ALEM_POSTGRES_PASSWORD` | PostgreSQL password |
| `ALEM_POSTGRES_DB` | Database name |

---

## Makefile Commands

```bash
make dev           # Run frontend + backend locally
make dev-frontend  # Frontend only (port 5173)
make dev-backend   # Backend only (port 8003)
make app-up        # Docker: postgres + backend
make app-down      # Stop docker services
make app-logs      # Tail docker logs
make db-up         # Start PostgreSQL only
```

---

## i18n

Three languages: `ru` (Russian), `kk` (Kazakh), `en` (English). Provider in `i18n/index.tsx`. Use `useTranslation()` hook to get `{ messages, language, setLanguage }`.
