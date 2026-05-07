import type { BuildingPolygon, SelectedBuilding } from '@/types/building';

type LngLat = [number, number];

function getFeatureId(feature: GeoJSON.Feature): string {
  const props = (feature.properties ?? {}) as Record<string, unknown>;
  const rawId = feature.id ?? props.id ?? props['@id'];
  return typeof rawId === 'string' || typeof rawId === 'number' ? String(rawId) : 'building';
}

function getFeatureName(feature: GeoJSON.Feature): string | null {
  const props = (feature.properties ?? {}) as Record<string, unknown>;
  const rawName = props.name ?? props['addr:housename'] ?? props['addr:housenumber'];
  return typeof rawName === 'string' && rawName.trim() ? rawName.trim() : null;
}

function getFeatureKind(feature: GeoJSON.Feature): string | null {
  const props = (feature.properties ?? {}) as Record<string, unknown>;
  const rawKind = props.building ?? props.amenity ?? props.shop;
  return typeof rawKind === 'string' && rawKind.trim() ? rawKind.trim() : null;
}

function toNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function getFeatureLevels(feature: GeoJSON.Feature): number | null {
  const props = (feature.properties ?? {}) as Record<string, unknown>;
  return toNumber(props['building:levels']);
}

function getFeatureHeight(feature: GeoJSON.Feature): number {
  const props = (feature.properties ?? {}) as Record<string, unknown>;
  return (
    toNumber(props.height) ??
    toNumber(props['building:height']) ??
    (toNumber(props['building:levels']) ?? 1) * 3
  );
}

function toBuildingPolygons(feature: GeoJSON.Feature): BuildingPolygon[] {
  const geometry = feature.geometry;
  if (!geometry) return [];

  if (geometry.type === 'Polygon') {
    const [outer = [], ...holes] = geometry.coordinates as LngLat[][];
    return outer.length >= 4 ? [{ outer, holes }] : [];
  }

  if (geometry.type === 'MultiPolygon') {
    return (geometry.coordinates as LngLat[][][])
      .map(([outer = [], ...holes]) => (outer.length >= 4 ? { outer, holes } : null))
      .filter((polygon): polygon is BuildingPolygon => polygon !== null);
  }

  return [];
}

function pointOnSegment(point: LngLat, a: LngLat, b: LngLat): boolean {
  const cross = (point[1] - a[1]) * (b[0] - a[0]) - (point[0] - a[0]) * (b[1] - a[1]);
  if (Math.abs(cross) > 1e-10) return false;

  const dot = (point[0] - a[0]) * (b[0] - a[0]) + (point[1] - a[1]) * (b[1] - a[1]);
  if (dot < 0) return false;

  const squaredLength = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2;
  return dot <= squaredLength;
}

function pointInRing(point: LngLat, ring: LngLat[]): boolean {
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[i];
    const b = ring[j];

    if (pointOnSegment(point, a, b)) return true;

    const intersects = ((a[1] > point[1]) !== (b[1] > point[1]))
      && point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0];

    if (intersects) inside = !inside;
  }

  return inside;
}

function pointInPolygon(point: LngLat, polygon: BuildingPolygon): boolean {
  if (!pointInRing(point, polygon.outer)) return false;
  return !polygon.holes.some((hole) => pointInRing(point, hole));
}

function ringAreaMeters2(ring: LngLat[]): number {
  if (ring.length < 3) return 0;

  const centerLat = ring.reduce((sum, [, lat]) => sum + lat, 0) / ring.length;
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLng = 111_320 * Math.cos((centerLat * Math.PI) / 180);

  let area = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const [lng1, lat1] = ring[i];
    const [lng2, lat2] = ring[i + 1];
    const x1 = lng1 * metersPerDegreeLng;
    const y1 = lat1 * metersPerDegreeLat;
    const x2 = lng2 * metersPerDegreeLng;
    const y2 = lat2 * metersPerDegreeLat;
    area += x1 * y2 - x2 * y1;
  }

  return Math.abs(area) / 2;
}

function polygonAreaMeters2(polygon: BuildingPolygon): number {
  return Math.max(
    0,
    ringAreaMeters2(polygon.outer) - polygon.holes.reduce((sum, hole) => sum + ringAreaMeters2(hole), 0),
  );
}

function getCenter(polygons: BuildingPolygon[]): { lat: number; lng: number } | null {
  const points = polygons.flatMap((polygon) => polygon.outer);
  if (!points.length) return null;

  const sum = points.reduce(
    (acc, [lng, lat]) => ({ lng: acc.lng + lng, lat: acc.lat + lat }),
    { lng: 0, lat: 0 },
  );

  return {
    lng: sum.lng / points.length,
    lat: sum.lat / points.length,
  };
}

export function toSelectedBuilding(feature: GeoJSON.Feature): SelectedBuilding | null {
  const polygons = toBuildingPolygons(feature);
  if (!polygons.length) return null;

  const center = getCenter(polygons);
  if (!center) return null;

  const id = getFeatureId(feature);
  const name = getFeatureName(feature);
  const kind = getFeatureKind(feature);

  return {
    id,
    label: name ?? id,
    center,
    height: getFeatureHeight(feature),
    levels: getFeatureLevels(feature),
    area: polygons.reduce((sum, polygon) => sum + polygonAreaMeters2(polygon), 0),
    kind,
    polygons,
  };
}

export function findBuildingAtPoint(
  features: GeoJSON.Feature[],
  point: { lat: number; lng: number },
): SelectedBuilding | null {
  let bestMatch: SelectedBuilding | null = null;
  let smallestArea = Number.POSITIVE_INFINITY;

  for (const feature of features) {
    const selected = toSelectedBuilding(feature);
    if (!selected) continue;

    const containsPoint = selected.polygons.some((polygon) => pointInPolygon([point.lng, point.lat], polygon));
    if (!containsPoint) continue;

    if (selected.area < smallestArea) {
      bestMatch = selected;
      smallestArea = selected.area;
    }
  }

  return bestMatch;
}
