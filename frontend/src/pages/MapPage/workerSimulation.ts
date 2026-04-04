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

function randomPointInPolygon(
  ring: [number, number][],
  minLng: number,
  maxLng: number,
  minLat: number,
  maxLat: number,
  pointInPolygon: (lng: number, lat: number) => boolean,
  rng: () => number,
  maxAttempts = 120,
): [number, number] {
  for (let k = 0; k < maxAttempts; k += 1) {
    const lng = minLng + rng() * (maxLng - minLng);
    const lat = minLat + rng() * (maxLat - minLat);
    if (pointInPolygon(lng, lat)) return [lng, lat];
  }
  let sumLng = 0;
  let sumLat = 0;
  const n = Math.max(1, ring.length - 1);
  for (let i = 0; i < n; i += 1) {
    sumLng += ring[i][0];
    sumLat += ring[i][1];
  }
  return [sumLng / n, sumLat / n];
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

  const features: GeoJSON.Feature[] = [];
  if (taskType === 'facade_maintenance' && facadeAnchors.length > 0) {
    for (let i = 0; i < workerCount; i += 1) {
      const anchor = facadeAnchors[i % facadeAnchors.length];
      const [baseLng, baseLat] = anchor.point;
      const phase = tick * 0.55 + i * 0.9;
      const tangentAmp = Math.max(lngRange, latRange) * 0.012;
      const normalAmp = Math.max(lngRange, latRange) * 0.0026;
      const tangentShift = Math.sin(phase) * tangentAmp;
      const normalShift = Math.cos(phase * 0.75) * normalAmp;
      const driftLng = anchor.tangent[0] * tangentShift + anchor.normal[0] * normalShift;
      const driftLat = anchor.tangent[1] * tangentShift + anchor.normal[1] * normalShift;
      let lng = baseLng + driftLng;
      let lat = baseLat + driftLat;
      if (geometryContainsPoint(anchor.geometry, lng, lat)) {
        lng = baseLng + anchor.tangent[0] * tangentShift - anchor.normal[0] * Math.abs(normalShift);
        lat = baseLat + anchor.tangent[1] * tangentShift - anchor.normal[1] * Math.abs(normalShift);
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
      const rng = mulberry32(areaSeed + i * 10007 + 3331);
      const [baseLng, baseLat] = randomPointInPolygon(
        ringTyped,
        minLng,
        maxLng,
        minLat,
        maxLat,
        pointInPolygon,
        rng,
      );
      const driftLng = Math.sin((tick + i) * 0.7) * lngRange * 0.004;
      const driftLat = Math.cos((tick + i) * 0.7) * latRange * 0.004;
      let lng = baseLng + driftLng;
      let lat = baseLat + driftLat;
      if (!pointInPolygon(lng, lat)) {
        lng = baseLng;
        lat = baseLat;
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

  for (let i = 0; i < workerCount; i += 1) {
    const rng = mulberry32(areaSeed + i * 10007 + 7777);
    const [baseLng, baseLat] = randomPointInPolygon(
      ringTyped,
      minLng,
      maxLng,
      minLat,
      maxLat,
      pointInPolygon,
      rng,
    );
    const driftLng = Math.sin((tick + i) * 0.55) * lngRange * 0.003;
    const driftLat = Math.cos((tick + i) * 0.52) * latRange * 0.003;
    let lng = baseLng + driftLng;
    let lat = baseLat + driftLat;
    if (!pointInPolygon(lng, lat)) {
      lng = baseLng;
      lat = baseLat;
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
