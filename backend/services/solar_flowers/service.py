from __future__ import annotations

import json
import math
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from threading import Lock
from typing import Any, Literal

import httpx

from services.alemllm.config import alemllm_settings
from services.best_side.features import solar_position

SolarProfile = Literal["flower_full_sun", "flower_partial_shade", "solar_panel"]

SUMMARY_DATASET_PATH = Path(__file__).resolve().parents[3] / "dataset" / "output" / "block-summary.json"
_BUCKET_DEG = 0.003
_LLM_TIMEOUT_SECONDS = 18.0


@dataclass(frozen=True)
class BuildingSignal:
    lat: float
    lng: float
    height: float


@dataclass(frozen=True)
class CandidateScore:
    lat: float
    lng: float
    score: float
    sun_hours: float
    light_fit: float
    openness: float
    access_balance: float
    conflict_risk: float
    confidence: float
    nearby_buildings: int
    nearest_building_m: float


_DATASET_LOCK = Lock()
_DATASET_CACHE: tuple[list[BuildingSignal], dict[tuple[int, int], list[int]]] | None = None


def _close_ring(ring: list[tuple[float, float]]) -> list[tuple[float, float]]:
    if len(ring) < 3:
        return ring
    if ring[0] == ring[-1]:
        return ring
    return [*ring, ring[0]]


def _normalize_ring(raw_ring: Any) -> list[tuple[float, float]] | None:
    if not isinstance(raw_ring, list):
        return None

    ring: list[tuple[float, float]] = []
    for point in raw_ring:
        if not isinstance(point, list) or len(point) < 2:
            return None
        lng = point[0]
        lat = point[1]
        if not isinstance(lng, (int, float)) or not isinstance(lat, (int, float)):
            return None
        ring.append((float(lng), float(lat)))

    ring = _close_ring(ring)
    if len(ring) < 4:
        return None
    return ring


def _normalize_geometry(raw_geometry: Any) -> dict[str, Any] | None:
    if not isinstance(raw_geometry, dict):
        return None
    geometry_type = raw_geometry.get("type")
    coordinates = raw_geometry.get("coordinates")
    if geometry_type not in {"Polygon", "MultiPolygon"}:
        return None
    if not isinstance(coordinates, list):
        return None

    if geometry_type == "Polygon":
        rings: list[list[tuple[float, float]]] = []
        for raw_ring in coordinates:
            ring = _normalize_ring(raw_ring)
            if ring is None:
                continue
            rings.append(ring)
        if not rings:
            return None
        return {"type": "Polygon", "coordinates": rings}

    polygons: list[list[list[tuple[float, float]]]] = []
    for raw_polygon in coordinates:
        if not isinstance(raw_polygon, list):
            continue
        polygon_rings: list[list[tuple[float, float]]] = []
        for raw_ring in raw_polygon:
            ring = _normalize_ring(raw_ring)
            if ring is None:
                continue
            polygon_rings.append(ring)
        if polygon_rings:
            polygons.append(polygon_rings)

    if not polygons:
        return None

    return {"type": "MultiPolygon", "coordinates": polygons}


def _geometry_points(geometry: dict[str, Any]) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    geometry_type = geometry.get("type")
    coordinates = geometry.get("coordinates", [])

    if geometry_type == "Polygon":
        for ring in coordinates:
            points.extend(ring)
        return points

    if geometry_type == "MultiPolygon":
        for polygon in coordinates:
            for ring in polygon:
                points.extend(ring)
    return points


def _geometry_bbox(geometry: dict[str, Any]) -> tuple[float, float, float, float] | None:
    points = _geometry_points(geometry)
    if not points:
        return None
    lngs = [lng for lng, _ in points]
    lats = [lat for _, lat in points]
    return min(lats), min(lngs), max(lats), max(lngs)


def _point_in_ring(lat: float, lng: float, ring: list[tuple[float, float]]) -> bool:
    inside = False
    for i in range(len(ring) - 1):
        x1, y1 = ring[i]
        x2, y2 = ring[i + 1]
        intersects = ((y1 > lat) != (y2 > lat)) and (
            lng < (x2 - x1) * (lat - y1) / ((y2 - y1) + 1e-12) + x1
        )
        if intersects:
            inside = not inside
    return inside


def _point_in_polygon(lat: float, lng: float, rings: list[list[tuple[float, float]]]) -> bool:
    if not rings:
        return False
    if not _point_in_ring(lat, lng, rings[0]):
        return False
    for hole in rings[1:]:
        if _point_in_ring(lat, lng, hole):
            return False
    return True


def _point_in_geometry(lat: float, lng: float, geometry: dict[str, Any]) -> bool:
    geometry_type = geometry.get("type")
    coordinates = geometry.get("coordinates", [])
    if geometry_type == "Polygon":
        return _point_in_polygon(lat, lng, coordinates)
    if geometry_type == "MultiPolygon":
        for polygon in coordinates:
            if _point_in_polygon(lat, lng, polygon):
                return True
    return False


def _clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    return max(minimum, min(maximum, value))


def _to_bucket(lat: float, lng: float) -> tuple[int, int]:
    return int(lat / _BUCKET_DEG), int(lng / _BUCKET_DEG)


def _meters_between(a_lat: float, a_lng: float, b_lat: float, b_lng: float) -> float:
    lat_meters = 111_320.0
    lng_meters = 111_320.0 * math.cos(math.radians((a_lat + b_lat) / 2.0))
    dx = (b_lng - a_lng) * lng_meters
    dy = (b_lat - a_lat) * lat_meters
    return math.hypot(dx, dy)


def _bearing_from_a_to_b(a_lat: float, a_lng: float, b_lat: float, b_lng: float) -> float:
    lat_meters = 111_320.0
    lng_meters = 111_320.0 * math.cos(math.radians((a_lat + b_lat) / 2.0))
    dx = (b_lng - a_lng) * lng_meters
    dy = (b_lat - a_lat) * lat_meters
    angle = math.degrees(math.atan2(dx, dy))
    return (angle + 360.0) % 360.0


def _angle_diff(a: float, b: float) -> float:
    d = abs(((a - b) % 360.0 + 360.0) % 360.0)
    return 360.0 - d if d > 180.0 else d


def _estimate_area_km2(south: float, west: float, north: float, east: float) -> float:
    mid_lat = (south + north) / 2.0
    lat_km = max(0.0, north - south) * 111.32
    lng_km = max(0.0, east - west) * 111.32 * max(0.01, math.cos(math.radians(mid_lat)))
    return lat_km * lng_km


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


def _iter_grid_points(
    *,
    south: float,
    west: float,
    north: float,
    east: float,
    step_m: float,
    max_points: int,
) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    step_lat = step_m / 111_320.0

    lat = south
    row = 0
    while lat <= north and len(points) < max_points:
        lng_step = step_m / (111_320.0 * max(0.01, math.cos(math.radians(lat))))
        offset = 0.5 * lng_step if row % 2 else 0.0
        lng = west + offset

        while lng <= east and len(points) < max_points:
            points.append((lat, lng))
            lng += lng_step

        lat += step_lat
        row += 1

    return points


def _profile_windows(profile: SolarProfile) -> tuple[float, float, float, float]:
    if profile == "flower_partial_shade":
        return 2.0, 3.0, 5.0, 6.0
    if profile == "solar_panel":
        return 6.0, 7.0, 10.0, 12.0
    return 5.0, 6.0, 9.0, 11.0


def _light_fit_for_profile(sun_hours: float, profile: SolarProfile) -> float:
    soft_min, ideal_min, ideal_max, soft_max = _profile_windows(profile)

    if ideal_min <= sun_hours <= ideal_max:
        return 1.0
    if soft_min <= sun_hours < ideal_min:
        ratio = (sun_hours - soft_min) / max(1e-6, ideal_min - soft_min)
        return _clamp(0.35 + ratio * 0.65)
    if ideal_max < sun_hours <= soft_max:
        ratio = (sun_hours - ideal_max) / max(1e-6, soft_max - ideal_max)
        return _clamp(1.0 - ratio * 0.65)
    if sun_hours < soft_min:
        return _clamp((sun_hours / max(soft_min, 0.1)) * 0.35)
    return _clamp(0.35 - (sun_hours - soft_max) * 0.07)


def _is_obstructed(
    *,
    candidate_lat: float,
    candidate_lng: float,
    sun_altitude_rad: float,
    sun_azimuth_deg: float,
    nearby_buildings: list[BuildingSignal],
) -> bool:
    if sun_altitude_rad <= 0:
        return True

    for building in nearby_buildings:
        dist_m = _meters_between(candidate_lat, candidate_lng, building.lat, building.lng)
        if dist_m < 1.0:
            continue
        if dist_m > 260.0:
            continue

        bearing = _bearing_from_a_to_b(candidate_lat, candidate_lng, building.lat, building.lng)
        if _angle_diff(bearing, sun_azimuth_deg) > 32.0:
            continue

        apparent_altitude = math.atan2(max(1.0, building.height), dist_m)
        if apparent_altitude > sun_altitude_rad:
            return True

    return False


def _score_candidate(
    *,
    candidate_lat: float,
    candidate_lng: float,
    buildings: list[BuildingSignal],
    buckets: dict[tuple[int, int], list[int]],
    profile: SolarProfile,
    target_date: date,
) -> CandidateScore:
    center_bucket = _to_bucket(candidate_lat, candidate_lng)
    nearby_indices: list[int] = []
    for d_lat in (-1, 0, 1):
        for d_lng in (-1, 0, 1):
            key = (center_bucket[0] + d_lat, center_bucket[1] + d_lng)
            nearby_indices.extend(buckets.get(key, []))

    nearby: list[BuildingSignal] = []
    density_acc = 0.0
    weighted_height = 0.0
    nearby_count = 0
    nearest_m = float("inf")
    radius_m = 240.0

    for idx in nearby_indices:
        b = buildings[idx]
        dist_m = _meters_between(candidate_lat, candidate_lng, b.lat, b.lng)
        if dist_m > radius_m:
            continue
        nearby.append(b)
        nearby_count += 1
        nearest_m = min(nearest_m, dist_m)
        weight = math.exp(-((dist_m / radius_m) ** 2))
        density_acc += weight
        weighted_height += weight * b.height

    if nearby_count == 0:
        density_norm = 0.0
        height_norm = 0.0
        nearest_m = 999.0
    else:
        density_norm = _clamp(density_acc / 8.0)
        height_norm = _clamp((weighted_height / max(1e-6, density_acc)) / 28.0)

    openness = _clamp(1.0 - (0.65 * density_norm + 0.35 * height_norm))
    access_balance = _clamp(1.0 - abs(density_norm - 0.42) / 0.58)
    conflict_risk = _clamp((15.0 - nearest_m) / 15.0) if nearest_m < 15.0 else 0.0
    confidence = _clamp(0.32 + 0.68 * min(1.0, nearby_count / 20.0))

    sunlit_steps = 0
    daylight_steps = 0
    for minute_of_day in range(6 * 60, 20 * 60 + 1, 30):
        hour = minute_of_day // 60
        minute = minute_of_day % 60
        altitude_rad, azimuth_deg = solar_position(
            target_date,
            hour,
            minute,
            latitude=candidate_lat,
            longitude=candidate_lng,
            tz_offset_hours=5,
        )
        if altitude_rad <= 0:
            continue
        daylight_steps += 1
        obstructed = _is_obstructed(
            candidate_lat=candidate_lat,
            candidate_lng=candidate_lng,
            sun_altitude_rad=altitude_rad,
            sun_azimuth_deg=azimuth_deg,
            nearby_buildings=nearby,
        )
        if not obstructed:
            sunlit_steps += 1

    if daylight_steps == 0:
        sun_hours = 0.0
    else:
        sun_hours = sunlit_steps * 0.5

    light_fit = _light_fit_for_profile(sun_hours, profile)
    raw_score = (
        0.65 * light_fit
        + 0.20 * openness
        + 0.10 * access_balance
        - 0.15 * conflict_risk
    )

    return CandidateScore(
        lat=candidate_lat,
        lng=candidate_lng,
        score=round(_clamp(raw_score) * 100.0, 1),
        sun_hours=round(sun_hours, 2),
        light_fit=round(light_fit, 3),
        openness=round(openness, 3),
        access_balance=round(access_balance, 3),
        conflict_risk=round(conflict_risk, 3),
        confidence=round(confidence, 3),
        nearby_buildings=nearby_count,
        nearest_building_m=round(nearest_m, 1),
    )


def rank_solar_points(
    *,
    south: float | None,
    west: float | None,
    north: float | None,
    east: float | None,
    profile: SolarProfile,
    target_date: date,
    top_k: int,
    min_spacing_m: float,
    area_geometry: dict[str, Any] | None = None,
) -> dict[str, Any]:
    buildings, buckets = _load_building_signals()

    normalized_geometry = _normalize_geometry(area_geometry) if area_geometry is not None else None
    selection_mode = "geometry" if normalized_geometry is not None else "bbox"

    if normalized_geometry is not None:
        geometry_bbox = _geometry_bbox(normalized_geometry)
        if geometry_bbox is None:
            return {
                "candidates": [],
                "meta": {
                    "model_version": "solar-flowers-v1",
                    "selection_mode": selection_mode,
                    "area_km2": 0.0,
                    "step_m": 100.0,
                    "generated_points": 0,
                    "scored_points": 0,
                    "profile": profile,
                    "date": target_date,
                },
            }
        south, west, north, east = geometry_bbox

    if south is None or west is None or north is None or east is None:
        raise ValueError("Ranking area is missing")

    area_km2 = _estimate_area_km2(south, west, north, east)
    if area_km2 <= 4.0:
        step_m = 70.0
    elif area_km2 <= 16.0:
        step_m = 100.0
    else:
        step_m = 140.0

    grid_points = _iter_grid_points(
        south=south,
        west=west,
        north=north,
        east=east,
        step_m=step_m,
        max_points=1_800,
    )

    scored: list[CandidateScore] = []
    for lat, lng in grid_points:
        if normalized_geometry is not None and not _point_in_geometry(lat, lng, normalized_geometry):
            continue
        scored.append(
            _score_candidate(
                candidate_lat=lat,
                candidate_lng=lng,
                buildings=buildings,
                buckets=buckets,
                profile=profile,
                target_date=target_date,
            )
        )

    scored.sort(key=lambda item: item.score, reverse=True)

    selected: list[CandidateScore] = []
    for candidate in scored:
        too_close = False
        for chosen in selected:
            if _meters_between(candidate.lat, candidate.lng, chosen.lat, chosen.lng) < min_spacing_m:
                too_close = True
                break
        if too_close:
            continue
        selected.append(candidate)
        if len(selected) >= top_k:
            break

    candidates_payload: list[dict[str, Any]] = []
    for rank, candidate in enumerate(selected, start=1):
        candidates_payload.append(
            {
                "id": f"sf-{rank}-{candidate.lat:.5f}-{candidate.lng:.5f}",
                "rank": rank,
                "lat": round(candidate.lat, 6),
                "lng": round(candidate.lng, 6),
                "score": candidate.score,
                "factors": {
                    "sun_hours": candidate.sun_hours,
                    "light_fit": candidate.light_fit,
                    "openness": candidate.openness,
                    "access_balance": candidate.access_balance,
                    "conflict_risk": candidate.conflict_risk,
                    "confidence": candidate.confidence,
                    "nearby_buildings": candidate.nearby_buildings,
                    "nearest_building_m": candidate.nearest_building_m,
                },
            }
        )

    return {
        "candidates": candidates_payload,
        "meta": {
            "model_version": "solar-flowers-v1",
            "selection_mode": selection_mode,
            "area_km2": round(area_km2, 3),
            "step_m": step_m,
            "generated_points": len(grid_points),
            "scored_points": len(scored),
            "profile": profile,
            "date": target_date,
        },
    }


def _strip_markdown_json(raw_text: str) -> str:
    text = raw_text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if len(lines) >= 3:
            text = "\n".join(lines[1:-1]).strip()
    return text


def _parse_llm_json(content: str) -> dict[str, Any]:
    cleaned = _strip_markdown_json(content)
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start < 0 or end < 0 or end <= start:
        raise ValueError("No JSON object in LLM response")
    obj = json.loads(cleaned[start : end + 1])
    if not isinstance(obj, dict):
        raise ValueError("Expected JSON object from LLM")
    return obj


def _fallback_explanation(*, candidate: dict[str, Any], profile: SolarProfile, language: str) -> dict[str, Any]:
    rank = candidate.get("rank", "-")
    factors = candidate.get("factors", {}) if isinstance(candidate.get("factors"), dict) else {}
    sun_hours = float(factors.get("sun_hours", 0.0))
    light_fit = float(factors.get("light_fit", 0.0))
    openness = float(factors.get("openness", 0.0))
    conflict = float(factors.get("conflict_risk", 0.0))

    profile_labels = {
        "flower_full_sun": {"ru": "цветов на полном солнце", "kk": "толық күн гүлдері", "en": "full-sun flowers"},
        "flower_partial_shade": {"ru": "цветов в полутени", "kk": "жартылай көлеңке гүлдері", "en": "partial-shade flowers"},
        "solar_panel": {"ru": "солнечных панелей", "kk": "күн панельдері", "en": "solar panels"},
    }
    profile_label = profile_labels[profile][language if language in {"ru", "kk", "en"} else "en"]

    if language == "en":
        summary = f"Spot #{rank} is suitable for {profile_label} based on sunlight and surrounding openness."
        reasons = [
            f"Estimated direct sun is {sun_hours:.1f} hours/day with profile fit {light_fit:.2f}.",
            f"Openness score is {openness:.2f}, indicating available sky view for growth or generation.",
            "Spacing and local geometry keep this point usable within the selected area.",
        ]
        caution = "Nearby obstacle risk is low." if conflict < 0.2 else "Nearby obstacles may require slight placement adjustment."
    elif language == "kk":
        summary = f"#{rank} нүктесі {profile_label} үшін күн түсуі мен ашықтық бойынша қолайлы."
        reasons = [
            f"Тікелей күн сәулесі шамамен {sun_hours:.1f} сағ/күн, профиль сәйкестігі {light_fit:.2f}.",
            f"Ашықтық балы {openness:.2f}, бұл жарықтың жеткілікті екенін көрсетеді.",
            "Ара қашықтық пен жергілікті геометрия нүктені практикалық етеді.",
        ]
        caution = "Жақын кедергі қаупі төмен." if conflict < 0.2 else "Жақын кедергілер болғандықтан орынды сәл түзету қажет болуы мүмкін."
    else:
        summary = f"Точка #{rank} подходит для профиля {profile_label} по солнцу и открытости."
        reasons = [
            f"Оценка прямого солнца: {sun_hours:.1f} ч/день, соответствие профилю {light_fit:.2f}.",
            f"Показатель открытости {openness:.2f}, что дает хороший обзор неба.",
            "Шаг точек и геометрия зоны делают размещение практичным.",
        ]
        caution = "Риск близких препятствий низкий." if conflict < 0.2 else "Есть близкие препятствия, возможно потребуется небольшое смещение точки."

    return {
        "summary": summary,
        "reasons": reasons,
        "caution": caution,
        "source": "fallback",
    }


async def explain_solar_point(
    *,
    candidate: dict[str, Any],
    profile: SolarProfile,
    language: str,
    target_date: date,
) -> dict[str, Any]:
    fallback = _fallback_explanation(candidate=candidate, profile=profile, language=language)

    system_prompt = (
        "You are an urban sunlight planning assistant. "
        "Return ONLY valid JSON with keys: summary (string), reasons (array of 3 strings), caution (string). "
        "Use concise plain language, no markdown, no extra keys. "
        "ALWAYS answer in the language specified by DATA.language (ru, kk, en)."
    )

    payload = {
        "language": language,
        "profile": profile,
        "date": str(target_date),
        "candidate": candidate,
    }

    user_prompt = (
        "Explain why this solar/flowers placement point is strong for the selected profile. "
        "Ground strictly in provided numeric factors. "
        f"DATA: {json.dumps(payload, ensure_ascii=False)}"
    )

    try:
        async with httpx.AsyncClient(timeout=_LLM_TIMEOUT_SECONDS) as client:
            response = await client.post(
                "https://llm.alem.ai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {alemllm_settings.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": alemllm_settings.model_name,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "temperature": 0.2,
                    "max_tokens": 320,
                },
            )

        if response.status_code != 200:
            return fallback

        raw_data = response.json()
        content = raw_data.get("choices", [{}])[0].get("message", {}).get("content")
        if not isinstance(content, str) or not content.strip():
            return fallback

        parsed = _parse_llm_json(content)
        summary = parsed.get("summary")
        reasons = parsed.get("reasons")
        caution = parsed.get("caution")

        if not isinstance(summary, str) or not summary.strip():
            return fallback
        if not isinstance(caution, str) or not caution.strip():
            return fallback
        if not isinstance(reasons, list):
            return fallback

        normalized_reasons = [str(item).strip() for item in reasons if str(item).strip()]
        if not normalized_reasons:
            return fallback

        return {
            "summary": summary.strip(),
            "reasons": normalized_reasons[:3],
            "caution": caution.strip(),
            "source": "alemllm",
        }
    except Exception:
        return fallback
