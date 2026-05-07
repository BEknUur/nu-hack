import { SIDE_BEARINGS } from '@/hooks/maplibre/constants';
import { bearingFromAtoB, centroidOfRing, matchesBearing, polygonOuterRing } from '@/hooks/maplibre/geo';
import type { StaticFeature } from '@/hooks/maplibre/types';

export function createSunWallFeatures(features: StaticFeature[]): GeoJSON.Feature[] {
  const wallFeatures: GeoJSON.Feature[] = [];
  const latMeters = 111_320;
  const wallThicknessMeters = 1.2;

  for (const feature of features) {
    const props = (feature.properties ?? {}) as {
      id?: string;
      bestSide?: string;
      render_height?: number;
      height?: number;
    };
    const bestSide = props.bestSide as 'N' | 'E' | 'S' | 'W' | undefined;
    if (!bestSide) continue;

    const ring = polygonOuterRing(feature);
    if (!ring || ring.length < 4) continue;
    const center = centroidOfRing(ring);
    if (!center) continue;

    const targetBearing = SIDE_BEARINGS[bestSide];
    const wallHeight = Number(props.render_height ?? props.height ?? 3);

    for (let i = 0; i < ring.length - 1; i += 1) {
      const a = ring[i];
      const b = ring[i + 1];
      const midLng = (a[0] + b[0]) / 2;
      const midLat = (a[1] + b[1]) / 2;
      const outwardBearing = bearingFromAtoB([center.lng, center.lat], [midLng, midLat]);
      if (!matchesBearing(outwardBearing, targetBearing)) continue;

      const lngMeters = 111_320 * Math.cos((midLat * Math.PI) / 180);
      if (!Number.isFinite(lngMeters) || Math.abs(lngMeters) < 1e-6) continue;

      const toCenterX = (center.lng - midLng) * lngMeters;
      const toCenterY = (center.lat - midLat) * latMeters;
      const len = Math.hypot(toCenterX, toCenterY);
      if (len < 1e-6) continue;

      const offsetX = (toCenterX / len) * wallThicknessMeters;
      const offsetY = (toCenterY / len) * wallThicknessMeters;
      const offsetLng = offsetX / lngMeters;
      const offsetLat = offsetY / latMeters;

      const aIn: [number, number] = [a[0] + offsetLng, a[1] + offsetLat];
      const bIn: [number, number] = [b[0] + offsetLng, b[1] + offsetLat];

      wallFeatures.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[a, b, bIn, aIn, a]],
        },
        properties: {
          id: props.id,
          bestSide,
          wall_height: wallHeight,
        },
      });
    }
  }

  return wallFeatures;
}
