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
    let edgeStart: [number, number] = [minLng + padX, minLat + padY];
    let edgeEnd: [number, number] = [maxLng - padX, minLat + padY];
    let bestLen = 0;
    for (let i = 0; i < ring.length - 1; i += 1) {
      const a = ring[i] as [number, number];
      const b = ring[i + 1] as [number, number];
      const len = ((b[0] - a[0]) ** 2) + ((b[1] - a[1]) ** 2);
      if (len > bestLen) {
        bestLen = len;
        edgeStart = a;
        edgeEnd = b;
      }
    }
    for (let i = 0; i < workerCount; i += 1) {
      const x = workerCount === 1 ? 0.5 : i / (workerCount - 1);
      const baseLng = edgeStart[0] + (edgeEnd[0] - edgeStart[0]) * x;
      const baseLat = edgeStart[1] + (edgeEnd[1] - edgeStart[1]) * x;
      const driftLng = Math.sin((tick + i) * 0.7) * lngRange * 0.004;
      const driftLat = Math.cos((tick + i) * 0.7) * latRange * 0.004;
      const lng = baseLng + driftLng;
      const lat = baseLat + driftLat;
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
