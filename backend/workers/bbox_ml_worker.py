from __future__ import annotations

import argparse
import asyncio
import csv
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx

# Target bbox corners from user request.
LAT_1, LON_1 = 51.0982, 71.4061
LAT_2, LON_2 = 51.0835, 71.4227

BBOX_SOUTH = min(LAT_1, LAT_2)
BBOX_NORTH = max(LAT_1, LAT_2)
BBOX_WEST = min(LON_1, LON_2)
BBOX_EAST = max(LON_1, LON_2)

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse"


@dataclass
class BuildingFeature:
    osm_way_id: int
    centroid_lat: float
    centroid_lng: float
    bbox_area: float
    levels: float
    height: float
    geocode_type: str
    geocode_class: str
    road: str
    suburb: str
    city: str
    country: str
    collected_at: str


def parse_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def estimate_height(tags: dict[str, Any]) -> tuple[float, float]:
    levels = parse_float(tags.get("building:levels"), 0.0)
    height = parse_float(tags.get("height"), 0.0)
    if height <= 0 and levels > 0:
        height = levels * 3.0
    if height <= 0:
        height = 3.0
    return levels, height


def bbox_area(coords: list[tuple[float, float]]) -> float:
    if not coords:
        return 0.0
    lats = [lat for lat, _ in coords]
    lngs = [lng for _, lng in coords]
    return max(0.0, max(lats) - min(lats)) * max(0.0, max(lngs) - min(lngs))


def centroid(coords: list[tuple[float, float]]) -> tuple[float, float]:
    if not coords:
        return 0.0, 0.0
    lat_sum = sum(lat for lat, _ in coords)
    lng_sum = sum(lng for _, lng in coords)
    n = len(coords)
    return lat_sum / n, lng_sum / n


async def fetch_overpass(client: httpx.AsyncClient, timeout_seconds: int) -> dict[str, Any]:
    query = (
        f"[out:json][timeout:{timeout_seconds}];"
        f"(way[\"building\"]({BBOX_SOUTH},{BBOX_WEST},{BBOX_NORTH},{BBOX_EAST});"
        f"relation[\"building\"]({BBOX_SOUTH},{BBOX_WEST},{BBOX_NORTH},{BBOX_EAST}););"
        "out body;>;out skel qt;"
    )

    res = await client.get(
        OVERPASS_URL,
        params={"data": query},
        headers={"User-Agent": "BBoxMLWorker/1.0"},
        timeout=timeout_seconds + 10,
    )
    res.raise_for_status()

    data = res.json()
    if not isinstance(data, dict):
        raise ValueError("Unexpected Overpass response")
    return data


async def reverse_geocode(client: httpx.AsyncClient, lat: float, lng: float) -> dict[str, Any]:
    res = await client.get(
        NOMINATIM_REVERSE_URL,
        params={
            "lat": lat,
            "lon": lng,
            "format": "json",
            "addressdetails": 1,
            "zoom": 18,
        },
        headers={"Accept-Language": "en", "User-Agent": "BBoxMLWorker/1.0"},
        timeout=20,
    )
    res.raise_for_status()

    data = res.json()
    if not isinstance(data, dict):
        return {}
    return data


def extract_way_rows(overpass_data: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[int, tuple[float, float]]]:
    elements = overpass_data.get("elements", [])
    if not isinstance(elements, list):
        return [], {}

    node_map: dict[int, tuple[float, float]] = {}
    ways: list[dict[str, Any]] = []

    for element in elements:
        if not isinstance(element, dict):
            continue
        etype = element.get("type")

        if etype == "node":
            node_id = element.get("id")
            lat = element.get("lat")
            lon = element.get("lon")
            if isinstance(node_id, int) and lat is not None and lon is not None:
                node_map[node_id] = (float(lat), float(lon))

        elif etype == "way":
            tags = element.get("tags", {})
            if isinstance(tags, dict) and tags.get("building"):
                ways.append(element)

    return ways, node_map


async def collect_once(output_file: Path, timeout_seconds: int, max_buildings: int) -> int:
    output_file.parent.mkdir(parents=True, exist_ok=True)

    async with httpx.AsyncClient() as client:
        overpass_data = await fetch_overpass(client, timeout_seconds=timeout_seconds)
        ways, node_map = extract_way_rows(overpass_data)

        rows: list[BuildingFeature] = []
        collected_at = datetime.now(timezone.utc).isoformat()

        for way in ways[:max_buildings]:
            node_ids = way.get("nodes", [])
            if not isinstance(node_ids, list):
                continue

            coords = [node_map[nid] for nid in node_ids if isinstance(nid, int) and nid in node_map]
            if len(coords) < 3:
                continue

            center_lat, center_lng = centroid(coords)
            tags = way.get("tags", {}) if isinstance(way.get("tags"), dict) else {}
            levels, height = estimate_height(tags)

            try:
                geo = await reverse_geocode(client, center_lat, center_lng)
            except Exception:
                geo = {}

            address = geo.get("address", {}) if isinstance(geo.get("address"), dict) else {}

            rows.append(
                BuildingFeature(
                    osm_way_id=int(way.get("id", 0)),
                    centroid_lat=center_lat,
                    centroid_lng=center_lng,
                    bbox_area=bbox_area(coords),
                    levels=levels,
                    height=height,
                    geocode_type=str(geo.get("type", "")),
                    geocode_class=str(geo.get("class", "")),
                    road=str(address.get("road", "")),
                    suburb=str(address.get("suburb", "")),
                    city=str(address.get("city", address.get("town", ""))),
                    country=str(address.get("country", "")),
                    collected_at=collected_at,
                )
            )

            # Respect Nominatim rate limits.
            await asyncio.sleep(1.0)

    write_header = not output_file.exists() or output_file.stat().st_size == 0
    with output_file.open("a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "osm_way_id",
                "centroid_lat",
                "centroid_lng",
                "bbox_area",
                "levels",
                "height",
                "geocode_type",
                "geocode_class",
                "road",
                "suburb",
                "city",
                "country",
                "collected_at",
            ],
        )
        if write_header:
            writer.writeheader()

        for row in rows:
            writer.writerow(row.__dict__)

    return len(rows)


async def worker_loop(output_file: Path, timeout_seconds: int, max_buildings: int, interval_seconds: int, runs: int) -> None:
    run = 0
    while True:
        run += 1
        rows = await collect_once(output_file, timeout_seconds=timeout_seconds, max_buildings=max_buildings)
        print(f"Run #{run}: wrote {rows} rows to {output_file}")

        if runs > 0 and run >= runs:
            break

        await asyncio.sleep(interval_seconds)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Collect ML-ready building dataset for the target Astana bbox")
    parser.add_argument("--output", default="exports/astana_bbox_ml_dataset.csv", help="Output CSV path")
    parser.add_argument("--timeout", type=int, default=5, help="Overpass timeout in seconds")
    parser.add_argument("--max-buildings", type=int, default=100, help="Max buildings per run")
    parser.add_argument("--interval", type=int, default=5, help="Seconds between runs")
    parser.add_argument("--runs", type=int, default=1, help="Number of runs (0 = infinite)")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    output = Path(args.output)
    if not output.is_absolute():
        output = (Path(__file__).resolve().parent.parent / output).resolve()

    asyncio.run(
        worker_loop(
            output_file=output,
            timeout_seconds=args.timeout,
            max_buildings=args.max_buildings,
            interval_seconds=args.interval,
            runs=args.runs,
        )
    )


if __name__ == "__main__":
    main()
