import type { SelectedBuilding } from '@/types/building';
import { toSelectedBuilding } from '@/utils/buildings';
import type { MapPoint } from '@/types/map-engine';

const MAPLIBRE_BUILDING_LAYERS = ['osm-buildings-3d', 'osm-buildings-outline'] as const;

interface MapLibreRenderedFeature {
  id?: unknown;
  properties?: Record<string, unknown>;
}

interface MapLibrePickingMap {
  queryRenderedFeatures?: (
    pointLike: { x: number; y: number } | [number, number],
    options?: { layers?: string[] },
  ) => MapLibreRenderedFeature[];
}

function getFeatureId(feature: GeoJSON.Feature | { id?: unknown; properties?: Record<string, unknown> }): string | null {
  const rawId = feature.id ?? feature.properties?.id ?? feature.properties?.['@id'];
  return typeof rawId === 'string' || typeof rawId === 'number' ? String(rawId) : null;
}

export function pickMapLibreBuilding(
  point: MapPoint,
  controller: { getContainerPoint: (p: MapPoint) => { x: number; y: number } | null },
  rawMap: unknown,
  features: GeoJSON.Feature[],
): SelectedBuilding | null {
  const screenPoint = controller.getContainerPoint(point);
  const map = rawMap as MapLibrePickingMap | null;
  if (!screenPoint || !map?.queryRenderedFeatures) return null;

  const rendered = map.queryRenderedFeatures(
    { x: screenPoint.x, y: screenPoint.y },
    { layers: [...MAPLIBRE_BUILDING_LAYERS] },
  );

  for (const candidate of rendered) {
    const id = getFeatureId(candidate);
    if (!id) continue;
    const sourceFeature = features.find((feature) => getFeatureId(feature) === id);
    if (!sourceFeature) continue;
    const selected = toSelectedBuilding(sourceFeature);
    if (selected) return selected;
  }

  return null;
}
