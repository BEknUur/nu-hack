from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from math import atan2, cos, pi, sin, sqrt
from typing import Sequence

import numpy as np

CARDINALS = ("N", "E", "S", "W")
SIDE_BEARINGS: dict[str, float] = {
    "N": 0.0,
    "E": 90.0,
    "S": 180.0,
    "W": 270.0,
}


@dataclass(frozen=True)
class PolygonInput:
    outer: list[tuple[float, float]]
    holes: list[list[tuple[float, float]]]


def to_rad(deg: float) -> float:
    return (deg * pi) / 180.0


def to_deg(rad: float) -> float:
    return (rad * 180.0) / pi


def norm360(deg: float) -> float:
    return ((deg % 360.0) + 360.0) % 360.0


def angle_diff(a: float, b: float) -> float:
    d = abs(norm360(a) - norm360(b))
    return 360.0 - d if d > 180.0 else d


def matches_bearing(a: float, b: float, max_deviation: float = 45.0) -> bool:
    return angle_diff(a, b) <= max_deviation


def bearing_from_a_to_b(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat_meters = 111_320.0
    lng_meters = 111_320.0 * cos(to_rad((a[1] + b[1]) / 2.0))
    dx = (b[0] - a[0]) * lng_meters
    dy = (b[1] - a[1]) * lat_meters
    return norm360(to_deg(atan2(dx, dy)))


def centroid_of_ring(ring: Sequence[tuple[float, float]]) -> tuple[float, float] | None:
    if not ring:
        return None
    sum_lng = 0.0
    sum_lat = 0.0
    for lng, lat in ring:
        sum_lng += lng
        sum_lat += lat
    return (sum_lng / len(ring), sum_lat / len(ring))


def close_ring(ring: Sequence[tuple[float, float]]) -> list[tuple[float, float]]:
    points = [(float(lng), float(lat)) for lng, lat in ring]
    if len(points) >= 2 and points[0] != points[-1]:
        points.append(points[0])
    return points


def ring_area_m2(ring: Sequence[tuple[float, float]]) -> float:
    points = close_ring(ring)
    if len(points) < 4:
        return 0.0

    center_lat = sum(lat for _, lat in points) / len(points)
    meters_per_degree_lat = 111_320.0
    meters_per_degree_lng = 111_320.0 * cos(to_rad(center_lat))

    area = 0.0
    for i in range(len(points) - 1):
        lng1, lat1 = points[i]
        lng2, lat2 = points[i + 1]
        x1 = lng1 * meters_per_degree_lng
        y1 = lat1 * meters_per_degree_lat
        x2 = lng2 * meters_per_degree_lng
        y2 = lat2 * meters_per_degree_lat
        area += x1 * y2 - x2 * y1

    return abs(area) / 2.0


def edge_length_m(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat_meters = 111_320.0
    lng_meters = 111_320.0 * cos(to_rad((a[1] + b[1]) / 2.0))
    dx = (b[0] - a[0]) * lng_meters
    dy = (b[1] - a[1]) * lat_meters
    return sqrt(dx * dx + dy * dy)


def solar_position(
    dt: date,
    hour: int,
    minute: int,
    *,
    latitude: float,
    longitude: float,
    tz_offset_hours: int = 5,
) -> tuple[float, float]:
    local_minutes = hour * 60.0 + minute
    day = dt.timetuple().tm_yday
    gamma = (2.0 * pi / 365.0) * (day - 1 + (local_minutes / 60.0 - 12.0) / 24.0)

    equation_of_time = (
        229.18
        * (
            0.000075
            + 0.001868 * cos(gamma)
            - 0.032077 * sin(gamma)
            - 0.014615 * cos(2.0 * gamma)
            - 0.040849 * sin(2.0 * gamma)
        )
    )
    declination = (
        0.006918
        - 0.399912 * cos(gamma)
        + 0.070257 * sin(gamma)
        - 0.006758 * cos(2.0 * gamma)
        + 0.000907 * sin(2.0 * gamma)
        - 0.002697 * cos(3.0 * gamma)
        + 0.00148 * sin(3.0 * gamma)
    )

    time_offset = equation_of_time + 4.0 * longitude - 60.0 * tz_offset_hours
    true_solar_time = (local_minutes + time_offset) % 1440.0
    hour_angle_deg = true_solar_time / 4.0 - 180.0
    hour_angle = to_rad(hour_angle_deg)
    lat_rad = to_rad(latitude)

    altitude = asin_safe(
        sin(lat_rad) * sin(declination) + cos(lat_rad) * cos(declination) * cos(hour_angle)
    )
    azimuth = atan2(
        sin(hour_angle),
        cos(hour_angle) * sin(lat_rad) - tan_safe(declination) * cos(lat_rad),
    )
    azimuth_deg = norm360(to_deg(azimuth) + 180.0)
    return altitude, azimuth_deg


def asin_safe(value: float) -> float:
    if value <= -1.0:
        return -pi / 2.0
    if value >= 1.0:
        return pi / 2.0
    return float(np.arcsin(value))


def tan_safe(value: float) -> float:
    return float(np.tan(value))


def parse_feature_polygons(feature: dict) -> list[PolygonInput]:
    geometry = feature.get("geometry") or {}
    geometry_type = geometry.get("type")
    coordinates = geometry.get("coordinates") or []
    polygons: list[PolygonInput] = []

    if geometry_type == "Polygon":
        outer = [tuple(map(float, pt)) for pt in coordinates[0]] if coordinates else []
        holes = [
            [tuple(map(float, pt)) for pt in hole]
            for hole in coordinates[1:]
        ]
        polygons.append(PolygonInput(outer=outer, holes=holes))
        return polygons

    if geometry_type == "MultiPolygon":
        for poly in coordinates:
            if not poly:
                continue
            outer = [tuple(map(float, pt)) for pt in poly[0]]
            holes = [
                [tuple(map(float, pt)) for pt in hole]
                for hole in poly[1:]
            ]
            polygons.append(PolygonInput(outer=outer, holes=holes))
    return polygons


def center_from_polygons(polygons: Sequence[PolygonInput]) -> tuple[float, float] | None:
    points = [pt for polygon in polygons for pt in polygon.outer]
    if not points:
        return None
    sum_lng = sum(pt[0] for pt in points)
    sum_lat = sum(pt[1] for pt in points)
    return (sum_lng / len(points), sum_lat / len(points))


def bbox_from_polygons(polygons: Sequence[PolygonInput]) -> tuple[float, float, float, float] | None:
    points = [pt for polygon in polygons for pt in polygon.outer]
    if not points:
        return None
    lngs = [pt[0] for pt in points]
    lats = [pt[1] for pt in points]
    return min(lngs), min(lats), max(lngs), max(lats)


def polygon_perimeter_m(polygon: PolygonInput) -> float:
    ring = close_ring(polygon.outer)
    if len(ring) < 2:
        return 0.0
    return sum(edge_length_m(ring[i], ring[i + 1]) for i in range(len(ring) - 1))


def extract_feature_vector(
    polygons: Sequence[PolygonInput],
    *,
    center: tuple[float, float] | None,
    height: float,
    feature_date: date,
    tz_offset_hours: int = 5,
) -> np.ndarray:
    if not polygons:
        raise ValueError("Building geometry must include at least one polygon")

    center_from_geometry = center_from_polygons(polygons)
    if center is None:
        if center_from_geometry is None:
            raise ValueError("Could not infer building center")
        center = center_from_geometry

    total_area = 0.0
    total_perimeter = 0.0
    min_lng = float("inf")
    min_lat = float("inf")
    max_lng = float("-inf")
    max_lat = float("-inf")
    side_lengths = {side: 0.0 for side in CARDINALS}

    for polygon in polygons:
        ring = close_ring(polygon.outer)
        if len(ring) < 4:
            continue
        total_area += ring_area_m2(ring)
        perimeter = polygon_perimeter_m(polygon)
        total_perimeter += perimeter

        for lng, lat in ring:
            min_lng = min(min_lng, lng)
            min_lat = min(min_lat, lat)
            max_lng = max(max_lng, lng)
            max_lat = max(max_lat, lat)

        center_point = {"lng": center[0], "lat": center[1]}
        for i in range(len(ring) - 1):
            a = ring[i]
            b = ring[i + 1]
            edge_len = edge_length_m(a, b)
            if edge_len < 1e-6:
                continue
            mid = ((a[0] + b[0]) / 2.0, (a[1] + b[1]) / 2.0)
            outward_bearing = bearing_from_a_to_b((center_point["lng"], center_point["lat"]), mid)
            target = min(CARDINALS, key=lambda side: angle_diff(outward_bearing, SIDE_BEARINGS[side]))
            side_lengths[target] += edge_len

    if total_perimeter <= 0.0:
        total_perimeter = 1.0

    width_m = max(0.0, (max_lng - min_lng) * 111_320.0 * cos(to_rad(center[1]))) if np.isfinite(max_lng) else 0.0
    height_m = max(0.0, (max_lat - min_lat) * 111_320.0) if np.isfinite(max_lat) else 0.0
    aspect_ratio = width_m / height_m if height_m > 1e-6 else 0.0
    compactness = 4.0 * pi * total_area / (total_perimeter * total_perimeter) if total_perimeter > 0 else 0.0

    month_angle = 2.0 * pi * (feature_date.month - 1) / 12.0
    day_angle = 2.0 * pi * (feature_date.timetuple().tm_yday - 1) / 365.0

    edge_share = {side: side_lengths[side] / total_perimeter for side in CARDINALS}

    return np.array(
        [
            np.log1p(total_area),
            np.log1p(total_perimeter),
            compactness,
            width_m,
            height_m,
            aspect_ratio,
            float(height),
            center[1],
            center[0],
            edge_share["N"],
            edge_share["E"],
            edge_share["S"],
            edge_share["W"],
            sin(month_angle),
            cos(month_angle),
            sin(day_angle),
            cos(day_angle),
        ],
        dtype=np.float64,
    )
