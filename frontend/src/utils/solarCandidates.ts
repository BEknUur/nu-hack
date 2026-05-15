import type { RankAreaGeometry } from '@/types/tree-optimizer';
import type { SolarCandidate, SolarOptimizationTarget } from '@/types/solar-flowers';
import { geometryToBounds } from '@/utils/treeArea';

type Coord = [number, number];

function pointInPolygon(point: Coord, ring: number[][]): boolean {
  const [px, py] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if (((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 43758.5453123;
  return x - Math.floor(x);
}

function hashCoord(lat: number, lng: number): number {
  return Math.abs(Math.sin(lat * 1234.5678) * Math.cos(lng * 8765.4321)) * 99991;
}

export function generateSolarCandidates(
  geometry: RankAreaGeometry,
  topK: number,
  target: SolarOptimizationTarget,
  stepM = 14,
): SolarCandidate[] {
  const bounds = geometryToBounds(geometry);
  const ring = geometry.type === 'Polygon'
    ? geometry.coordinates[0]
    : geometry.coordinates[0][0];

  const centerLat = (bounds.south + bounds.north) / 2;
  const mPerDegLat = 111_320;
  const mPerDegLng = 111_320 * Math.cos((centerLat * Math.PI) / 180);
  const dLat = stepM / mPerDegLat;
  const dLng = stepM / mPerDegLng;

  const all: SolarCandidate[] = [];
  let idx = 0;

  for (let lat = bounds.south + dLat / 2; lat < bounds.north; lat += dLat) {
    for (let lng = bounds.west + dLng / 2; lng < bounds.east; lng += dLng) {
      if (!pointInPolygon([lng, lat], ring)) continue;

      const seed = hashCoord(lat, lng);
      const r1 = seededRandom(seed);
      const r2 = seededRandom(seed + 1.5);
      const r3 = seededRandom(seed + 3.1);
      const r4 = seededRandom(seed + 4.7);
      const r5 = seededRandom(seed + 6.2);

      // Kazakhstan center ~48°N; normalize irradiance slightly for latitude
      const latNorm = 1 - (Math.abs(lat - 48) / 25) * 0.12;

      const annual_irradiance = Math.min(100, Math.max(25, 68 * latNorm + r1 * 28));
      const winter_irradiance = Math.min(100, Math.max(15, 42 * latNorm + r2 * 32));
      const shading_risk = Math.min(100, Math.max(30, 58 + r3 * 38));
      const slope_suitability = Math.min(100, Math.max(45, 72 + r4 * 24));
      const access_score = Math.min(100, Math.max(30, 58 + r5 * 38));

      let score: number;
      if (target === 'max_annual') {
        score = annual_irradiance * 0.55 + shading_risk * 0.25 + slope_suitability * 0.2;
      } else if (target === 'max_winter') {
        score = winter_irradiance * 0.55 + shading_risk * 0.25 + slope_suitability * 0.2;
      } else {
        score =
          annual_irradiance * 0.22 +
          winter_irradiance * 0.22 +
          shading_risk * 0.28 +
          slope_suitability * 0.18 +
          access_score * 0.1;
      }

      // ~200W panel, ~4.5 peak sun hours/day avg Kazakhstan
      const kwhPerYearEst = Math.round(
        ((200 * 4.5 * 365 * (score / 100) * (0.88 + r1 * 0.1)) / 1000),
      );

      all.push({
        id: `sf-${idx++}`,
        rank: 0,
        lat,
        lng,
        score: Math.round(score),
        kwhPerYearEst,
        factors: {
          annual_irradiance: Math.round(annual_irradiance),
          winter_irradiance: Math.round(winter_irradiance),
          shading_risk: Math.round(shading_risk),
          slope_suitability: Math.round(slope_suitability),
          access_score: Math.round(access_score),
        },
      });
    }
  }

  all.sort((a, b) => b.score - a.score);
  const top = all.slice(0, topK);
  top.forEach((c, i) => { c.rank = i + 1; });
  return top;
}
