from __future__ import annotations

from fastapi.routing import APIRouter
from starlette.status import HTTP_200_OK

from services.solar_flowers.service import explain_solar_point, rank_solar_points

from .schemas import (
    SolarExplainRequest,
    SolarExplainResponse,
    SolarRankRequest,
    SolarRankResponse,
)

router = APIRouter(prefix="/ml/solar-flowers", tags=["solar-flowers"])


@router.post(
    "/rank",
    response_model=SolarRankResponse,
    status_code=HTTP_200_OK,
)
def rank_solar_flowers(payload: SolarRankRequest) -> SolarRankResponse:
    ranked = rank_solar_points(
        south=payload.bbox.s if payload.bbox else None,
        west=payload.bbox.w if payload.bbox else None,
        north=payload.bbox.n if payload.bbox else None,
        east=payload.bbox.e if payload.bbox else None,
        profile=payload.profile,
        target_date=payload.date,
        top_k=payload.top_k,
        min_spacing_m=payload.min_spacing_m,
        area_geometry=payload.area_geometry,
    )
    return SolarRankResponse.model_validate(ranked)


@router.post(
    "/explain",
    response_model=SolarExplainResponse,
    status_code=HTTP_200_OK,
)
async def explain_solar_flowers(payload: SolarExplainRequest) -> SolarExplainResponse:
    explanation = await explain_solar_point(
        candidate=payload.candidate.model_dump(mode="json"),
        profile=payload.profile,
        language=payload.language,
        target_date=payload.date,
    )
    return SolarExplainResponse.model_validate(explanation)
