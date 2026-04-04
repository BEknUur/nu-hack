import { useEffect } from 'react';
import { SUN_EXPOSURE_CONFIG } from '@/config/map';
import { isMapReadyForShadeOps } from '@/pages/MapPage/mapPageHelpers';
import type { ShadowEngineController } from '@/types/shadow-engine';
import { astanaLocalToDate } from '@/utils/astanaTime';

interface ShadeControllerLike {
  isReady: () => boolean;
}

function getDefaultSunExposureRange(dateStr: string) {
  return {
    startDate: astanaLocalToDate(dateStr, SUN_EXPOSURE_CONFIG.startHour, 0),
    endDate: astanaLocalToDate(dateStr, SUN_EXPOSURE_CONFIG.endHour, 0),
    iterations: SUN_EXPOSURE_CONFIG.iterations,
  };
}

export interface UseShadeMapDateAndExposureParams {
  date: Date;
  dateStr: string;
  sunExposure: boolean;
  shadow: ShadowEngineController | null;
  controller: ShadeControllerLike;
  isTreeMode: boolean;
  isWorkerMode: boolean;
}

export function useShadeMapDateAndExposure({
  date,
  dateStr,
  sunExposure,
  shadow,
  controller,
  isTreeMode,
  isWorkerMode,
}: UseShadeMapDateAndExposureParams) {
  useEffect(() => {
    // Default map: sun-exposure mode samples heavily — skip frequent setDate to avoid WebGL races.
    // /trees and /workers: time slider must always drive shadows (exploration + worker sim).
    const isScenarioRoute = isTreeMode || isWorkerMode;
    if (sunExposure && !isScenarioRoute) return;
    if (!shadow || !isMapReadyForShadeOps(controller)) return;
    try {
      shadow.setDate(date);
    } catch {
      return;
    }
  }, [date, sunExposure, shadow, controller, isTreeMode, isWorkerMode]);

  useEffect(() => {
    if (!shadow || !isMapReadyForShadeOps(controller)) return;

    shadow.setSunExposure(sunExposure, {
      ...getDefaultSunExposureRange(dateStr),
    }).catch(() => {
    });
  }, [sunExposure, dateStr, shadow, controller]);
}
