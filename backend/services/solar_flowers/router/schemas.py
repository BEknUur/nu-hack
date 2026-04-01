from __future__ import annotations

from datetime import date as DateType
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


SolarProfile = Literal["flower_full_sun", "flower_partial_shade", "solar_panel"]


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


class SolarRankRequest(BaseModel):
    bbox: BBox | None = None
    area_geometry: dict[str, Any] | None = None
    profile: SolarProfile = "flower_full_sun"
    date: DateType = Field(default_factory=DateType.today)
    top_k: int = Field(default=25, ge=3, le=120)
    min_spacing_m: float = Field(default=60.0, ge=10.0, le=500.0)

    @model_validator(mode="after")
    def validate_selection(self) -> "SolarRankRequest":
        if self.bbox is None and self.area_geometry is None:
            raise ValueError("Either bbox or area_geometry is required")
        return self


class SolarRankFactors(BaseModel):
    sun_hours: float
    light_fit: float
    openness: float
    access_balance: float
    conflict_risk: float
    confidence: float
    nearby_buildings: int
    nearest_building_m: float


class SolarRankCandidate(BaseModel):
    id: str
    rank: int
    lat: float
    lng: float
    score: float
    factors: SolarRankFactors


class SolarRankMeta(BaseModel):
    model_version: str
    selection_mode: Literal["geometry", "bbox"]
    area_km2: float
    step_m: float
    generated_points: int
    scored_points: int
    profile: SolarProfile
    date: DateType


class SolarRankResponse(BaseModel):
    candidates: list[SolarRankCandidate]
    meta: SolarRankMeta


class SolarExplainRequest(BaseModel):
    candidate: SolarRankCandidate
    profile: SolarProfile
    language: Literal["ru", "kk", "en"] = "ru"
    date: DateType = Field(default_factory=DateType.today)


class SolarExplainResponse(BaseModel):
    summary: str
    reasons: list[str]
    caution: str
    source: Literal["alemllm", "fallback"]
