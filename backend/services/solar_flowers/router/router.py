from __future__ import annotations

from fastapi.routing import APIRouter
from starlette.status import HTTP_200_OK

from services.solar_flowers.service import rank_solar_points
from .schemas import SolarRankRequest, SolarRankResponse

router = APIRouter(prefix="/ml/solar-optimizer", tags=["solar-optimizer"])


@router.post(
    "/rank",
    response_model=SolarRankResponse,
    status_code=HTTP_200_OK,
)
def rank_solar_optimizer(payload: SolarRankRequest) -> SolarRankResponse:
    result = rank_solar_points(
        south=payload.bbox.s if payload.bbox else None,
        west=payload.bbox.w if payload.bbox else None,
        north=payload.bbox.n if payload.bbox else None,
        east=payload.bbox.e if payload.bbox else None,
        area_geometry=payload.area_geometry,
        top_k=payload.top_k,
        optimization_target=payload.optimization_target,
        panel_type=payload.panel_type,
        min_spacing_m=payload.min_spacing_m,
    )
    return SolarRankResponse.model_validate(result)
