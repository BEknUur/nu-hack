"""
Heat engine: LST/NDVI grid loading, priority scoring, planting site ranking,
and scenario impact estimation.

Data source: CSV from Google Earth Engine (Landsat 8/9 ST_B10 + Sentinel-2 NDVI),
or synthetic grid when CSV is unavailable (development mode).

Set HEAT_GRID_CSV env var to path of astana_grid_100m.csv to use real data.
"""
from __future__ import annotations

import csv as _csv
import math
import os
from dataclasses import dataclass
from pathlib import Path
from threading import Lock
from typing import Any

import numpy as np


# ── Config ────────────────────────────────────────────────────────────────────

@dataclass
class HeatConfig:
    # Priority weights — must sum to ~1.0
    w_lst: float = 0.55          # LST contribution (hot = high priority for trees)
    w_veg: float = 0.35          # vegetation deficit (low NDVI = high priority)
    w_exposure: float = 0.10     # solar exposure contribution

    # Cooling model
    # Source: npj Urban Sustainability 2025 — +10% canopy ≈ −0.8°C; +30% ≈ −1.5°C
    # Conservative linear slope: −0.05°C per +1% canopy cover
    cooling_c_per_canopy_pct: float = 0.05

    # Source: PNAS — ≥40% canopy cover → −4..5°C air cooling ceiling
    max_cooling_c: float = 5.0

    # Tree geometry
    tree_canopy_m2: float = 25.0   # crown footprint per tree (m²)
    cell_size_m: float = 100.0     # grid resolution (m)

    # Ranking
    min_spacing_m: float = 80.0    # min Haversine distance between ranked sites

    # CO₂ — rough estimate (~21 kg/tree/yr), mark as approximate in responses
    co2_per_tree_kg_yr: float = 21.0

    # Efficiency reduction during heat waves (stomata close → reduced transpiration cooling)
    heatwave_efficiency: float = 0.70


DEFAULT_CFG = HeatConfig()

# ── Grid type ─────────────────────────────────────────────────────────────────
# Dict of parallel numpy arrays: lon, lat, lst, ndvi, exposure, [priority]

Grid = dict[str, np.ndarray]

# ── Global cache (loaded once at startup) ─────────────────────────────────────

_GRID_LOCK = Lock()
_GRID_CACHE: Grid | None = None
_GRID_SOURCE: str = "none"


# ── Internal helpers ──────────────────────────────────────────────────────────

def _norm(arr: np.ndarray) -> np.ndarray:
    """Min-max normalisation to [0, 1]."""
    lo, hi = arr.min(), arr.max()
    if hi == lo:
        return np.zeros_like(arr, dtype=float)
    return (arr - lo) / (hi - lo)


def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance in metres between two (lat, lon) points."""
    R = 6_371_000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2.0 * R * math.asin(math.sqrt(min(1.0, a)))


# ── Grid I/O ──────────────────────────────────────────────────────────────────

def load_grid(csv_path: str) -> Grid:
    """
    Load a CSV file with columns: lon, lat, LST, NDVI[, exposure].
    LST must already be in °C (apply Landsat ST_B10 formula before export).
    """
    lons, lats, lsts, ndvis, exps = [], [], [], [], []
    with open(csv_path, newline="", encoding="utf-8") as fh:
        reader = _csv.DictReader(fh)
        fmap = {k.strip().lower(): k for k in (reader.fieldnames or [])}
        has_exp = "exposure" in fmap
        for row in reader:
            lons.append(float(row[fmap["lon"]]))
            lats.append(float(row[fmap["lat"]]))
            lsts.append(float(row[fmap["lst"]]))
            ndvis.append(float(row[fmap["ndvi"]]))
            exps.append(float(row[fmap["exposure"]]) if has_exp else 0.5)

    return {
        "lon": np.array(lons, dtype=np.float64),
        "lat": np.array(lats, dtype=np.float64),
        "lst": np.array(lsts, dtype=np.float64),
        "ndvi": np.array(ndvis, dtype=np.float64),
        "exposure": np.array(exps, dtype=np.float64),
    }


def make_synthetic_grid(nx: int = 65, ny: int = 65) -> Grid:
    """
    Synthetic 100-m grid covering central Astana for offline development.
    Mimics reality: hot urban core (low NDVI, high LST) vs. cool park cluster.
    """
    lon_min, lon_max = 71.375, 71.490
    lat_min, lat_max = 71.140, 51.230

    # Override lat range (lon_min/max are correct, fix lat)
    lat_min, lat_max = 51.140, 51.230

    lon_vals = np.linspace(lon_min, lon_max, nx)
    lat_vals = np.linspace(lat_min, lat_max, ny)
    lon_g, lat_g = np.meshgrid(lon_vals, lat_vals)
    lons = lon_g.ravel()
    lats = lat_g.ravel()

    mid_lat = (lat_min + lat_max) / 2
    m_per_deg_lon = 111_320.0 * math.cos(math.radians(mid_lat))
    m_per_deg_lat = 111_320.0

    # Distance from Astana city centre (Khan Shatyr area)
    cx, cy = 71.426, 51.183
    dx = (lons - cx) * m_per_deg_lon
    dy = (lats - cy) * m_per_deg_lat
    dist_centre = np.hypot(dx, dy)

    # Park cluster: Botanical Garden area (~SE of centre)
    px, py = 71.450, 51.162
    dpx = (lons - px) * m_per_deg_lon
    dpy = (lats - py) * m_per_deg_lat
    dist_park = np.hypot(dpx, dpy)

    rng = np.random.default_rng(42)

    # LST: hot centre (42°C), cools outward; park is 8°C cooler
    lst = 42.0 - dist_centre / 220.0 + rng.normal(0, 1.5, size=lons.shape)
    park_cool = np.clip(8.0 - dist_park / 350.0, 0.0, 8.0)
    lst -= park_cool
    lst = np.clip(lst, 20.0, 55.0)

    # NDVI: barren centre, green park
    ndvi = 0.07 + 0.18 * (dist_centre / dist_centre.max())
    ndvi += np.clip(0.38 - dist_park / 2_200.0, 0.0, 0.38)
    ndvi += rng.normal(0, 0.025, size=lons.shape)
    ndvi = np.clip(ndvi, 0.01, 0.80)

    # Exposure: south-facing (lower lat) gets more annual sun
    exposure = 0.35 + 0.55 * (1.0 - (lats - lat_min) / (lat_max - lat_min))
    exposure += rng.normal(0, 0.04, size=lons.shape)
    exposure = np.clip(exposure, 0.0, 1.0)

    return {
        "lon": lons,
        "lat": lats,
        "lst": lst,
        "ndvi": ndvi,
        "exposure": exposure,
    }


# ── Priority scoring ──────────────────────────────────────────────────────────

def compute_priority(grid: Grid, cfg: HeatConfig = DEFAULT_CFG) -> Grid:
    """
    Compute greening priority for each cell.
    formula: w_lst*LST_norm + w_veg*(1-NDVI_norm) + w_exp*exposure_norm
    """
    lst_n = _norm(grid["lst"])
    ndvi_n = _norm(grid["ndvi"])
    exp_n = _norm(grid["exposure"])
    priority = (
        cfg.w_lst * lst_n
        + cfg.w_veg * (1.0 - ndvi_n)
        + cfg.w_exposure * exp_n
    )
    return {**grid, "priority": priority}


# ── Spatial filter ────────────────────────────────────────────────────────────

def cells_in_bbox(
    grid: Grid,
    bbox: tuple[float, float, float, float],
) -> Grid:
    """Return sub-grid for bbox = (lon_min, lat_min, lon_max, lat_max)."""
    lon_min, lat_min, lon_max, lat_max = bbox
    mask = (
        (grid["lon"] >= lon_min) & (grid["lon"] <= lon_max)
        & (grid["lat"] >= lat_min) & (grid["lat"] <= lat_max)
    )
    return {k: v[mask] for k, v in grid.items()}


# ── Planting site ranking ─────────────────────────────────────────────────────

def rank_planting_sites(
    grid: Grid,
    bbox: tuple[float, float, float, float],
    n: int,
    cfg: HeatConfig = DEFAULT_CFG,
) -> list[dict[str, Any]]:
    """
    Top-N planting sites ranked by priority with greedy Haversine spacing.
    Returns: [{lon, lat, lst, ndvi, priority}, ...]
    """
    sub = cells_in_bbox(grid, bbox)
    if "priority" not in sub or len(sub["lon"]) == 0:
        return []

    order = np.argsort(sub["priority"])[::-1]
    selected_coords: list[tuple[float, float]] = []
    results: list[dict[str, Any]] = []

    for idx in order:
        lat_i = float(sub["lat"][idx])
        lon_i = float(sub["lon"][idx])
        too_close = any(
            _haversine_m(lat_i, lon_i, s_lat, s_lon) < cfg.min_spacing_m
            for s_lat, s_lon in selected_coords
        )
        if too_close:
            continue
        selected_coords.append((lat_i, lon_i))
        results.append({
            "lon": round(lon_i, 6),
            "lat": round(lat_i, 6),
            "lst": round(float(sub["lst"][idx]), 1),
            "ndvi": round(float(sub["ndvi"][idx]), 3),
            "priority": round(float(sub["priority"][idx]), 4),
        })
        if len(results) >= n:
            break

    return results


# ── Scenario impact ───────────────────────────────────────────────────────────

def scenario_impact(
    grid: Grid,
    bbox: tuple[float, float, float, float],
    n_trees: int | None = None,
    target_canopy_pct: float | None = None,
    heatwave: bool = False,
    cfg: HeatConfig = DEFAULT_CFG,
) -> dict[str, Any]:
    """
    Estimate cooling and CO₂ impact of adding trees to a zone.
    Provide either n_trees OR target_canopy_pct; the other is derived.

    Cooling model: npj Urban Sustainability 2025 (−0.05°C per +1% canopy),
    capped at 5°C (PNAS: ≥40% canopy → −4..5°C).
    CO₂: ~21 kg/tree/yr (approximate estimate).
    """
    sub = cells_in_bbox(grid, bbox)
    n_cells = len(sub["lon"])
    if n_cells == 0:
        return {"error": "No grid cells found in bbox"}

    zone_area_m2 = n_cells * (cfg.cell_size_m ** 2)
    zone_area_ha = zone_area_m2 / 10_000.0

    if target_canopy_pct is not None:
        canopy_m2 = zone_area_m2 * (target_canopy_pct / 100.0)
        trees_needed = max(1, round(canopy_m2 / cfg.tree_canopy_m2))
        canopy_increase_pct = float(target_canopy_pct)
    elif n_trees is not None and n_trees > 0:
        canopy_m2 = n_trees * cfg.tree_canopy_m2
        canopy_increase_pct = min(100.0, (canopy_m2 / zone_area_m2) * 100.0)
        trees_needed = n_trees
    else:
        return {"error": "Provide n_trees or target_canopy_pct"}

    mean_lst = float(np.mean(sub["lst"]))

    # npj Urban Sustainability 2025: −0.05°C per +1% canopy (conservative slope)
    raw_cooling = canopy_increase_pct * cfg.cooling_c_per_canopy_pct
    if heatwave:
        # Stomata partially close during heat waves → reduced transpiration
        raw_cooling *= cfg.heatwave_efficiency
    cooling = min(raw_cooling, cfg.max_cooling_c)

    # CO₂ uptake — approximate, ~21 kg/tree/yr
    co2_t_yr = round(trees_needed * cfg.co2_per_tree_kg_yr / 1000.0, 2)

    return {
        "zone_area_ha": round(zone_area_ha, 2),
        "trees_needed": trees_needed,
        "canopy_increase_pct": round(canopy_increase_pct, 1),
        "mean_surface_temp_now_c": round(mean_lst, 1),
        "estimated_air_cooling_c": round(cooling, 2),
        "co2_uptake_t_per_year": co2_t_yr,
        "note": "Air temp estimate per npj Urban Sustainability 2025; CO₂ is approximate (~21 kg/tree/yr)",
    }


# ── Startup cache ─────────────────────────────────────────────────────────────

def get_grid(cfg: HeatConfig = DEFAULT_CFG) -> Grid:
    """Return cached grid; loads on first call. Thread-safe."""
    global _GRID_CACHE, _GRID_SOURCE
    with _GRID_LOCK:
        if _GRID_CACHE is not None:
            return _GRID_CACHE
        csv_path = os.environ.get("HEAT_GRID_CSV", "")
        if csv_path and Path(csv_path).exists():
            raw = load_grid(csv_path)
            _GRID_SOURCE = f"csv:{Path(csv_path).name}"
        else:
            raw = make_synthetic_grid()
            _GRID_SOURCE = "synthetic"
        _GRID_CACHE = compute_priority(raw, cfg)
        return _GRID_CACHE


def get_grid_source() -> str:
    return _GRID_SOURCE


def get_grid_cell_count() -> int:
    return len(_GRID_CACHE["lon"]) if _GRID_CACHE is not None else 0


# ── Self-test ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=== heat_engine self-test ===")
    grid = get_grid()
    n = len(grid["lon"])
    print(f"source  : {get_grid_source()}")
    print(f"cells   : {n}")
    print(f"LST     : {grid['lst'].min():.1f}–{grid['lst'].max():.1f} °C")
    print(f"NDVI    : {grid['ndvi'].min():.3f}–{grid['ndvi'].max():.3f}")
    print(f"priority: {grid['priority'].min():.4f}–{grid['priority'].max():.4f}")

    bbox = (71.400, 51.160, 71.460, 51.205)
    print(f"\nTop-5 planting sites in {bbox}:")
    sites = rank_planting_sites(grid, bbox, n=5)
    for i, s in enumerate(sites, 1):
        print(f"  {i}. lon={s['lon']}  lat={s['lat']}  LST={s['lst']}°C  NDVI={s['ndvi']}  priority={s['priority']}")

    print("\nScenario +20% canopy:")
    imp = scenario_impact(grid, bbox, target_canopy_pct=20.0)
    for k, v in imp.items():
        print(f"  {k}: {v}")
