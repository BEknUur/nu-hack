from __future__ import annotations

import argparse
import csv
from pathlib import Path
import sys

from sqlalchemy import select

BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from core.database.session.database import SessionLocal
from services.ml_data.models import GeocodingSample, OverpassSample


def bbox_area(south: float, west: float, north: float, east: float) -> float:
    lat_span = max(0.0, north - south)
    lng_span = max(0.0, east - west)
    return lat_span * lng_span


def export_geocoding(output_path: Path, limit: int, source: str | None) -> int:
    db = SessionLocal()
    try:
        stmt = select(GeocodingSample).order_by(GeocodingSample.created_at.desc()).limit(limit)
        if source:
            stmt = stmt.where(GeocodingSample.source == source)

        samples = db.execute(stmt).scalars().all()

        with output_path.open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(
                f,
                fieldnames=[
                    "sample_id",
                    "query",
                    "query_length",
                    "source",
                    "results_count",
                    "result_rank",
                    "lat",
                    "lng",
                    "bbox_area",
                    "created_at",
                ],
            )
            writer.writeheader()

            rows = 0
            for sample in samples:
                for idx, item in enumerate(sample.normalized_payload):
                    bbox = item.get("bounding_box", [0, 0, 0, 0])
                    south = float(bbox[0]) if len(bbox) >= 4 else 0.0
                    north = float(bbox[1]) if len(bbox) >= 4 else 0.0
                    west = float(bbox[2]) if len(bbox) >= 4 else 0.0
                    east = float(bbox[3]) if len(bbox) >= 4 else 0.0

                    writer.writerow(
                        {
                            "sample_id": str(sample.id),
                            "query": sample.query,
                            "query_length": len(sample.query),
                            "source": sample.source,
                            "results_count": sample.results_count,
                            "result_rank": idx,
                            "lat": float(item.get("lat", 0.0)),
                            "lng": float(item.get("lng", 0.0)),
                            "bbox_area": bbox_area(south, west, north, east),
                            "created_at": sample.created_at.isoformat(),
                        }
                    )
                    rows += 1

        return rows
    finally:
        db.close()


def export_overpass(output_path: Path, limit: int, source: str | None) -> int:
    db = SessionLocal()
    try:
        stmt = select(OverpassSample).order_by(OverpassSample.created_at.desc()).limit(limit)
        if source:
            stmt = stmt.where(OverpassSample.source == source)

        samples = db.execute(stmt).scalars().all()

        with output_path.open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(
                f,
                fieldnames=[
                    "sample_id",
                    "source",
                    "timeout_seconds",
                    "bbox_south",
                    "bbox_west",
                    "bbox_north",
                    "bbox_east",
                    "bbox_area",
                    "features_count",
                    "features_density",
                    "created_at",
                ],
            )
            writer.writeheader()

            rows = 0
            for sample in samples:
                area = bbox_area(sample.bbox_south, sample.bbox_west, sample.bbox_north, sample.bbox_east)
                density = sample.features_count / area if area > 0 else 0.0

                writer.writerow(
                    {
                        "sample_id": str(sample.id),
                        "source": sample.source,
                        "timeout_seconds": sample.timeout_seconds,
                        "bbox_south": sample.bbox_south,
                        "bbox_west": sample.bbox_west,
                        "bbox_north": sample.bbox_north,
                        "bbox_east": sample.bbox_east,
                        "bbox_area": area,
                        "features_count": sample.features_count,
                        "features_density": density,
                        "created_at": sample.created_at.isoformat(),
                    }
                )
                rows += 1

        return rows
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Export ML-ready datasets from geocoding and overpass samples")
    parser.add_argument("--limit", type=int, default=10_000, help="Maximum samples to export per table")
    parser.add_argument("--source", type=str, default=None, help="Filter by source value")
    parser.add_argument("--output-dir", type=str, default="exports", help="Directory for generated CSV files")
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    if not output_dir.is_absolute():
        output_dir = (Path(__file__).resolve().parent.parent / output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    geo_path = output_dir / "geocoding_ml_dataset.csv"
    overpass_path = output_dir / "overpass_ml_dataset.csv"

    geo_rows = export_geocoding(geo_path, args.limit, args.source)
    overpass_rows = export_overpass(overpass_path, args.limit, args.source)

    print(f"Geocoding rows exported: {geo_rows} -> {geo_path}")
    print(f"Overpass rows exported: {overpass_rows} -> {overpass_path}")


if __name__ == "__main__":
    main()
