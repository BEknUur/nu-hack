from __future__ import annotations

from fastapi import Query
from fastapi.routing import APIRouter
from starlette.status import HTTP_200_OK

from services.heat_engine import cells_in_bbox, get_grid, scenario_impact
from .schemas import (
    HeatCell,
    HeatGridResponse,
    ScenarioImpactRequest,
    ScenarioImpactResponse,
)

router = APIRouter(prefix="/ml", tags=["heat"])

_MAX_CELLS = 5_000


@router.get(
    "/heat/grid",
    response_model=HeatGridResponse,
    status_code=HTTP_200_OK,
)
def get_heat_grid(
    lon_min: float = Query(..., description="West bound"),
    lat_min: float = Query(..., description="South bound"),
    lon_max: float = Query(..., description="East bound"),
    lat_max: float = Query(..., description="North bound"),
) -> HeatGridResponse:
    """
    Return LST/NDVI/priority grid cells within the requested bbox.
    If the viewport is too large (> 5 000 cells) returns hint='zoom_in'.
    """
    grid = get_grid()
    sub = cells_in_bbox(grid, (lon_min, lat_min, lon_max, lat_max))
    n = int(len(sub["lon"]))

    if n > _MAX_CELLS:
        return HeatGridResponse(count=n, cells=[], hint="zoom_in")

    cells = [
        HeatCell(
            lon=round(float(sub["lon"][i]), 6),
            lat=round(float(sub["lat"][i]), 6),
            lst=round(float(sub["lst"][i]), 1),
            ndvi=round(float(sub["ndvi"][i]), 3),
            priority=round(float(sub["priority"][i]), 4),
        )
        for i in range(n)
    ]
    return HeatGridResponse(count=n, cells=cells)


@router.post(
    "/scenario/impact",
    response_model=ScenarioImpactResponse,
    status_code=HTTP_200_OK,
)
def post_scenario_impact(payload: ScenarioImpactRequest) -> ScenarioImpactResponse:
    """
    Estimate air-cooling and CO₂ impact of planting trees in a zone.
    Supply either n_trees or target_canopy_pct; the other is derived.
    """
    grid = get_grid()
    bbox = (
        payload.bbox.lon_min,
        payload.bbox.lat_min,
        payload.bbox.lon_max,
        payload.bbox.lat_max,
    )
    result = scenario_impact(
        grid=grid,
        bbox=bbox,
        n_trees=payload.n_trees,
        target_canopy_pct=payload.target_canopy_pct,
        heatwave=payload.heatwave,
    )
    return ScenarioImpactResponse(**result)
