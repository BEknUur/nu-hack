import { estimateGeometryAreaKm2 } from '@/utils/treeArea';
import type { RankAreaGeometry, TreeDrawMode } from '@/types/tree-optimizer';

export interface WorkerExposureStat {
  sunMinutes: number;
  shadeMinutes: number;
  focusScore: number;
}

export interface WorkerFeatureProps {
  emoji: string;
  worker_id: number;
  worker_name: string;
  activity: string;
}

export interface SelectedWorkerInfo extends WorkerFeatureProps {
  lat: number;
  lng: number;
}

const WORKER_FIRST_NAMES = [
  'Alex',
  'Maksim',
  'Timur',
  'Arman',
  'Nikita',
  'Ayan',
  'Ruslan',
  'Ilya',
  'Daniyar',
  'Miras',
  'Askar',
  'Yernar',
  'Sanzhar',
  'Roman',
  'Eldar',
  'Sergey',
];

const WORKER_LAST_NAMES = [
  'Ibragimov',
  'Kim',
  'Zhaksylykov',
  'Petrov',
  'Suleimenov',
  'Aitbayev',
  'Kuznetsov',
  'Smagulov',
  'Nazarbekov',
  'Akhmetov',
  'Tleulin',
  'Borodin',
  'Rakhimov',
  'Abdrakhmanov',
  'Karimov',
  'Muratov',
];

export function getWorkerRandomName(workerId: number, taskType: WorkerTaskType) {
  const seed = workerId * 37 + (taskType === 'facade_maintenance' ? 11 : 29);
  const first = WORKER_FIRST_NAMES[seed % WORKER_FIRST_NAMES.length];
  const last = WORKER_LAST_NAMES[(seed * 3) % WORKER_LAST_NAMES.length];
  return `${first} ${last}`;
}

export function minuteToClockLabel(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export type WorkerTaskType = 'facade_maintenance' | 'road_repair';
export type WorkerDrawMode = TreeDrawMode | null;

export function getWorkerActivity(taskType: WorkerTaskType) {
  return taskType === 'facade_maintenance' ? 'Facade maintenance' : 'Road repair';
}

/** Stable seed from ring vertices so the same drawn area gives reproducible layouts. */
function ringSeed(ring: [number, number][]): number {
  let h = 2166136261;
  for (let i = 0; i < ring.length; i += 1) {
    const [lng, lat] = ring[i];
    h ^= Math.round(lng * 1e7);
    h = Math.imul(h, 16777619);
    h ^= Math.round(lat * 1e7);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fract(x: number): number {
  return x - Math.floor(x);
}

/** Distance in rough map-plane units (lng/lat degrees — ok for short segments). */
function segLen(a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return Math.hypot(dx, dy);
}

/**
 * Walk along a polyline (optionally closed). u in [0,1) maps to arc length.
 */
function pointAlongPolyline(
  points: [number, number][],
  u: number,
  closed: boolean,
): [number, number] {
  if (points.length === 0) return [0, 0];
  if (points.length === 1) return points[0];
  const n = points.length;
  const segCount = closed ? n : n - 1;
  const lengths: number[] = [];
  let total = 0;
  for (let i = 0; i < segCount; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % n];
    const len = segLen(a, b);
    lengths.push(len);
    total += len;
  }
  if (total < 1e-12) return points[0];
  let dist = fract(u) * total;
  for (let i = 0; i < segCount; i += 1) {
    if (dist <= lengths[i]) {
      const a = points[i];
      const b = points[(i + 1) % n];
      const t = lengths[i] < 1e-12 ? 0 : dist / lengths[i];
      return [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
      ];
    }
    dist -= lengths[i];
  }
  return points[0];
}

/** Push ring boundary slightly toward interior (centroid) so markers stay inside AOI. */
function insetRingTowardCentroid(
  ring: [number, number][],
  amount: number,
): [number, number][] {
  let cx = 0;
  let cy = 0;
  const m = Math.max(1, ring.length - 1);
  for (let i = 0; i < m; i += 1) {
    cx += ring[i][0];
    cy += ring[i][1];
  }
  cx /= m;
  cy /= m;
  return ring.map(([x, y]) => {
    const dx = cx - x;
    const dy = cy - y;
    const len = Math.hypot(dx, dy) || 1e-9;
    return [x + (dx / len) * amount, y + (dy / len) * amount] as [number, number];
  });
}

export function buildWorkerFeatureCollection(
  geometry: RankAreaGeometry | null,
  taskType: WorkerTaskType,
  buildings: GeoJSON.Feature[],
  tick: number,
): GeoJSON.FeatureCollection {
  if (!geometry || geometry.type !== 'Polygon') {
    return { type: 'FeatureCollection', features: [] };
  }

  const ring = geometry.coordinates?.[0];
  if (!ring || ring.length < 4) {
    return { type: 'FeatureCollection', features: [] };
  }

  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of ring) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  if (!Number.isFinite(minLng) || !Number.isFinite(maxLng) || !Number.isFinite(minLat) || !Number.isFinite(maxLat)) {
    return { type: 'FeatureCollection', features: [] };
  }

  const lngRange = Math.max(1e-6, maxLng - minLng);
  const latRange = Math.max(1e-6, maxLat - minLat);

  const pointInPolygon = (lng: number, lat: number) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
      const xi = ring[i][0];
      const yi = ring[i][1];
      const xj = ring[j][0];
      const yj = ring[j][1];
      const intersects = ((yi > lat) !== (yj > lat))
        && (lng < ((xj - xi) * (lat - yi)) / ((yj - yi) || 1e-9) + xi);
      if (intersects) inside = !inside;
    }
    return inside;
  };

  const pointInRing = (targetRing: [number, number][], lng: number, lat: number) => {
    let inside = false;
    for (let i = 0, j = targetRing.length - 1; i < targetRing.length; j = i, i += 1) {
      const xi = targetRing[i][0];
      const yi = targetRing[i][1];
      const xj = targetRing[j][0];
      const yj = targetRing[j][1];
      const intersects = ((yi > lat) !== (yj > lat))
        && (lng < ((xj - xi) * (lat - yi)) / ((yj - yi) || 1e-9) + xi);
      if (intersects) inside = !inside;
    }
    return inside;
  };

  const geometryContainsPoint = (g: GeoJSON.Geometry, lng: number, lat: number) => {
    if (g.type === 'Polygon') {
      const polyRing = g.coordinates?.[0] as [number, number][] | undefined;
      if (!polyRing?.length) return false;
      return pointInRing(polyRing, lng, lat);
    }
    if (g.type === 'MultiPolygon') {
      for (const polygon of g.coordinates ?? []) {
        const polyRing = polygon?.[0] as [number, number][] | undefined;
        if (polyRing?.length && pointInRing(polyRing, lng, lat)) return true;
      }
    }
    return false;
  };

  const getGeometryCenter = (g: GeoJSON.Geometry): [number, number] | null => {
    if (g.type === 'Polygon') {
      const points = g.coordinates?.[0];
      if (!points?.length) return null;
      let sumLng = 0;
      let sumLat = 0;
      for (const [lng, lat] of points) {
        sumLng += lng;
        sumLat += lat;
      }
      return [sumLng / points.length, sumLat / points.length];
    }
    if (g.type === 'MultiPolygon') {
      const points = g.coordinates?.[0]?.[0];
      if (!points?.length) return null;
      let sumLng = 0;
      let sumLat = 0;
      for (const [lng, lat] of points) {
        sumLng += lng;
        sumLat += lat;
      }
      return [sumLng / points.length, sumLat / points.length];
    }
    return null;
  };

  const areaKm2 = estimateGeometryAreaKm2(geometry);
  const buildingCenters: [number, number][] = [];
  const facadeAnchors: Array<{
    point: [number, number];
    geometry: GeoJSON.Geometry;
    tangent: [number, number];
    normal: [number, number];
  }> = [];
  const anchorOffset = Math.max(lngRange, latRange) * 0.014;
  for (const feature of buildings) {
    const geometryObj = feature.geometry as GeoJSON.Geometry | null | undefined;
    if (!geometryObj) continue;
    const center = getGeometryCenter(geometryObj);
    if (!center) continue;
    const [lng, lat] = center;
    if (!pointInPolygon(lng, lat)) continue;
    buildingCenters.push([lng, lat]);

    const pushAnchorsForRing = (targetRing: [number, number][]) => {
      if (!targetRing || targetRing.length < 4) return;
      const usableVertices = Math.max(1, targetRing.length - 1);
      const step = Math.max(1, Math.floor(usableVertices / 6));
      for (let i = 0; i < usableVertices; i += step) {
        const [vx, vy] = targetRing[i];
        const dx = vx - lng;
        const dy = vy - lat;
        const len = Math.hypot(dx, dy) || 1e-9;
        const ax = vx + (dx / len) * anchorOffset;
        const ay = vy + (dy / len) * anchorOffset;
        if (!pointInPolygon(ax, ay)) continue;
        if (geometryContainsPoint(geometryObj, ax, ay)) continue;
        const next = targetRing[(i + 1) % usableVertices] ?? targetRing[i];
        const txRaw = next[0] - vx;
        const tyRaw = next[1] - vy;
        const tLen = Math.hypot(txRaw, tyRaw) || 1e-9;
        const tangent: [number, number] = [txRaw / tLen, tyRaw / tLen];
        const normal: [number, number] = [dx / len, dy / len];
        facadeAnchors.push({ point: [ax, ay], geometry: geometryObj, tangent, normal });
      }
    };

    if (geometryObj.type === 'Polygon') {
      pushAnchorsForRing((geometryObj.coordinates?.[0] ?? []) as [number, number][]);
    } else if (geometryObj.type === 'MultiPolygon') {
      for (const polygon of geometryObj.coordinates ?? []) {
        pushAnchorsForRing((polygon?.[0] ?? []) as [number, number][]);
      }
    }
  }

  const workerCount = (() => {
    if (taskType === 'facade_maintenance') {
      const count = Math.round(2 + areaKm2 * 8 + buildingCenters.length * 0.22);
      return Math.max(3, Math.min(24, count));
    }
    const roadCount = Math.round(3 + areaKm2 * 10);
    return Math.max(4, Math.min(18, roadCount));
  })();

  const ringTyped = ring as [number, number][];
  const areaSeed = ringSeed(ringTyped);
  const inset = Math.max(lngRange, latRange) * 0.014;
  const zonePatrolRing = insetRingTowardCentroid(ringTyped, inset);

  const facadePaths: [number, number][][] = [];
  if (facadeAnchors.length > 0) {
    const byGeom = new Map<GeoJSON.Geometry, typeof facadeAnchors>();
    for (const a of facadeAnchors) {
      const list = byGeom.get(a.geometry) ?? [];
      list.push(a);
      byGeom.set(a.geometry, list);
    }
    for (const [, list] of byGeom) {
      const center = getGeometryCenter(list[0].geometry);
      if (!center) continue;
      const [cx, cy] = center;
      if (list.length < 2) {
        const a0 = list[0];
        const span = Math.max(lngRange, latRange) * 0.02;
        facadePaths.push([
          a0.point,
          [a0.point[0] + a0.tangent[0] * span, a0.point[1] + a0.tangent[1] * span],
        ]);
        continue;
      }
      const sorted = [...list].sort(
        (a, b) => Math.atan2(a.point[1] - cy, a.point[0] - cx) - Math.atan2(b.point[1] - cy, b.point[0] - cx),
      );
      facadePaths.push(sorted.map((x) => x.point));
    }
  }

  const features: GeoJSON.Feature[] = [];
  if (taskType === 'facade_maintenance' && facadePaths.length > 0) {
    for (let i = 0; i < workerCount; i += 1) {
      const path = facadePaths[i % facadePaths.length];
      const speed = 0.018 + (i % 9) * 0.0035;
      const phase = fract(areaSeed * 1e-9 + i * 0.273);
      const u = fract(tick * speed + phase);
      const closed = path.length >= 2;
      let [lng, lat] = pointAlongPolyline(path, u, closed);
      if (!pointInPolygon(lng, lat)) {
        [lng, lat] = pointAlongPolyline(zonePatrolRing, fract(u + 0.31 + i * 0.07), true);
      }
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: {
          emoji: '👷',
          worker_id: i + 1,
          worker_name: getWorkerRandomName(i + 1, taskType),
          activity: getWorkerActivity(taskType),
        } satisfies WorkerFeatureProps,
      });
    }
    return { type: 'FeatureCollection', features };
  }

  if (taskType === 'road_repair') {
    for (let i = 0; i < workerCount; i += 1) {
      const speed = 0.028 + (i % 8) * 0.005;
      const phase = fract(areaSeed * 1e-9 + i * 0.41 + 0.12);
      const u = fract(tick * speed + phase);
      const [lng, lat] = pointAlongPolyline(zonePatrolRing, u, true);
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: {
          emoji: '👷',
          worker_id: i + 1,
          worker_name: getWorkerRandomName(i + 1, taskType),
          activity: getWorkerActivity(taskType),
        } satisfies WorkerFeatureProps,
      });
    }
    return { type: 'FeatureCollection', features };
  }

  for (let i = 0; i < workerCount; i += 1) {
    const rng = mulberry32(areaSeed + i * 10007 + 7777);
    const speed = 0.02 + rng() * 0.02;
    const phase = rng();
    const u = fract(tick * speed + phase);
    const [lng, lat] = pointAlongPolyline(zonePatrolRing, u, true);
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        emoji: '👷',
        worker_id: i + 1,
        worker_name: getWorkerRandomName(i + 1, taskType),
        activity: getWorkerActivity(taskType),
      } satisfies WorkerFeatureProps,
    });
  }

  return { type: 'FeatureCollection', features };
}
