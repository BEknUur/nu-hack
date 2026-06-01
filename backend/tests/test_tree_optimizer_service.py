import unittest
from unittest.mock import patch

from services.tree_optimizer import service


class TestTreeOptimizerService(unittest.TestCase):
    def test_building_clearance_returns_zero_inside_footprint(self):
        geometry = {
            "type": "Polygon",
            "coordinates": [[
                (71.0, 51.0),
                (71.001, 51.0),
                (71.001, 51.001),
                (71.0, 51.001),
                (71.0, 51.0),
            ]],
        }
        footprint = service.BuildingFootprint(
            geometry=geometry,
            bbox=service._geometry_bbox(geometry),
        )
        footprints = [footprint]
        buckets = service._index_footprints(footprints)

        self.assertEqual(
            service._building_clearance_m(
                lat=51.0005,
                lng=71.0005,
                footprints=footprints,
                buckets=buckets,
            ),
            0.0,
        )
        self.assertGreater(
            service._building_clearance_m(
                lat=51.0012,
                lng=71.0005,
                footprints=footprints,
                buckets=buckets,
            ),
            5.0,
        )

    def test_rank_prefers_roadside_points_when_roads_are_available(self):
        road = service.RoadSegment(
            a_lat=51.0,
            a_lng=71.0,
            b_lat=51.0,
            b_lng=71.004,
            highway="residential",
            access_weight=0.88,
        )

        with (
            patch.object(service, "_load_building_signals", return_value=([], {})),
            patch.object(service, "_load_building_footprints", return_value=([], {})),
            patch.object(service, "_load_osm_context", return_value=service.OSMContext(roads=[road], footprints=[])),
        ):
            ranked = service.rank_tree_points(
                south=50.9995,
                west=70.9995,
                north=51.0005,
                east=71.0045,
                top_k=5,
                summer_weight=0.55,
                min_winter_light=0.25,
                min_spacing_m=12.0,
            )

        self.assertEqual(ranked["meta"]["model_version"], "tree-ranker-v2-roadside")
        self.assertGreater(len(ranked["candidates"]), 0)
        for candidate in ranked["candidates"]:
            distance_m = service._point_to_segment_distance_m(
                lat=candidate["lat"],
                lng=candidate["lng"],
                a=(road.a_lng, road.a_lat),
                b=(road.b_lng, road.b_lat),
            )
            self.assertGreaterEqual(distance_m, 2.0)
            self.assertLessEqual(distance_m, 15.0)

    def test_rank_filters_roadside_points_that_land_on_buildings(self):
        base_lat = 51.0
        base_lng = 71.0
        north_low = base_lat + service._meters_to_lat_delta(4.0)
        north_high = base_lat + service._meters_to_lat_delta(12.0)
        geometry = {
            "type": "Polygon",
            "coordinates": [[
                (base_lng, north_low),
                (base_lng + 0.004, north_low),
                (base_lng + 0.004, north_high),
                (base_lng, north_high),
                (base_lng, north_low),
            ]],
        }
        footprint = service.BuildingFootprint(
            geometry=geometry,
            bbox=service._geometry_bbox(geometry),
        )
        road = service.RoadSegment(
            a_lat=base_lat,
            a_lng=base_lng,
            b_lat=base_lat,
            b_lng=base_lng + 0.004,
            highway="residential",
            access_weight=0.88,
        )

        with (
            patch.object(service, "_load_building_signals", return_value=([], {})),
            patch.object(service, "_load_building_footprints", return_value=([], {})),
            patch.object(service, "_load_osm_context", return_value=service.OSMContext(roads=[road], footprints=[footprint])),
        ):
            ranked = service.rank_tree_points(
                south=base_lat - 0.0005,
                west=base_lng - 0.0005,
                north=base_lat + 0.0005,
                east=base_lng + 0.0045,
                top_k=5,
                summer_weight=0.55,
                min_winter_light=0.25,
                min_spacing_m=12.0,
            )

        self.assertGreater(len(ranked["candidates"]), 0)
        for candidate in ranked["candidates"]:
            self.assertFalse(
                service._point_in_geometry(candidate["lat"], candidate["lng"], geometry),
                f"candidate landed on building: {candidate}",
            )
            self.assertGreaterEqual(candidate["factors"]["nearest_building_m"], 5.0)


if __name__ == "__main__":
    unittest.main()
