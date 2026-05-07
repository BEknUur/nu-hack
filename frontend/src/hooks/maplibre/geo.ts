import maplibregl from 'maplibre-gl';
import type { MapPoint } from '@/types/map-engine';
import type { StaticFeature, StaticRegionBBox } from '@/hooks/maplibre/types';

export function toLngLat(point: MapPoint): [number, number] {
  return [point.lng, point.lat];
}

export function isBuildingPolygonFeature(feature: GeoJSON.Feature) {
  return feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon';
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number) {
  return (rad * 180) / Math.PI;
}

function norm360(deg: number) {
  return ((deg % 360) + 360) % 360;
}

function angleDiff(a: number, b: number) {
  const d = Math.abs(norm360(a) - norm360(b));
  return d > 180 ? 360 - d : d;
}

export function bearingFromAtoB(a: [number, number], b: [number, number]) {
  const latMeters = 111_320;
  const lngMeters = 111_320 * Math.cos(toRad((a[1] + b[1]) / 2));
  const dx = (b[0] - a[0]) * lngMeters;
  const dy = (b[1] - a[1]) * latMeters;
  return norm360(toDeg(Math.atan2(dx, dy)));
}

export function matchesBearing(a: number, b: number, maxDeviation = 45) {
  return angleDiff(a, b) <= maxDeviation;
}

export function polygonOuterRing(feature: GeoJSON.Feature): [number, number][] | null {
  const geometry = feature.geometry;
  if (!geometry) return null;
  if (geometry.type === 'Polygon') {
    return (geometry.coordinates[0] ?? []) as [number, number][];
  }
  if (geometry.type === 'MultiPolygon') {
    const firstPolygon = geometry.coordinates[0];
    return (firstPolygon?.[0] ?? []) as [number, number][];
  }
  return null;
}

export function centroidOfRing(ring: [number, number][]) {
  if (!ring.length) return null;
  const sum = ring.reduce(
    (acc, [lng, lat]) => ({ lng: acc.lng + lng, lat: acc.lat + lat }),
    { lng: 0, lat: 0 },
  );
  return { lng: sum.lng / ring.length, lat: sum.lat / ring.length };
}

function collectCoords(geometry: GeoJSON.Geometry): [number, number][] {
  if (geometry.type === 'Polygon') {
    return geometry.coordinates.flat() as [number, number][];
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.flat(2) as [number, number][];
  }
  return [];
}

export function buildFeatureBBox(feature: GeoJSON.Feature): StaticFeature['__bbox'] {
  const geometry = feature.geometry;
  if (!geometry) return undefined;
  const coords = collectCoords(geometry);
  if (!coords.length) return undefined;

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }
  return { minLng, minLat, maxLng, maxLat };
}

export function featureIntersectsBounds(feature: StaticFeature, bounds: maplibregl.LngLatBounds): boolean {
  const bbox = feature.__bbox;
  if (!bbox) return false;
  return !(
    bbox.maxLng < bounds.getWest() ||
    bbox.minLng > bounds.getEast() ||
    bbox.maxLat < bounds.getSouth() ||
    bbox.minLat > bounds.getNorth()
  );
}

export function isWithinStaticRegion(map: maplibregl.Map, region: StaticRegionBBox): boolean {
  const center = map.getCenter();
  const marginLat = 1 / 111.32;
  const marginLng = 1 / (111.32 * Math.max(0.01, Math.cos((center.lat * Math.PI) / 180)));
  return (
    center.lat >= region.s - marginLat &&
    center.lat <= region.n + marginLat &&
    center.lng >= region.w - marginLng &&
    center.lng <= region.e + marginLng
  );
}
