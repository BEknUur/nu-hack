import { astanaLocalToDate } from '@/utils/astanaTime';
import type { ShadowEngineController } from '@/types/shadow-engine';

export function isMapReadyForShadeOps(engineController: { isReady: () => boolean }): boolean {
  return engineController.isReady();
}

export function applyShadowDateForSimMinute(
  shadow: ShadowEngineController | null,
  controller: { isReady: () => boolean },
  dateStr: string,
  simMinute: number,
): void {
  if (!shadow || !isMapReadyForShadeOps(controller)) return;
  try {
    shadow.setDate(astanaLocalToDate(dateStr, Math.floor(simMinute / 60), simMinute % 60));
  } catch {
    // transient WebGL / shade map races
  }
}

export function sideToLabel(
  side: 'N' | 'E' | 'S' | 'W' | null | undefined,
  labels: { north: string; east: string; south: string; west: string },
): string | null {
  if (side === 'N') return labels.north;
  if (side === 'E') return labels.east;
  if (side === 'S') return labels.south;
  if (side === 'W') return labels.west;
  return null;
}
