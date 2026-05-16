# Frontend — React + MapLibre

## Run

```bash
cd frontend && npm install && npm run dev   # http://localhost:5173
```

Needs `.env` with `VITE_SHADEMAP_API_KEY` and `VITE_BACKEND_URL=http://localhost:8003`.

---

## Architecture Rules

1. **`pages/MapPage/index.tsx`** is the orchestrator. It initializes ALL hooks and renders mode components.
2. **`components/`** = pure UI. Props in, callbacks out. No hooks that talk to APIs.
3. **`services/`** = async functions that call the backend. No React.
4. **`hooks/`** = shared React hooks. Each manages one concern.
5. **`pages/MapPage/hooks/`** = MapLibre layer hooks. Each manages one map layer.

---

## MapPage Flow

```
URL (/app/:caseId)
  → getScenarioMode(caseId) → 'trees' | 'workers' | 'solarFlowers' | 'default'
  → boolean flags: isTreeMode, isWorkerMode, isSolarMode
  → state hooks: useTreeState(), useWorkerState(), useSolarFlowersState()
  → useMapPageEffects() wires all layer hooks
  → conditional render: MapPageTreeMode | MapPageWorkerMode | MapPageSolarFlowersMode | MapPageStandardInfo
```

---

## Feature State Hooks Pattern

Each scenario mode has a state hook (`use{Feature}State.ts`) that returns:

```typescript
{
  // Wizard navigation
  wizardStep: 'shape' | 'drawing' | 'settings' | 'results',

  // Drawing state
  drawMode, drawArmed, drawing, areaGeometry, draftGeometry, areaKm2,

  // Feature-specific settings
  ...settings,

  // Results
  candidates: Candidate[], selectedCandidate, loading, error,

  // Actions
  startDrawing(), cancelDrawing(), clearArea(),
  continueToSettings(), goBackToShape(),
  handleRunRanking(),

  // Setters for all state
  set...()
}
```

---

## MapLibre Layer Hooks Pattern

Each candidate layer hook (`use{Feature}CandidateLayer.ts`):

1. Takes `{ engine, rawMapRef, isFeatureMode, candidates, selectedId, drawArmed, drawing, onSelect }`
2. In a `useEffect`, creates GeoJSON source + circle/symbol layers if they don't exist
3. Sets data on the source from candidates array
4. Registers click/mousemove handlers for candidate selection
5. Cleanup removes event listeners (source/layers persist for reuse)

**Coordinates**: GeoJSON format `[lng, lat]` in all geometry and feature objects.

**Layer IDs**: defined as constants in `hooks/maplibre/constants.ts`.

---

## Area Drawing

`useMapLibreAreaDrawing` handles `rectangle | circle | polygon | freehand` drawing.

Activation: set `drawArmed = true` in the state hook. The drawing hook then captures mouse events.

Geometry conversion utils in `utils/treeArea.ts`:
- `rectangleToPolygon(start, end)` → Polygon
- `circleToPolygon(center, radiusM)` → Polygon
- `polygonFromVertices(points)` → Polygon
- `freehandToPolygon(points)` → Polygon

All return `RankAreaGeometry` = GeoJSON Polygon or MultiPolygon.

---

## Services → Backend Mapping

| Frontend Service | Backend Endpoint | Notes |
|-----------------|-----------------|-------|
| `treeOptimizer.ts` | `/ml/tree-optimizer/rank`, `/explain` | Ranking + AI explanation |
| `solarOptimizer.ts` | `/ml/solar-optimizer/rank` | Solar panel ranking |
| `bestSidePrediction.ts` | `/ml/best-side/predict` | Building sun analysis |
| `geocoding.ts` | `/ml-data/geocoding/search` | Address search |
| `buildingSource.ts` | `/ml-data/overpass/buildings` | Fetch OSM buildings |

All services use `VITE_BACKEND_URL` env var. Frontend `camelCase` → backend `snake_case`.

---

## Shadow System

- `mapbox-gl-shadow-simulator` renders as a custom MapLibre layer (same WebGL canvas)
- Configured in `config/map.ts`: shadow color `#01112f`, opacity `0.75`
- Terrain elevation from AWS S3 tiles
- Buildings loaded via Overpass at zoom >= 13
- Shadow date synced via `shadow.setDate(date)` in `useMapViewEffects`

---

## i18n

Provider: `i18n/index.tsx`. Languages: `ru`, `kk`, `en`.

```tsx
const { messages, language, setLanguage } = useTranslation();
```

Per-feature messages: `getTreeUiMessages(language)` in `constants.ts`.

---

## Key Files Reference

| What | File |
|------|------|
| App routes | `App.tsx` |
| Map config (center, zoom) | `config/map.ts` |
| Engine selection | `config/runtime.ts` (currently `'maplibre'`) |
| Scenario mode logic | `pages/MapPage/constants.ts` |
| Main orchestrator | `pages/MapPage/index.tsx` |
| All effects wiring | `pages/MapPage/useMapPageEffects.ts` |
| Tree state | `pages/MapPage/useTreeState.ts` |
| Solar state | `pages/MapPage/useSolarFlowersState.ts` |
| Worker state | `pages/MapPage/useWorkerState.ts` |
| MapLibre layer constants | `hooks/maplibre/constants.ts` |
| MapLibre map init | `hooks/maplibre/useMapLibreMapEngine.ts` |
| Drawing system | `pages/MapPage/hooks/useMapLibreAreaDrawing.ts` |
| Tailwind config | `tailwind.config.js` |
