from __future__ import annotations

from datetime import date

from fastapi import HTTPException
from fastapi.routing import APIRouter
from starlette.status import HTTP_200_OK, HTTP_503_SERVICE_UNAVAILABLE

from services.best_side.features import PolygonInput
from services.best_side.model import load_model_or_raise
from .schemas import BestSidePredictRequest, BestSidePredictResponse

router = APIRouter(prefix="/ml/best-side", tags=["best-side"])


@router.post("/predict", response_model=BestSidePredictResponse, status_code=HTTP_200_OK)
def predict_best_side(payload: BestSidePredictRequest) -> BestSidePredictResponse:
    try:
        model = load_model_or_raise()
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    feature_date = payload.date or date.today()
    polygons = [
        PolygonInput(
            outer=[tuple(map(float, point)) for point in polygon.outer],
            holes=[
                [tuple(map(float, point)) for point in hole]
                for hole in polygon.holes
            ],
        )
        for polygon in payload.building.polygons
    ]
    prediction = model.predict_from_polygons(
        polygons,
        center=(payload.building.center.lng, payload.building.center.lat),
        height=payload.building.height,
        feature_date=feature_date,
        tz_offset_hours=payload.tz_offset_hours,
    )
    return BestSidePredictResponse(
        best_side=prediction.best_side,
        confidence=prediction.confidence,
        probabilities=prediction.probabilities,
        model_version=prediction.model_version,
        source=prediction.source,
    )
