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

type WorkerRoute = [number, number][];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function routeDistance(route: WorkerRoute) {
  let total = 0;
  for (let i = 0; i < route.length - 1; i += 1) {
    const [ax, ay] = route[i];
    const [bx, by] = route[i + 1];
    total += Math.hypot(bx - ax, by - ay);
  }
  return total;
}

function pointOnRoute(route: WorkerRoute, progress: number): [number, number] {
  if (route.length === 0) return [0, 0];
  if (route.length === 1) return route[0];

  const total = routeDistance(route);
  if (total <= 1e-9) return route[0];

  const wrapped = ((progress % 2) + 2) % 2;
  const pingPong = wrapped <= 1 ? wrapped : 2 - wrapped;
  let targetDistance = pingPong * total;

  for (let i = 0; i < route.length - 1; i += 1) {
    const [ax, ay] = route[i];
    const [bx, by] = route[i + 1];
    const segment = Math.hypot(bx - ax, by - ay);
    if (segment <= 1e-9) continue;
    if (targetDistance <= segment) {
      const t = targetDistance / segment;
      return [ax + (bx - ax) * t, ay + (by - ay) * t];
    }
    targetDistance -= segment;
  }

  return route[route.length - 1];
}

function sampleSegmentRoute(
  start: [number, number],
  end: [number, number],
  normal: [number, number],
  offset: number,
  samples: number,
): WorkerRoute {
  const route: WorkerRoute = [];
  const safeSamples = Math.max(2, samples);
  for (let i = 0; i < safeSamples; i += 1) {
    const t = safeSamples === 1 ? 0 : i / (safeSamples - 1);
    route.push([
      start[0] + (end[0] - start[0]) * t + normal[0] * offset,
      start[1] + (end[1] - start[1]) * t + normal[1] * offset,
    ]);
  }
  return route;
}

export function buildWorkerFeatureCollection(
  geometry: RankAreaGeometry | null,
  taskType: WorkerTaskType,
  buildings: GeoJSON.Feature[],
  simMinute: number,
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
  const padX = lngRange * 0.1;
  const padY = latRange * 0.1;

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
  const facadeRoutes: WorkerRoute[] = [];
  const anchorOffset = Math.max(lngRange, latRange) * 0.014;
  for (const feature of buildings) {
    const geometryObj = feature.geometry as GeoJSON.Geometry | null | undefined;
    if (!geometryObj) continue;
    const center = getGeometryCenter(geometryObj);
    if (!center) continue;
    const [lng, lat] = center;
    if (!pointInPolygon(lng, lat)) continue;
    buildingCenters.push([lng, lat]);

    const pushRouteForRing = (targetRing: [number, number][]) => {
      if (!targetRing || targetRing.length < 4) return;
      const usableVertices = Math.max(1, targetRing.length - 1);
      const route: WorkerRoute = [];
      for (let i = 0; i < usableVertices; i += 1) {
        const current = targetRing[i] as [number, number];
        const next = (targetRing[(i + 1) % usableVertices] ?? current) as [number, number];
        const mx = (current[0] + next[0]) / 2;
        const my = (current[1] + next[1]) / 2;
        const nxRaw = mx - lng;
        const nyRaw = my - lat;
        const nLen = Math.hypot(nxRaw, nyRaw) || 1e-9;
        const normal: [number, number] = [nxRaw / nLen, nyRaw / nLen];
        const segmentLen = Math.hypot(next[0] - current[0], next[1] - current[1]);
        const samples = clamp(Math.round((segmentLen / Math.max(lngRange, latRange)) * 18), 3, 8);
        const segmentRoute = sampleSegmentRoute(current, next, normal, anchorOffset, samples);
        for (const [sx, sy] of segmentRoute) {
          if (!pointInPolygon(sx, sy)) continue;
          if (geometryContainsPoint(geometryObj, sx, sy)) continue;
          const prevPoint = route[route.length - 1];
          if (!prevPoint || Math.hypot(prevPoint[0] - sx, prevPoint[1] - sy) > 1e-7) {
            route.push([sx, sy]);
          }
        }
      }
      if (route.length >= 2) {
        facadeRoutes.push(route);
      }
    };

    if (geometryObj.type === 'Polygon') {
      pushRouteForRing((geometryObj.coordinates?.[0] ?? []) as [number, number][]);
    } else if (geometryObj.type === 'MultiPolygon') {
      for (const polygon of geometryObj.coordinates ?? []) {
        pushRouteForRing((polygon?.[0] ?? []) as [number, number][]);
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

  const features: GeoJSON.Feature[] = [];
  const progressBase = (simMinute - 9 * 60) / 45;
  if (taskType === 'facade_maintenance' && facadeRoutes.length > 0) {
    for (let i = 0; i < workerCount; i += 1) {
      const route = facadeRoutes[i % facadeRoutes.length];
      const [lng, lat] = pointOnRoute(route, progressBase + i * 0.18);
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
    let edgeStart: [number, number] = [minLng + padX, minLat + padY];
    let edgeEnd: [number, number] = [maxLng - padX, minLat + padY];
    let bestLen = 0;
    let edgeNormal: [number, number] = [0, 1];
    for (let i = 0; i < ring.length - 1; i += 1) {
      const a = ring[i] as [number, number];
      const b = ring[i + 1] as [number, number];
      const len = ((b[0] - a[0]) ** 2) + ((b[1] - a[1]) ** 2);
      if (len > bestLen) {
        bestLen = len;
        edgeStart = a;
        edgeEnd = b;
        const mx = (a[0] + b[0]) / 2;
        const my = (a[1] + b[1]) / 2;
        const nx = mx - (minLng + maxLng) / 2;
        const ny = my - (minLat + maxLat) / 2;
        const nLen = Math.hypot(nx, ny) || 1e-9;
        edgeNormal = [nx / nLen, ny / nLen];
      }
    }
    const laneOffsetBase = Math.max(lngRange, latRange) * 0.004;
    const baseRoute = sampleSegmentRoute(edgeStart, edgeEnd, edgeNormal, 0, 12);
    for (let i = 0; i < workerCount; i += 1) {
      const laneShift = ((i % 3) - 1) * laneOffsetBase;
      const laneRoute = baseRoute.map(([lng, lat]) => [
        lng + edgeNormal[0] * laneShift,
        lat + edgeNormal[1] * laneShift,
      ] as [number, number]);
      const [lng, lat] = pointOnRoute(laneRoute, progressBase + i * 0.22);
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

  const cols = Math.max(1, Math.ceil(Math.sqrt(workerCount)));
  const rows = Math.max(1, Math.ceil(workerCount / cols));
  const innerW = Math.max(1e-6, lngRange - padX * 2);
  const innerH = Math.max(1e-6, latRange - padY * 2);
  for (let i = 0; i < workerCount; i += 1) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = cols === 1 ? 0.5 : col / (cols - 1);
    const y = rows === 1 ? 0.5 : row / (rows - 1);
    const lng = minLng + padX + innerW * x;
    const lat = maxLat - padY - innerH * y;
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
