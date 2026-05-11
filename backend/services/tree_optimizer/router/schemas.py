from __future__ import annotations

from typing import Any
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class BBox(BaseModel):
    s: float
    w: float
    n: float
    e: float

    @model_validator(mode="after")
    def validate_bbox(self) -> "BBox":
        if self.s >= self.n:
            raise ValueError("Invalid bbox: south must be less than north")
        if self.w >= self.e:
            raise ValueError("Invalid bbox: west must be less than east")
        return self


class TreeRankRequest(BaseModel):
    bbox: BBox | None = None
    area_geometry: dict[str, Any] | None = None
    top_k: int = Field(default=25, ge=5, le=120)
    summer_weight: float = Field(default=0.55, ge=0.0, le=1.0)
    min_winter_light: float = Field(default=0.25, ge=0.0, le=1.0)
    min_spacing_m: float = Field(default=60.0, ge=10.0, le=500.0)

    @model_validator(mode="after")
    def validate_selection(self) -> "TreeRankRequest":
        if self.bbox is None and self.area_geometry is None:
            raise ValueError("Either bbox or area_geometry is required")
        return self


class TreeRankFactors(BaseModel):
    summer_cooling: float
    winter_light: float
    access_balance: float
    conflict_risk: float
    confidence: float
    nearby_buildings: int
    nearest_building_m: float


class TreeRankCandidate(BaseModel):
    id: str
    rank: int
    lat: float
    lng: float
    score: float
    factors: TreeRankFactors


class TreeRankMeta(BaseModel):
    model_version: str
    selection_mode: Literal["geometry", "bbox"]
    area_km2: float
    step_m: float
    generated_points: int
    scored_points: int


class TreeRankResponse(BaseModel):
    candidates: list[TreeRankCandidate]
    meta: TreeRankMeta


class TreeExplainRequest(BaseModel):
    candidate: TreeRankCandidate
    language: Literal["ru", "kk", "en"] = "ru"
    summer_weight: float = Field(default=0.55, ge=0.0, le=1.0)


class TreeExplainResponse(BaseModel):
    summary: str
    reasons: list[str]
    caution: str
    source: Literal["alemllm", "fallback"]
