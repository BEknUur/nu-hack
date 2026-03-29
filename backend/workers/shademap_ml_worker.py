from __future__ import annotations

import argparse
import asyncio
import csv
import hashlib
import math
import os
import struct
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import httpx

SHADEMAP_TILE_URL = "https://shademap.app/tiles/v1/shadow/{timestamp}/{z}/{x}/{y}.png"

# Target bbox from request.
LAT_1, LON_1 = 51.0982, 71.4061
LAT_2, LON_2 = 51.0835, 71.4227

BBOX_SOUTH = min(LAT_1, LAT_2)
BBOX_NORTH = max(LAT_1, LAT_2)
BBOX_WEST = min(LON_1, LON_2)
BBOX_EAST = max(LON_1, LON_2)


@dataclass
class TileJob:
    timestamp: int
    z: int
    x: int
    y: int


@dataclass
class TileResult:
    timestamp: int
    z: int
    x: int
    y: int
    center_lat: float
    center_lng: float
    south: float
    west: float
    north: float
    east: float
    status_code: int
    response_ms: float
    payload_bytes: int
    payload_sha256: str
    is_png: int
    png_width: int
    png_height: int
    cache_control: str
    cf_cache_status: str
    retry_count: int
    error: str
    collected_at: str


def deg2num(lat_deg: float, lon_deg: float, zoom: int) -> tuple[int, int]:
    lat_rad = math.radians(lat_deg)
    n = 2.0 ** zoom
    xtile = int((lon_deg + 180.0) / 360.0 * n)
    ytile = int((1.0 - math.log(math.tan(lat_rad) + (1 / math.cos(lat_rad))) / math.pi) / 2.0 * n)
    return xtile, ytile


def num2deg(x: int, y: int, zoom: int) -> tuple[float, float]:
    n = 2.0 ** zoom
    lon_deg = x / n * 360.0 - 180.0
    lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * y / n)))
    lat_deg = math.degrees(lat_rad)
    return lat_deg, lon_deg


def tile_bounds(z: int, x: int, y: int) -> tuple[float, float, float, float]:
    north, west = num2deg(x, y, z)
    south, east = num2deg(x + 1, y + 1, z)
    return south, west, north, east


def tile_center(south: float, west: float, north: float, east: float) -> tuple[float, float]:
    return ((south + north) / 2.0, (west + east) / 2.0)


def parse_png_dimensions(content: bytes) -> tuple[int, int, int]:
    if len(content) < 24:
        return 0, 0, 0

    png_sig = b"\x89PNG\r\n\x1a\n"
    if not content.startswith(png_sig):
        return 0, 0, 0

    # PNG: after signature comes IHDR chunk with width/height.
    chunk_type = content[12:16]
    if chunk_type != b"IHDR":
        return 1, 0, 0

    width = struct.unpack(">I", content[16:20])[0]
    height = struct.unpack(">I", content[20:24])[0]
    return 1, width, height


def build_jobs(
    zoom_min: int,
    zoom_max: int,
    start_ts: int,
    end_ts: int,
    step_seconds: int,
) -> list[TileJob]:
    jobs: list[TileJob] = []

    for z in range(zoom_min, zoom_max + 1):
        x1, y1 = deg2num(BBOX_NORTH, BBOX_WEST, z)
        x2, y2 = deg2num(BBOX_SOUTH, BBOX_EAST, z)

        min_x, max_x = min(x1, x2), max(x1, x2)
        min_y, max_y = min(y1, y2), max(y1, y2)

        ts = start_ts
        while ts <= end_ts:
            for x in range(min_x, max_x + 1):
                for y in range(min_y, max_y + 1):
                    jobs.append(TileJob(timestamp=ts, z=z, x=x, y=y))
            ts += step_seconds

    return jobs


async def fetch_one(
    client: httpx.AsyncClient,
    api_key: str,
    job: TileJob,
    max_retries: int,
    base_backoff_seconds: float,
) -> TileResult:
    south, west, north, east = tile_bounds(job.z, job.x, job.y)
    center_lat, center_lng = tile_center(south, west, north, east)

    retries = 0
    error = ""
    status_code = 0
    response_ms = 0.0
    content = b""
    headers: dict[str, str] = {}

    for attempt in range(max_retries + 1):
        start = time.perf_counter()
        try:
            url = SHADEMAP_TILE_URL.format(timestamp=job.timestamp, z=job.z, x=job.x, y=job.y)
            res = await client.get(
                url,
                params={"apiKey": api_key},
                headers={"User-Agent": "ShadeMapMLWorker/1.0"},
            )
            response_ms = (time.perf_counter() - start) * 1000.0
            status_code = res.status_code
            headers = {k.lower(): v for k, v in res.headers.items()}

            if status_code == 200:
                content = res.content
                error = ""
                retries = attempt
                break

            if status_code == 429 or 500 <= status_code < 600:
                if attempt < max_retries:
                    sleep_for = base_backoff_seconds * (2**attempt)
                    await asyncio.sleep(sleep_for)
                    continue

            error = f"HTTP {status_code}"
            retries = attempt
            break

        except Exception as exc:  # noqa: BLE001
            response_ms = (time.perf_counter() - start) * 1000.0
            error = str(exc)
            status_code = 0
            if attempt < max_retries:
                sleep_for = base_backoff_seconds * (2**attempt)
                await asyncio.sleep(sleep_for)
                continue
            retries = attempt
            break

    is_png, png_width, png_height = parse_png_dimensions(content)
    payload_bytes = len(content)
    payload_sha256 = hashlib.sha256(content).hexdigest() if content else ""

    return TileResult(
        timestamp=job.timestamp,
        z=job.z,
        x=job.x,
        y=job.y,
        center_lat=center_lat,
        center_lng=center_lng,
        south=south,
        west=west,
        north=north,
        east=east,
        status_code=status_code,
        response_ms=round(response_ms, 3),
        payload_bytes=payload_bytes,
        payload_sha256=payload_sha256,
        is_png=is_png,
        png_width=png_width,
        png_height=png_height,
        cache_control=headers.get("cache-control", ""),
        cf_cache_status=headers.get("cf-cache-status", ""),
        retry_count=retries,
        error=error,
        collected_at=datetime.now(timezone.utc).isoformat(),
    )


def write_rows(path: Path, rows: list[TileResult]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    write_header = not path.exists() or path.stat().st_size == 0

    with path.open("a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "timestamp",
                "z",
                "x",
                "y",
                "center_lat",
                "center_lng",
                "south",
                "west",
                "north",
                "east",
                "status_code",
                "response_ms",
                "payload_bytes",
                "payload_sha256",
                "is_png",
                "png_width",
                "png_height",
                "cache_control",
                "cf_cache_status",
                "retry_count",
                "error",
                "collected_at",
            ],
        )
        if write_header:
            writer.writeheader()

        for row in rows:
            writer.writerow(row.__dict__)


async def run_worker(
    api_key: str,
    output: Path,
    zoom_min: int,
    zoom_max: int,
    hours_back: int,
    step_minutes: int,
    batch_size: int,
    batch_delay_ms: int,
    max_retries: int,
    request_timeout: int,
) -> None:
    now = datetime.now(timezone.utc)
    end_dt = now.replace(second=0, microsecond=0)
    start_dt = end_dt - timedelta(hours=hours_back)

    start_ts = int(start_dt.timestamp())
    end_ts = int(end_dt.timestamp())
    step_seconds = step_minutes * 60

    jobs = build_jobs(
        zoom_min=zoom_min,
        zoom_max=zoom_max,
        start_ts=start_ts,
        end_ts=end_ts,
        step_seconds=step_seconds,
    )

    print(
        f"Prepared {len(jobs)} jobs for bbox [{BBOX_SOUTH},{BBOX_WEST}]..[{BBOX_NORTH},{BBOX_EAST}], "
        f"zoom {zoom_min}-{zoom_max}, period {start_dt.isoformat()}..{end_dt.isoformat()}"
    )

    timeout = httpx.Timeout(request_timeout)
    limits = httpx.Limits(max_connections=batch_size * 2, max_keepalive_connections=batch_size)

    total = len(jobs)
    done = 0
    ok = 0
    errors = 0
    status_429 = 0

    async with httpx.AsyncClient(timeout=timeout, limits=limits) as client:
        for i in range(0, total, batch_size):
            chunk = jobs[i : i + batch_size]
            tasks = [
                fetch_one(
                    client=client,
                    api_key=api_key,
                    job=job,
                    max_retries=max_retries,
                    base_backoff_seconds=1.0,
                )
                for job in chunk
            ]

            results = await asyncio.gather(*tasks)
            write_rows(output, results)

            for r in results:
                done += 1
                if r.status_code == 200:
                    ok += 1
                else:
                    errors += 1
                if r.status_code == 429:
                    status_429 += 1

            print(
                f"Progress {done}/{total} | ok={ok} errors={errors} status429={status_429} "
                f"last_batch={len(chunk)}"
            )

            # Recommendation from report: small pause between big batches.
            if done < total and batch_delay_ms > 0:
                await asyncio.sleep(batch_delay_ms / 1000.0)

    print(
        f"Done. output={output} rows={done} ok={ok} errors={errors} status429={status_429}"
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="High-throughput ShadeMap tile worker for ML-ready CSV collection"
    )
    parser.add_argument("--api-key", default=os.getenv("VITE_SHADEMAP_API_KEY", ""), help="ShadeMap API key")
    parser.add_argument("--output", default="exports/shademap_tiles_ml_dataset.csv", help="Output CSV path")
    parser.add_argument("--zoom-min", type=int, default=15)
    parser.add_argument("--zoom-max", type=int, default=17)
    parser.add_argument("--hours-back", type=int, default=24)
    parser.add_argument("--step-minutes", type=int, default=60)
    parser.add_argument("--batch-size", type=int, default=500)
    parser.add_argument("--batch-delay-ms", type=int, default=50)
    parser.add_argument("--max-retries", type=int, default=5)
    parser.add_argument("--request-timeout", type=int, default=20)
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if not args.api_key:
        raise SystemExit("Missing API key. Pass --api-key or set VITE_SHADEMAP_API_KEY.")

    output = Path(args.output)
    if not output.is_absolute():
        output = (Path(__file__).resolve().parent.parent / output).resolve()

    asyncio.run(
        run_worker(
            api_key=args.api_key,
            output=output,
            zoom_min=args.zoom_min,
            zoom_max=args.zoom_max,
            hours_back=args.hours_back,
            step_minutes=args.step_minutes,
            batch_size=args.batch_size,
            batch_delay_ms=args.batch_delay_ms,
            max_retries=args.max_retries,
            request_timeout=args.request_timeout,
        )
    )


if __name__ == "__main__":
    main()
