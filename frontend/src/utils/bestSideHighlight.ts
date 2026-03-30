import type { SelectedBuilding } from '@/types/building';

export type BestSide = 'N' | 'E' | 'S' | 'W';

const SIDE_BEARINGS: Record<BestSide, number> = {
  N: 0,
  E: 90,
  S: 180,
  W: 270,
};

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

function bearingFromAtoB(a: [number, number], b: [number, number]) {
  const latMeters = 111_320;
  const lngMeters = 111_320 * Math.cos(toRad((a[1] + b[1]) / 2));
  const dx = (b[0] - a[0]) * lngMeters;
  const dy = (b[1] - a[1]) * latMeters;
  return norm360(toDeg(Math.atan2(dx, dy)));
}

function closeRing(ring: [number, number][]) {
  if (ring.length < 2) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, first];
}

export function buildBestSideHighlightFeatureCollection(
  building: SelectedBuilding,
  bestSide: BestSide | null | undefined,
): GeoJSON.FeatureCollection {
  if (!bestSide) {
    return { type: 'FeatureCollection', features: [] };
  }

  const targetBearing = SIDE_BEARINGS[bestSide];
  const features: GeoJSON.Feature[] = [];
  const maxDeviation = 45;
  const center: [number, number] = [building.center.lng, building.center.lat];

  for (const polygon of building.polygons) {
    const ring = closeRing(polygon.outer);
    if (ring.length < 4) continue;

    const candidates: Array<{
      a: [number, number];
      b: [number, number];
      deviation: number;
    }> = [];

    for (let i = 0; i < ring.length - 1; i += 1) {
      const a = ring[i];
      const b = ring[i + 1];
      const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const outwardBearing = bearingFromAtoB(center, mid);
      candidates.push({
        a,
        b,
        deviation: angleDiff(outwardBearing, targetBearing),
      });
    }

    const matched = candidates.filter((candidate) => candidate.deviation <= maxDeviation);
    const chosen = matched.length > 0
      ? matched
      : candidates.length > 0
        ? [candidates.reduce((best, current) => (current.deviation < best.deviation ? current : best))]
        : [];

    for (const candidate of chosen) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [candidate.a, candidate.b],
        },
        properties: {
          bestSide,
          deviation: candidate.deviation,
        },
      });
    }
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}
