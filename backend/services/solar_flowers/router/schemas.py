from __future__ import annotations

from typing import Any, Literal

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


class SolarRankRequest(BaseModel):
    bbox: BBox | None = None
    area_geometry: dict[str, Any] | None = None
    top_k: int = Field(default=20, ge=5, le=120)
    optimization_target: Literal["max_annual", "max_winter", "balanced"] = "balanced"
    panel_type: Literal["solar_flower", "ground_mounted", "rooftop"] = "solar_flower"
    min_spacing_m: float = Field(default=30.0, ge=5.0, le=500.0)

    @model_validator(mode="after")
    def validate_selection(self) -> "SolarRankRequest":
        if self.bbox is None and self.area_geometry is None:
            raise ValueError("Either bbox or area_geometry is required")
        return self


class SolarRankFactors(BaseModel):
    annual_irradiance: float
    winter_irradiance: float
    shading_risk: float
    slope_suitability: float
    access_score: float


class SolarRankCandidate(BaseModel):
    id: str
    rank: int
    lat: float
    lng: float
    score: float
    kwh_per_year_est: int
    factors: SolarRankFactors


class SolarRankMeta(BaseModel):
    model_version: str
    selection_mode: Literal["geometry", "bbox"]
    area_km2: float
    step_m: float
    generated_points: int
    scored_points: int


class SolarRankResponse(BaseModel):
    candidates: list[SolarRankCandidate]
    meta: SolarRankMeta
