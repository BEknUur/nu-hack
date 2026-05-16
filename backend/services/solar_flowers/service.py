from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path
from threading import Lock
from typing import Any
import json

SUMMARY_DATASET_PATH = Path(__file__).resolve().parents[3] / "dataset" / "output" / "block-summary.json"

_BUCKET_DEG = 0.003

# Kazakhstan latitude range ~37-56°N; Almaty is ~43.2°N
# Peak sun hours: southern KZ ~5.5h/day, northern KZ ~3.8h/day
_PANEL_WATTS = 200.0
_EFFICIENCY = 0.88
_DAYS_PER_YEAR = 365.0


@dataclass(frozen=True)
class BuildingSignal:
    lat: float
    lng: float
    height: float


@dataclass(frozen=True)
class SolarScore:
    lat: float
    lng: float
    score: float
    annual_irradiance: float   # 0–100
    winter_irradiance: float   # 0–100
    shading_risk: float        # 0–100, high = low risk = good
    slope_suitability: float   # 0–100
    access_score: float        # 0–100
    kwh_per_year_est: int


_DATASET_LOCK = Lock()
_DATASET_CACHE: tuple[list[BuildingSignal], dict[tuple[int, int], list[int]]] | None = None


def _clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, value))


def _to_bucket(lat: float, lng: float) -> tuple[int, int]:
    return int(lat / _BUCKET_DEG), int(lng / _BUCKET_DEG)


def _meters_between(a_lat: float, a_lng: float, b_lat: float, b_lng: float) -> float:
    lat_m = 111_320.0
    lng_m = 111_320.0 * math.cos(math.radians((a_lat + b_lat) / 2.0))
    return math.hypot((b_lng - a_lng) * lng_m, (b_lat - a_lat) * lat_m)


def _bearing_deg(from_lat: float, from_lng: float, to_lat: float, to_lng: float) -> float:
    lat_m = 111_320.0
    mid_lat = (from_lat + to_lat) / 2.0
    lng_m = 111_320.0 * math.cos(math.radians(mid_lat))
    dx = (to_lng - from_lng) * lng_m
    dy = (to_lat - from_lat) * lat_m
    bearing = math.degrees(math.atan2(dx, dy))
    return (bearing + 360.0) % 360.0


def _load_building_signals() -> tuple[list[BuildingSignal], dict[tuple[int, int], list[int]]]:
    global _DATASET_CACHE
    with _DATASET_LOCK:
        if _DATASET_CACHE is not None:
            return _DATASET_CACHE

        if not SUMMARY_DATASET_PATH.exists():
            _DATASET_CACHE = ([], {})
            return _DATASET_CACHE

        raw = json.loads(SUMMARY_DATASET_PATH.read_text(encoding="utf-8"))
        buildings_raw = raw.get("buildings", [])
        if not isinstance(buildings_raw, list):
            _DATASET_CACHE = ([], {})
            return _DATASET_CACHE

        signals: list[BuildingSignal] = []
        buckets: dict[tuple[int, int], list[int]] = {}

        for item in buildings_raw:
            if not isinstance(item, dict):
                continue
            center = item.get("center")
            if not isinstance(center, dict):
                continue
            lat = center.get("lat")
            lng = center.get("lng")
            if not isinstance(lat, (int, float)) or not isinstance(lng, (int, float)):
                continue
            height_raw = item.get("height", 3.0)
            height = float(height_raw) if isinstance(height_raw, (int, float)) else 3.0
            signal = BuildingSignal(lat=float(lat), lng=float(lng), height=max(1.0, height))
            idx = len(signals)
            signals.append(signal)
            bucket_key = _to_bucket(signal.lat, signal.lng)
            buckets.setdefault(bucket_key, []).append(idx)

        _DATASET_CACHE = (signals, buckets)
        return _DATASET_CACHE


def _latitude_irradiance(lat: float) -> tuple[float, float]:
    """
    Returns (annual_base, winter_base) as 0–1 fractions.
    Based on approximate peak sun hours for Central Asia:
    - 30°N: annual ~5.8h, winter ~3.5h
    - 45°N: annual ~4.8h, winter ~2.5h
    - 60°N: annual ~3.6h, winter ~1.5h
    """
    annual_base = _clamp(1.0 - (lat - 30.0) * 0.011, 0.45, 0.95)
    winter_base = _clamp(1.0 - (lat - 30.0) * 0.018, 0.22, 0.85)
    return annual_base, winter_base


def _score_point(
    *,
    lat: float,
    lng: float,
    buildings: list[BuildingSignal],
    buckets: dict[tuple[int, int], list[int]],
    optimization_target: str,
    panel_type: str,
) -> SolarScore:
    center_bucket = _to_bucket(lat, lng)
    nearby_indices: list[int] = []
    for d_lat in (-1, 0, 1):
        for d_lng in (-1, 0, 1):
            key = (center_bucket[0] + d_lat, center_bucket[1] + d_lng)
            nearby_indices.extend(buckets.get(key, []))

    radius_m = 180.0
    south_radius_m = 120.0  # tighter cone for south shading

    density_acc = 0.0
    south_density_acc = 0.0
    height_acc = 0.0
    nearby_count = 0
    nearest_m = float("inf")

    for idx in nearby_indices:
        b = buildings[idx]
        dist_m = _meters_between(lat, lng, b.lat, b.lng)
        if dist_m < 1.0:
            continue
        if dist_m > radius_m:
            continue

        nearby_count += 1
        nearest_m = min(nearest_m, dist_m)
        weight = math.exp(-((dist_m / radius_m) ** 2))
        density_acc += weight
        height_acc += weight * b.height

        # South-side shading: buildings 150°–210° from north block winter sun
        if dist_m <= south_radius_m:
            bearing = _bearing_deg(lat, lng, b.lat, b.lng)
            diff = abs(((bearing - 180.0) + 180.0) % 360.0 - 180.0)
            if diff <= 50.0:
                south_weight = weight * (1.0 - diff / 50.0)
                south_density_acc += south_weight * (b.height / 10.0)

    if nearest_m == float("inf"):
        nearest_m = 999.0

    density_norm = _clamp(density_acc / 6.0)
    height_norm = _clamp(height_acc / max(1e-6, density_acc) / 25.0 if density_acc > 0 else 0.0)
    south_shading_norm = _clamp(south_density_acc / 2.5)

    # Latitude-based base irradiance
    annual_base, winter_base = _latitude_irradiance(lat)

    # Annual irradiance: open areas get more direct radiation
    # Dense building canopy reduces annual irradiance
    sky_open_factor = _clamp(1.0 - density_norm * 0.35 - height_norm * 0.15)
    annual_irr = _clamp(annual_base * sky_open_factor, 0.25, 0.98)

    # Winter irradiance: south-side openness matters most
    winter_irr = _clamp(winter_base * (1.0 - south_shading_norm * 0.55) * (1.0 - density_norm * 0.20), 0.12, 0.95)

    # Shading risk score: high = low risk = good for solar
    # Penalised by nearby tall buildings (height matters more than count)
    shading = _clamp(1.0 - density_norm * 0.55 - height_norm * 0.35 - south_shading_norm * 0.10)

    # Slope suitability: flat urban areas score well
    # Proxy: moderate building presence implies flat, accessible land
    if panel_type == "rooftop":
        # Rooftop: existing buildings needed → more buildings = better
        slope = _clamp(0.55 + density_norm * 0.40)
    else:
        # Ground/solar flower: buildings nearby imply flat urban land
        # but very dense areas are harder to place panels → peak at moderate density
        slope = _clamp(0.60 + 0.35 * (1.0 - abs(density_norm - 0.40) / 0.60))

    # Access score: urban areas (moderate-high density) have infrastructure
    access = _clamp(0.35 + density_norm * 0.55 + (1.0 if nearest_m < 50.0 else 0.0) * 0.10)

    # Composite score based on optimization target (0–1)
    if optimization_target == "max_annual":
        raw = annual_irr * 0.55 + shading * 0.25 + slope * 0.20
    elif optimization_target == "max_winter":
        raw = winter_irr * 0.55 + shading * 0.25 + slope * 0.20
    else:  # balanced
        raw = (
            annual_irr * 0.22
            + winter_irr * 0.22
            + shading * 0.28
            + slope * 0.18
            + access * 0.10
        )

    score_100 = round(_clamp(raw) * 100.0, 1)

    # kWh/year estimate: 200W panel × peak_sun_hours/day × 365 × efficiency
    # Peak sun hours scales with annual_irr relative to 1.0 base
    peak_sun_hours = 3.5 + annual_irr * 2.5  # range ~3.5–6.0h
    kwh = int(round(_PANEL_WATTS * peak_sun_hours * _DAYS_PER_YEAR * _EFFICIENCY * (score_100 / 100.0) / 1000.0))

    return SolarScore(
        lat=lat,
        lng=lng,
        score=score_100,
        annual_irradiance=round(annual_irr * 100.0, 1),
        winter_irradiance=round(winter_irr * 100.0, 1),
        shading_risk=round(shading * 100.0, 1),
        slope_suitability=round(slope * 100.0, 1),
        access_score=round(access * 100.0, 1),
        kwh_per_year_est=max(0, kwh),
    )


def _normalize_ring(raw_ring: Any) -> list[tuple[float, float]] | None:
    if not isinstance(raw_ring, list):
        return None
    ring: list[tuple[float, float]] = []
    for point in raw_ring:
        if not isinstance(point, list) or len(point) < 2:
            return None
        lng, lat = point[0], point[1]
        if not isinstance(lng, (int, float)) or not isinstance(lat, (int, float)):
            return None
        ring.append((float(lng), float(lat)))
    if ring and ring[0] != ring[-1]:
        ring.append(ring[0])
    if len(ring) < 4:
        return None
    return ring


def _normalize_geometry(raw: Any) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    gtype = raw.get("type")
    coords = raw.get("coordinates")
    if gtype not in {"Polygon", "MultiPolygon"} or not isinstance(coords, list):
        return None
    if gtype == "Polygon":
        rings = [_normalize_ring(r) for r in coords]
        rings = [r for r in rings if r]
        return {"type": "Polygon", "coordinates": rings} if rings else None
    polys = []
    for poly in coords:
        if not isinstance(poly, list):
            continue
        rings = [_normalize_ring(r) for r in poly]
        rings = [r for r in rings if r]
        if rings:
            polys.append(rings)
    return {"type": "MultiPolygon", "coordinates": polys} if polys else None


def _geometry_bbox(geometry: dict[str, Any]) -> tuple[float, float, float, float] | None:
    lats, lngs = [], []
    if geometry["type"] == "Polygon":
        for ring in geometry["coordinates"]:
            for lng, lat in ring:
                lats.append(lat); lngs.append(lng)
    else:
        for poly in geometry["coordinates"]:
            for ring in poly:
                for lng, lat in ring:
                    lats.append(lat); lngs.append(lng)
    if not lats:
        return None
    return min(lats), min(lngs), max(lats), max(lngs)


def _point_in_ring(lat: float, lng: float, ring: list[tuple[float, float]]) -> bool:
    inside = False
    for i in range(len(ring) - 1):
        x1, y1 = ring[i]
        x2, y2 = ring[i + 1]
        if ((y1 > lat) != (y2 > lat)) and (lng < (x2 - x1) * (lat - y1) / ((y2 - y1) + 1e-12) + x1):
            inside = not inside
    return inside


def _point_in_geometry(lat: float, lng: float, geometry: dict[str, Any]) -> bool:
    if geometry["type"] == "Polygon":
        rings = geometry["coordinates"]
        if not rings or not _point_in_ring(lat, lng, rings[0]):
            return False
        for hole in rings[1:]:
            if _point_in_ring(lat, lng, hole):
                return False
        return True
    for poly in geometry["coordinates"]:
        if not poly:
            continue
        if not _point_in_ring(lat, lng, poly[0]):
            continue
        in_hole = any(_point_in_ring(lat, lng, hole) for hole in poly[1:])
        if not in_hole:
            return True
    return False


def _estimate_area_km2(south: float, west: float, north: float, east: float) -> float:
    mid_lat = (south + north) / 2.0
    lat_km = max(0.0, north - south) * 111.32
    lng_km = max(0.0, east - west) * 111.32 * max(0.01, math.cos(math.radians(mid_lat)))
    return lat_km * lng_km


def _iter_grid(south: float, west: float, north: float, east: float, step_m: float) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    step_lat = step_m / 111_320.0
    lat = south + step_lat / 2.0
    row = 0
    while lat <= north and len(points) < 2_000:
        lng_step = step_m / (111_320.0 * max(0.01, math.cos(math.radians(lat))))
        offset = 0.5 * lng_step if row % 2 else 0.0
        lng = west + offset + lng_step / 2.0
        while lng <= east and len(points) < 2_000:
            points.append((lat, lng))
            lng += lng_step
        lat += step_lat
        row += 1
    return points


def rank_solar_points(
    *,
    south: float | None,
    west: float | None,
    north: float | None,
    east: float | None,
    area_geometry: dict[str, Any] | None,
    top_k: int,
    optimization_target: str,
    panel_type: str,
    min_spacing_m: float,
) -> dict[str, Any]:
    buildings, buckets = _load_building_signals()

    normalized_geometry = _normalize_geometry(area_geometry) if area_geometry is not None else None
    selection_mode = "geometry" if normalized_geometry is not None else "bbox"

    if normalized_geometry is not None:
        bbox = _geometry_bbox(normalized_geometry)
        if bbox is None:
            return _empty_response(selection_mode)
        south, west, north, east = bbox

    if south is None or west is None or north is None or east is None:
        raise ValueError("Area bounds are missing")

    area_km2 = _estimate_area_km2(south, west, north, east)
    if area_km2 <= 1.0:
        step_m = 25.0
    elif area_km2 <= 4.0:
        step_m = 40.0
    elif area_km2 <= 16.0:
        step_m = 60.0
    else:
        step_m = 100.0

    grid = _iter_grid(south, west, north, east, step_m)
    scored: list[SolarScore] = []

    for lat, lng in grid:
        if normalized_geometry is not None and not _point_in_geometry(lat, lng, normalized_geometry):
            continue
        s = _score_point(
            lat=lat,
            lng=lng,
            buildings=buildings,
            buckets=buckets,
            optimization_target=optimization_target,
            panel_type=panel_type,
        )
        scored.append(s)

    scored.sort(key=lambda s: s.score, reverse=True)

    selected: list[SolarScore] = []
    for candidate in scored:
        too_close = any(
            _meters_between(candidate.lat, candidate.lng, chosen.lat, chosen.lng) < min_spacing_m
            for chosen in selected
        )
        if too_close:
            continue
        selected.append(candidate)
        if len(selected) >= top_k:
            break

    candidates_payload: list[dict[str, Any]] = []
    for rank, s in enumerate(selected, start=1):
        candidates_payload.append({
            "id": f"sf-{rank}-{s.lat:.5f}-{s.lng:.5f}",
            "rank": rank,
            "lat": round(s.lat, 6),
            "lng": round(s.lng, 6),
            "score": s.score,
            "kwh_per_year_est": s.kwh_per_year_est,
            "factors": {
                "annual_irradiance": s.annual_irradiance,
                "winter_irradiance": s.winter_irradiance,
                "shading_risk": s.shading_risk,
                "slope_suitability": s.slope_suitability,
                "access_score": s.access_score,
            },
        })

    return {
        "candidates": candidates_payload,
        "meta": {
            "model_version": "solar-ranker-v1",
            "selection_mode": selection_mode,
            "area_km2": round(area_km2, 3),
            "step_m": step_m,
            "generated_points": len(grid),
            "scored_points": len(scored),
        },
    }


def _empty_response(selection_mode: str) -> dict[str, Any]:
    return {
        "candidates": [],
        "meta": {
            "model_version": "solar-ranker-v1",
            "selection_mode": selection_mode,
            "area_km2": 0.0,
            "step_m": 40.0,
            "generated_points": 0,
            "scored_points": 0,
        },
    }
