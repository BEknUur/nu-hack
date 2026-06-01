from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, model_validator


class BBoxLonLat(BaseModel):
    lon_min: float
    lat_min: float
    lon_max: float
    lat_max: float

    @model_validator(mode="after")
    def validate_bbox(self) -> "BBoxLonLat":
        if self.lon_min >= self.lon_max:
            raise ValueError("lon_min must be less than lon_max")
        if self.lat_min >= self.lat_max:
            raise ValueError("lat_min must be less than lat_max")
        return self


class HeatCell(BaseModel):
    lon: float
    lat: float
    lst: float
    ndvi: float
    priority: float


class HeatGridResponse(BaseModel):
    count: int
    cells: list[HeatCell]
    hint: str | None = None


class ScenarioImpactRequest(BaseModel):
    bbox: BBoxLonLat
    n_trees: int | None = Field(default=None, ge=1)
    target_canopy_pct: float | None = Field(default=None, ge=1.0, le=100.0)
    heatwave: bool = False

    @model_validator(mode="after")
    def validate_params(self) -> "ScenarioImpactRequest":
        if self.n_trees is None and self.target_canopy_pct is None:
            raise ValueError("Provide n_trees or target_canopy_pct")
        return self


class ScenarioImpactResponse(BaseModel):
    zone_area_ha: float
    trees_needed: int
    canopy_increase_pct: float
    mean_surface_temp_now_c: float
    estimated_air_cooling_c: float
    co2_uptake_t_per_year: float
    note: str
    error: str | None = None
