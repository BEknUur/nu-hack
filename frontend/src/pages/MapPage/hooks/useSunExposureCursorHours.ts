import { useEffect, useRef, useState } from 'react';
import type { MapInteractionHandler, MapPoint } from '@/types/map-engine';
import type { ScreenPoint, ShadowEngineController } from '@/types/shadow-engine';

interface CursorControllerLike {
  getContainerPoint: (point: MapPoint) => ScreenPoint | null;
  onMouseMove: (handler: MapInteractionHandler) => () => void;
  onMouseLeave: (handler: () => void) => () => void;
}

export interface SunExposureCursorHours {
  screenX: number;
  screenY: number;
  hours: number | null;
  loading: boolean;
}

interface UseSunExposureCursorHoursParams {
  enabled: boolean;
  shadow: ShadowEngineController | null;
  controller: CursorControllerLike;
}

const HOVER_SAMPLE_DELAY_MS = 90;

export function useSunExposureCursorHours({
  enabled,
  shadow,
  controller,
}: UseSunExposureCursorHoursParams): SunExposureCursorHours | null {
  const [cursorHours, setCursorHours] = useState<SunExposureCursorHours | null>(null);
  const shadowRef = useRef(shadow);
  const controllerRef = useRef(controller);
  const latestPointRef = useRef<ScreenPoint | null>(null);
  const moveRevisionRef = useRef(0);
  const sampleTimerRef = useRef<number | null>(null);
  const disabledClearTimerRef = useRef<number | null>(null);
  const samplingRef = useRef(false);

  useEffect(() => {
    shadowRef.current = shadow;
    controllerRef.current = controller;
  });

  useEffect(() => {
    if (!enabled || !shadowRef.current) {
      if (sampleTimerRef.current != null) {
        window.clearTimeout(sampleTimerRef.current);
        sampleTimerRef.current = null;
      }
      latestPointRef.current = null;
      samplingRef.current = false;
      disabledClearTimerRef.current = window.setTimeout(() => {
        disabledClearTimerRef.current = null;
        setCursorHours(null);
      }, 0);
      return () => {
        if (disabledClearTimerRef.current != null) {
          window.clearTimeout(disabledClearTimerRef.current);
          disabledClearTimerRef.current = null;
        }
      };
    }

    if (disabledClearTimerRef.current != null) {
      window.clearTimeout(disabledClearTimerRef.current);
      disabledClearTimerRef.current = null;
    }

    const scheduleSample = () => {
      if (sampleTimerRef.current != null || samplingRef.current) return;

      sampleTimerRef.current = window.setTimeout(() => {
        sampleTimerRef.current = null;
        const screenPoint = latestPointRef.current;
        if (!screenPoint) return;

        const revision = moveRevisionRef.current;
        const activeShadow = shadowRef.current;
        if (!activeShadow) {
          setCursorHours((prev) => (prev ? { ...prev, loading: false } : null));
          return;
        }

        samplingRef.current = true;

        activeShadow.getHoursOfSun(screenPoint)
          .then((hours) => {
            if (moveRevisionRef.current !== revision) return;
            setCursorHours((prev) => (prev
              ? {
                  ...prev,
                  hours: Number.isFinite(hours) ? hours : null,
                  loading: false,
                }
              : null));
          })
          .catch(() => {
            if (moveRevisionRef.current !== revision) return;
            setCursorHours((prev) => (prev
              ? {
                  ...prev,
                  hours: null,
                  loading: false,
                }
              : null));
          })
          .finally(() => {
            samplingRef.current = false;
            if (moveRevisionRef.current !== revision && latestPointRef.current) {
              scheduleSample();
            }
          });
      }, HOVER_SAMPLE_DELAY_MS);
    };

    const activeController = controllerRef.current;
    const unsubscribeMove = activeController.onMouseMove((point) => {
      const screenPoint = controllerRef.current.getContainerPoint(point);
      if (!screenPoint) return;

      moveRevisionRef.current += 1;
      latestPointRef.current = screenPoint;
      setCursorHours((prev) => ({
        screenX: screenPoint.x,
        screenY: screenPoint.y,
        hours: prev?.hours ?? null,
        loading: prev?.hours == null || samplingRef.current,
      }));
      scheduleSample();
    });

    const unsubscribeLeave = activeController.onMouseLeave(() => {
      moveRevisionRef.current += 1;
      latestPointRef.current = null;
      if (sampleTimerRef.current != null) {
        window.clearTimeout(sampleTimerRef.current);
        sampleTimerRef.current = null;
      }
      setCursorHours(null);
    });

    return () => {
      unsubscribeMove();
      unsubscribeLeave();
      if (sampleTimerRef.current != null) {
        window.clearTimeout(sampleTimerRef.current);
        sampleTimerRef.current = null;
      }
      if (disabledClearTimerRef.current != null) {
        window.clearTimeout(disabledClearTimerRef.current);
        disabledClearTimerRef.current = null;
      }
      latestPointRef.current = null;
      samplingRef.current = false;
    };
  }, [enabled]);

  return enabled ? cursorHours : null;
}
