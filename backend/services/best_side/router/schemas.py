from __future__ import annotations

from datetime import date as DateType
from typing import Literal

from pydantic import BaseModel, Field

Side = Literal["N", "E", "S", "W"]


class BuildingPolygonInput(BaseModel):
    outer: list[tuple[float, float]]
    holes: list[list[tuple[float, float]]] = Field(default_factory=list)


class BuildingCenterInput(BaseModel):
    lat: float
    lng: float


class BuildingInput(BaseModel):
    id: str | None = None
    label: str | None = None
    center: BuildingCenterInput
    height: float = Field(default=3.0, ge=0.0)
    polygons: list[BuildingPolygonInput]


class BestSidePredictRequest(BaseModel):
    building: BuildingInput
    date: DateType | None = None
    tz_offset_hours: int = Field(default=5, ge=-12, le=14)


class BestSidePredictResponse(BaseModel):
    best_side: Side
    confidence: float
    probabilities: dict[Side, float]
    model_version: str
    source: str
