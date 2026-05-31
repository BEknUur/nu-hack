from __future__ import annotations

import httpx
from fastapi import Depends, HTTPException
from fastapi.routing import APIRouter
from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette.status import HTTP_200_OK, HTTP_500_INTERNAL_SERVER_ERROR

from core.database.session.database import get_db
from services.ml_data.models import GeocodingSample, OverpassSample
from .schemas import (
    GeocodingResult,
    GeocodingSearchRequest,
    GeocodingSearchResponse,
    GeocodingMLRow,
    DatasetQuery,
    OverpassMLRow,
    OverpassRequest,
    OverpassResponse,
)

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

router = APIRouter(prefix="/ml-data", tags=["ml-data"])


def build_overpass_query(s: float, w: float, n: float, e: float, timeout_seconds: int) -> str:
    return (
        f"[out:json][timeout:{timeout_seconds}];"
        f"(way[\"building\"]({s},{w},{n},{e});"
        f"relation[\"building\"]({s},{w},{n},{e}););"
        "out body;>;out skel qt;"
    )


def bbox_area(south: float, west: float, north: float, east: float) -> float:
    lat_span = max(0.0, north - south)
    lng_span = max(0.0, east - west)
    return lat_span * lng_span


@router.post(
    "/geocoding/search",
    response_model=GeocodingSearchResponse,
    status_code=HTTP_200_OK,
)
async def geocoding_search(payload: GeocodingSearchRequest, db: Session = Depends(get_db)) -> GeocodingSearchResponse:
    params = {
        "q": payload.query,
        "format": "json",
        "limit": str(payload.limit),
        "addressdetails": "1",
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(
                NOMINATIM_URL,
                params=params,
                headers={
                    "Accept-Language": payload.language,
                    "User-Agent": "BUTAQ-Backend/1.0",
                },
            )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reach geocoding provider: {exc}",
        )

    if response.status_code != HTTP_200_OK:
        raise HTTPException(status_code=response.status_code, detail=response.text)

    raw_data = response.json()
    if not isinstance(raw_data, list):
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected geocoding response format",
        )
    normalized_results = [
        GeocodingResult(
            id=str(item.get("place_id")),
            display_name=item.get("display_name", ""),
            lat=float(item.get("lat", 0.0)),
            lng=float(item.get("lon", 0.0)),
            bounding_box=(
                float(item.get("boundingbox", [0, 0, 0, 0])[0]),
                float(item.get("boundingbox", [0, 0, 0, 0])[1]),
                float(item.get("boundingbox", [0, 0, 0, 0])[2]),
                float(item.get("boundingbox", [0, 0, 0, 0])[3]),
            ),
        )
        for item in raw_data
    ]

    sample = GeocodingSample(
        query=payload.query,
        limit=payload.limit,
        language=payload.language,
        source=payload.source,
        request_payload=payload.model_dump(mode="json"),
        response_payload=raw_data,
        normalized_payload=[item.model_dump(mode="json") for item in normalized_results],
        results_count=len(normalized_results),
    )
    db.add(sample)
    db.commit()
    db.refresh(sample)

    result = GeocodingSearchResponse(
        sample_id=str(sample.id),
        results=normalized_results,
    )
    return result


@router.post(
    "/overpass/buildings",
    response_model=OverpassResponse,
    status_code=HTTP_200_OK,
)
async def fetch_overpass_buildings(payload: OverpassRequest, db: Session = Depends(get_db)) -> OverpassResponse:
    bbox = payload.bbox
    query = build_overpass_query(bbox.s, bbox.w, bbox.n, bbox.e, payload.timeout_seconds)

    try:
        async with httpx.AsyncClient(timeout=float(payload.timeout_seconds + 10)) as client:
            response = await client.get(
                OVERPASS_URL,
                params={"data": query},
                headers={"User-Agent": "BUTAQ-Backend/1.0"},
            )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reach overpass provider: {exc}",
        )

    if response.status_code != HTTP_200_OK:
        raise HTTPException(status_code=response.status_code, detail=response.text)

    overpass_data = response.json()
    if not isinstance(overpass_data, dict):
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected overpass response format",
        )
    features_count = len(overpass_data.get("elements", []))

    sample = OverpassSample(
        bbox_south=bbox.s,
        bbox_west=bbox.w,
        bbox_north=bbox.n,
        bbox_east=bbox.e,
        timeout_seconds=payload.timeout_seconds,
        source=payload.source,
        overpass_query=query,
        request_payload=payload.model_dump(mode="json"),
        response_payload=overpass_data,
        features_count=features_count,
    )
    db.add(sample)
    db.commit()
    db.refresh(sample)

    result = OverpassResponse(
        sample_id=str(sample.id),
        osm_data=overpass_data,
    )
    return result


@router.get(
    "/dataset/geocoding",
    response_model=list[GeocodingMLRow],
    status_code=HTTP_200_OK,
)
def export_geocoding_dataset(params: DatasetQuery = Depends(), db: Session = Depends(get_db)) -> list[GeocodingMLRow]:
    stmt = (
        select(GeocodingSample)
        .order_by(GeocodingSample.created_at.desc())
        .limit(params.limit)
        .offset(params.offset)
    )
    if params.source:
        stmt = stmt.where(GeocodingSample.source == params.source)

    samples = db.execute(stmt).scalars().all()
    rows: list[GeocodingMLRow] = []

    for sample in samples:
        for idx, item in enumerate(sample.normalized_payload):
            bbox = item.get("bounding_box", [0, 0, 0, 0])
            south = float(bbox[0]) if len(bbox) >= 4 else 0.0
            north = float(bbox[1]) if len(bbox) >= 4 else 0.0
            west = float(bbox[2]) if len(bbox) >= 4 else 0.0
            east = float(bbox[3]) if len(bbox) >= 4 else 0.0

            rows.append(
                GeocodingMLRow(
                    sample_id=str(sample.id),
                    query=sample.query,
                    query_length=len(sample.query),
                    source=sample.source,
                    results_count=sample.results_count,
                    result_rank=idx,
                    lat=float(item.get("lat", 0.0)),
                    lng=float(item.get("lng", 0.0)),
                    bbox_area=bbox_area(south, west, north, east),
                    created_at=sample.created_at.isoformat(),
                )
            )

    return rows


@router.get(
    "/dataset/overpass",
    response_model=list[OverpassMLRow],
    status_code=HTTP_200_OK,
)
def export_overpass_dataset(params: DatasetQuery = Depends(), db: Session = Depends(get_db)) -> list[OverpassMLRow]:
    stmt = (
        select(OverpassSample)
        .order_by(OverpassSample.created_at.desc())
        .limit(params.limit)
        .offset(params.offset)
    )
    if params.source:
        stmt = stmt.where(OverpassSample.source == params.source)

    samples = db.execute(stmt).scalars().all()
    rows: list[OverpassMLRow] = []

    for sample in samples:
        area = bbox_area(sample.bbox_south, sample.bbox_west, sample.bbox_north, sample.bbox_east)
        density = sample.features_count / area if area > 0 else 0.0

        rows.append(
            OverpassMLRow(
                sample_id=str(sample.id),
                source=sample.source,
                timeout_seconds=sample.timeout_seconds,
                bbox_south=sample.bbox_south,
                bbox_west=sample.bbox_west,
                bbox_north=sample.bbox_north,
                bbox_east=sample.bbox_east,
                bbox_area=area,
                features_count=sample.features_count,
                features_density=density,
                created_at=sample.created_at.isoformat(),
            )
        )

    return rows
