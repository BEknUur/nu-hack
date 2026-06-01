from __future__ import annotations

from typing import Any

from fastapi.routing import APIRouter
from starlette.status import HTTP_200_OK

from services.heat_engine import get_grid, get_grid_cell_count, rank_planting_sites
from services.tree_optimizer.service import explain_tree_point, rank_tree_points

from .schemas import (
    TreeExplainRequest,
    TreeExplainResponse,
    TreeRankRequest,
    TreeRankResponse,
)

router = APIRouter(prefix="/ml/tree-optimizer", tags=["tree-optimizer"])


def _request_bbox(payload: TreeRankRequest) -> tuple[float, float, float, float] | None:
    """Extract (lon_min, lat_min, lon_max, lat_max) from bbox or area_geometry."""
    if payload.bbox:
        b = payload.bbox
        return (b.w, b.s, b.e, b.n)
    if payload.area_geometry:
        geo = payload.area_geometry
        pts: list[tuple[float, float]] = []
        if geo.get("type") == "Polygon":
            for ring in geo.get("coordinates", []):
                pts.extend((p[0], p[1]) for p in ring if len(p) >= 2)
        elif geo.get("type") == "MultiPolygon":
            for poly in geo.get("coordinates", []):
                for ring in poly:
                    pts.extend((p[0], p[1]) for p in ring if len(p) >= 2)
        if pts:
            lons = [p[0] for p in pts]
            lats = [p[1] for p in pts]
            return (min(lons), min(lats), max(lons), max(lats))
    return None


def _heat_rank_to_response(
    sites: list[dict[str, Any]],
    selection_mode: str,
) -> dict[str, Any]:
    """Map heat_engine planting sites to the existing TreeRankResponse shape."""
    lst_values = [s["lst"] for s in sites]
    lst_min = min(lst_values) if lst_values else 20.0
    lst_range = max(lst_values) - lst_min if lst_values else 1.0

    candidates = []
    for rank, s in enumerate(sites, 1):
        # Map LST to summer_cooling proxy: hotter location = higher cooling benefit
        lst_norm = (s["lst"] - lst_min) / max(lst_range, 1.0)
        candidates.append({
            "id": f"tree-{rank}-{s['lat']:.5f}-{s['lon']:.5f}",
            "rank": rank,
            "lat": s["lat"],
            "lng": s["lon"],
            "score": round(s["priority"] * 100.0, 1),
            "factors": {
                "summer_cooling": round(min(1.0, max(0.0, lst_norm)), 3),
                "winter_light": 0.80,
                "access_balance": 0.50,
                "conflict_risk": 0.00,
                "confidence": 0.85,
                "nearby_buildings": 0,
                "nearest_building_m": 999.0,
            },
        })

    return {
        "candidates": candidates,
        "meta": {
            "model_version": "heat-ranker-v1",
            "selection_mode": selection_mode,
            "area_km2": 0.0,
            "step_m": 100.0,
            "generated_points": len(sites),
            "scored_points": len(sites),
        },
    }


@router.post(
    "/rank",
    response_model=TreeRankResponse,
    status_code=HTTP_200_OK,
)
def rank_tree_optimizer(payload: TreeRankRequest) -> TreeRankResponse:
    # Use heat_engine when the LST/NDVI grid is loaded
    if get_grid_cell_count() > 0:
        bbox = _request_bbox(payload)
        if bbox is not None:
            grid = get_grid()
            sites = rank_planting_sites(grid, bbox, n=payload.top_k)
            if sites:
                selection_mode = "geometry" if payload.area_geometry else "bbox"
                return TreeRankResponse.model_validate(
                    _heat_rank_to_response(sites, selection_mode)
                )

    # Fallback: original shadow / building-density scoring
    ranked = rank_tree_points(
        south=payload.bbox.s if payload.bbox else None,
        west=payload.bbox.w if payload.bbox else None,
        north=payload.bbox.n if payload.bbox else None,
        east=payload.bbox.e if payload.bbox else None,
        top_k=payload.top_k,
        summer_weight=payload.summer_weight,
        min_winter_light=payload.min_winter_light,
        min_spacing_m=payload.min_spacing_m,
        area_geometry=payload.area_geometry,
    )
    return TreeRankResponse.model_validate(ranked)


@router.post(
    "/explain",
    response_model=TreeExplainResponse,
    status_code=HTTP_200_OK,
)
async def explain_tree_optimizer(payload: TreeExplainRequest) -> TreeExplainResponse:
    explanation = await explain_tree_point(
        candidate=payload.candidate.model_dump(mode="json"),
        language=payload.language,
        summer_weight=payload.summer_weight,
    )
    return TreeExplainResponse.model_validate(explanation)
