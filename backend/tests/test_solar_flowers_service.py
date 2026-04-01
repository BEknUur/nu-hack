from __future__ import annotations

from datetime import date

from services.solar_flowers.service import (
    _fallback_explanation,
    _light_fit_for_profile,
    _load_building_signals,
    rank_solar_points,
)


def _test_bbox() -> tuple[float, float, float, float]:
    buildings, _ = _load_building_signals()
    assert buildings, "Expected static dataset to contain building points"
    center = buildings[min(20, len(buildings) - 1)]
    return (
        center.lat - 0.015,
        center.lng - 0.02,
        center.lat + 0.015,
        center.lng + 0.02,
    )


def test_rank_with_bbox_returns_sorted_candidates() -> None:
    south, west, north, east = _test_bbox()
    ranked = rank_solar_points(
        south=south,
        west=west,
        north=north,
        east=east,
        profile="flower_full_sun",
        target_date=date(2026, 3, 31),
        top_k=15,
        min_spacing_m=60.0,
    )

    assert ranked["meta"]["selection_mode"] == "bbox"
    assert ranked["meta"]["profile"] == "flower_full_sun"
    assert ranked["meta"]["generated_points"] >= ranked["meta"]["scored_points"]

    candidates = ranked["candidates"]
    assert candidates, "Expected candidates for bbox ranking"
    scores = [item["score"] for item in candidates]
    assert scores == sorted(scores, reverse=True)
    assert len({item["id"] for item in candidates}) == len(candidates)


def test_geometry_mode_and_spacing_effect() -> None:
    south, west, north, east = _test_bbox()
    geometry = {
        "type": "Polygon",
        "coordinates": [[
            [west, south],
            [east, south],
            [east, north],
            [west, north],
            [west, south],
        ]],
    }

    dense = rank_solar_points(
        south=None,
        west=None,
        north=None,
        east=None,
        profile="solar_panel",
        target_date=date(2026, 4, 1),
        top_k=30,
        min_spacing_m=20.0,
        area_geometry=geometry,
    )
    sparse = rank_solar_points(
        south=None,
        west=None,
        north=None,
        east=None,
        profile="solar_panel",
        target_date=date(2026, 4, 1),
        top_k=30,
        min_spacing_m=280.0,
        area_geometry=geometry,
    )

    assert dense["meta"]["selection_mode"] == "geometry"
    assert sparse["meta"]["selection_mode"] == "geometry"
    assert len(sparse["candidates"]) <= len(dense["candidates"])


def test_light_fit_profiles_expected_ordering() -> None:
    assert _light_fit_for_profile(6.5, "flower_full_sun") > _light_fit_for_profile(4.0, "flower_full_sun")
    assert _light_fit_for_profile(4.0, "flower_partial_shade") > _light_fit_for_profile(8.0, "flower_partial_shade")
    assert _light_fit_for_profile(8.0, "solar_panel") > _light_fit_for_profile(5.0, "solar_panel")


def test_fallback_explanation_language_shape() -> None:
    candidate = {
        "rank": 2,
        "factors": {
            "sun_hours": 7.5,
            "light_fit": 0.91,
            "openness": 0.62,
            "conflict_risk": 0.1,
        },
    }
    for lang in ("ru", "kk", "en"):
        result = _fallback_explanation(
            candidate=candidate,
            profile="flower_full_sun",
            language=lang,
        )
        assert result["source"] == "fallback"
        assert isinstance(result["summary"], str) and result["summary"]
        assert isinstance(result["caution"], str) and result["caution"]
        assert isinstance(result["reasons"], list) and len(result["reasons"]) == 3
