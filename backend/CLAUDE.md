# Backend — FastAPI

## Run

```bash
cd backend
uv sync
uv run uvicorn main:app --host 0.0.0.0 --port 8003 --reload
```

Or via Docker: `make app-up` from repo root.

---

## Service Structure

Each service lives in `services/<name>/` with:
- `service.py` — business logic (pure functions)
- `router/router.py` — FastAPI endpoint definitions
- `router/schemas.py` — Pydantic request/response models

```
services/
├── tree_optimizer/    # POST /ml/tree-optimizer/rank, /explain
├── solar_flowers/     # POST /ml/solar-optimizer/rank
├── best_side/         # POST /ml/best-side/predict
├── ml_data/           # POST /ml-data/geocoding/search, /overpass/buildings
└── alemllm/           # POST /alemllm/chat
```

---

## Adding a New Service

1. Create `services/myfeature/service.py` with core logic
2. Create `services/myfeature/router/schemas.py` with Pydantic models
3. Create `services/myfeature/router/router.py` with `APIRouter(prefix="/ml/myfeature")`
4. Register in `main.py`: `app.include_router(myfeature_router)`

---

## API Endpoints

### Tree Optimizer
- **POST** `/ml/tree-optimizer/rank` — rank tree planting spots in an area
  - Body: `{ area_geometry, top_k, summer_weight, min_winter_light, min_spacing_m }`
  - Returns: `{ candidates: [...], meta: {...} }`

- **POST** `/ml/tree-optimizer/explain` — get AI explanation for a candidate
  - Body: `{ candidate, language, summer_weight }`
  - Returns: `{ summary, reasons, caution, source }`

### Solar Optimizer
- **POST** `/ml/solar-optimizer/rank` — rank solar panel spots in an area
  - Body: `{ area_geometry, top_k, optimization_target, panel_type, min_spacing_m }`
  - `optimization_target`: `"max_annual"` | `"max_winter"` | `"balanced"`
  - `panel_type`: `"solar_flower"` | `"ground_mounted"` | `"rooftop"`
  - Returns: `{ candidates: [...], meta: {...} }`

### Best Side Prediction
- **POST** `/ml/best-side/predict` — predict best sun-exposed building side
  - Body: `{ building: { center, height, polygons }, date, tz_offset_hours }`
  - Returns: `{ best_side, confidence, probabilities }`

### ML Data (Proxy APIs)
- **POST** `/ml-data/geocoding/search` — Nominatim geocoding proxy
- **POST** `/ml-data/overpass/buildings` — Overpass API proxy
- **GET** `/ml-data/dataset/geocoding` — export collected geocoding samples
- **GET** `/ml-data/dataset/overpass` — export collected overpass samples

### AlemLLM
- **POST** `/alemllm/chat` — proxy to llm.alem.ai
  - Body: `{ messages: [{role, content}], temperature, max_tokens }`

---

## How Scoring Works

Both tree and solar services:
1. Receive a polygon area (GeoJSON `Polygon` or `MultiPolygon`)
2. Generate a grid of candidate points within the area
3. For each point, query nearby buildings from the cached dataset (`dataset/output/block-summary.json`)
4. Score each point based on multiple factors (shading, density, orientation, etc.)
5. Sort by score, enforce minimum spacing, return top K

Building data is loaded once from `block-summary.json` and cached in memory with spatial bucketing for fast neighbor lookups.

---

## Database

PostgreSQL via SQLAlchemy. Only used by `ml_data` service to store geocoding/overpass request logs for ML dataset collection.

Tables: `geocoding_samples`, `overpass_samples`.

---

## Key Conventions

- **Geometry format**: GeoJSON `[lng, lat]` coordinate order everywhere
- **Response field names**: `snake_case` (frontend translates to camelCase)
- **area_geometry**: supports both `Polygon` and `MultiPolygon` types
- **Fallback behavior**: tree explain endpoint falls back to hardcoded text if AlemLLM is unavailable
