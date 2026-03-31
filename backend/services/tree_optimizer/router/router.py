from __future__ import annotations

from fastapi.routing import APIRouter
from starlette.status import HTTP_200_OK

from services.tree_optimizer.service import explain_tree_point, rank_tree_points

from .schemas import (
    TreeExplainRequest,
    TreeExplainResponse,
    TreeRankRequest,
    TreeRankResponse,
)

router = APIRouter(prefix="/ml/tree-optimizer", tags=["tree-optimizer"])


@router.post(
    "/rank",
    response_model=TreeRankResponse,
    status_code=HTTP_200_OK,
)
def rank_tree_optimizer(payload: TreeRankRequest) -> TreeRankResponse:
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
