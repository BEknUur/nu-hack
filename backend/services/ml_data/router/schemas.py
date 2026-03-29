from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, model_validator


class GeocodingResult(BaseModel):
    id: str
    display_name: str
    lat: float
    lng: float
    bounding_box: tuple[float, float, float, float]


class GeocodingSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=512)
    limit: int = Field(default=5, ge=1, le=20)
    language: str = Field(default="en", min_length=2, max_length=16)
    source: str = Field(default="frontend", min_length=1, max_length=64)


class GeocodingSearchResponse(BaseModel):
    sample_id: str
    results: list[GeocodingResult]


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


class OverpassRequest(BaseModel):
    bbox: BBox
    timeout_seconds: int = Field(default=25, ge=5, le=180)
    source: str = Field(default="frontend", min_length=1, max_length=64)


class OverpassResponse(BaseModel):
    sample_id: str
    osm_data: dict[str, Any]


class DatasetQuery(BaseModel):
    limit: int = Field(default=500, ge=1, le=10_000)
    offset: int = Field(default=0, ge=0)
    source: str | None = Field(default=None, min_length=1, max_length=64)


class GeocodingMLRow(BaseModel):
    sample_id: str
    query: str
    query_length: int
    source: str
    results_count: int
    result_rank: int
    lat: float
    lng: float
    bbox_area: float
    created_at: str


class OverpassMLRow(BaseModel):
    sample_id: str
    source: str
    timeout_seconds: int
    bbox_south: float
    bbox_west: float
    bbox_north: float
    bbox_east: float
    bbox_area: float
    features_count: int
    features_density: float
    created_at: str
