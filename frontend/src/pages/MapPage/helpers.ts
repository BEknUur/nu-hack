import type { MapEngineController } from '@/types/map-engine';
import type { RankAreaGeometry } from '@/types/tree-optimizer';

export function isMapReadyForShadeOps(controller: Pick<MapEngineController, 'isReady'>) {
  return controller.isReady();
}

export function sideToLabel(
  side: 'N' | 'E' | 'S' | 'W' | null | undefined,
  labels: { north: string; east: string; south: string; west: string },
) {
  if (side === 'N') return labels.north;
  if (side === 'E') return labels.east;
  if (side === 'S') return labels.south;
  if (side === 'W') return labels.west;
  return null;
}

export function formatCoord(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(5) : '-';
}

export function formatAreaSummary(geometry: RankAreaGeometry | null) {
  if (!geometry) return 'none';
  if (geometry.type !== 'Polygon') return geometry.type;
  const points = geometry.coordinates?.[0]?.length ?? 0;
  return `Polygon (${points} pts)`;
}
