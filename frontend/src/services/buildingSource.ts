import { fetchBuildings } from '@/services/overpass';
import type { MapBounds } from '@/types/map-engine';

export async function loadBuildings(bounds: MapBounds): Promise<GeoJSON.Feature[]> {
  return fetchBuildings({
    s: bounds.south,
    w: bounds.west,
    n: bounds.north,
    e: bounds.east,
  });
}
