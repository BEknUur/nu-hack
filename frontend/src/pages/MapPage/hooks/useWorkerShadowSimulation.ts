import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';
import type { MapPoint } from '@/types/map-engine';
import type { RankAreaGeometry } from '@/types/tree-optimizer';
import type { ShadowEngineController } from '@/types/shadow-engine';
import { applyShadowDateForSimMinute } from '@/pages/MapPage/mapPageHelpers';
import {
  buildWorkerFeatureCollection,
  type SelectedWorkerInfo,
  type WorkerExposureStat,
  type WorkerFeatureProps,
  type WorkerTaskType,
} from '@/pages/MapPage/workerSimulation';

interface MapControllerLike {
  isReady: () => boolean;
  getContainerPoint: (point: MapPoint) => { x: number; y: number } | null;
}

export interface UseWorkerShadowSimulationParams {
  isWorkerMode: boolean;
  workerAreaGeometry: RankAreaGeometry | null;
  workerTaskType: WorkerTaskType;
  workerSimRunning: boolean;
  workerSimSpeedMs: number;
  setWorkerSimRunning: Dispatch<SetStateAction<boolean>>;
  setWorkerSimTick: Dispatch<SetStateAction<number>>;
  setWorkerSimMinute: Dispatch<SetStateAction<number>>;
  setWorkerStats: Dispatch<SetStateAction<Record<number, WorkerExposureStat>>>;
  setSelectedWorker: Dispatch<SetStateAction<SelectedWorkerInfo | null>>;
  setSunExposure: Dispatch<SetStateAction<boolean>>;
  setSlider: (value: number) => void;
  shadowRef: RefObject<ShadowEngineController | null>;
  controllerRef: RefObject<MapControllerLike | null>;
  setSliderRef: RefObject<((value: number) => void) | null>;
  dateStrRef: RefObject<string>;
  buildingsRef: RefObject<GeoJSON.Feature[]>;
}

export function useWorkerShadowSimulation({
  isWorkerMode,
  workerAreaGeometry,
  workerTaskType,
  workerSimRunning,
  workerSimSpeedMs,
  setWorkerSimRunning,
  setWorkerSimTick,
  setWorkerSimMinute,
  setWorkerStats,
  setSelectedWorker,
  setSunExposure,
  setSlider,
  shadowRef,
  controllerRef,
  setSliderRef,
  dateStrRef,
  buildingsRef,
}: UseWorkerShadowSimulationParams) {
  const workerSimTimerRef = useRef<number | null>(null);
  const workerSimStartTimeoutRef = useRef<number | null>(null);
  const workerSimBusyRef = useRef(false);

  const stopWorkerSimulationTimers = useCallback(() => {
    if (workerSimStartTimeoutRef.current != null) {
      window.clearTimeout(workerSimStartTimeoutRef.current);
      workerSimStartTimeoutRef.current = null;
    }
    if (workerSimTimerRef.current != null) {
      window.clearInterval(workerSimTimerRef.current);
      workerSimTimerRef.current = null;
    }
    workerSimBusyRef.current = false;
  }, []);

  const startWorkerSimulation = useCallback(() => {
    if (!workerAreaGeometry) return;
    stopWorkerSimulationTimers();
    setWorkerStats({});
    setSelectedWorker(null);
    setWorkerSimTick(0);
    setWorkerSimMinute(9 * 60);
    setWorkerSimRunning(true);
    setSunExposure(false);
    setSlider(9 * 60);
  }, [
    stopWorkerSimulationTimers,
    workerAreaGeometry,
    setWorkerStats,
    setSelectedWorker,
    setWorkerSimTick,
    setWorkerSimMinute,
    setWorkerSimRunning,
    setSunExposure,
    setSlider,
  ]);

  useEffect(() => {
    if (!workerSimRunning || !isWorkerMode || !workerAreaGeometry) return;
    const stepMinutes = 60;
    const startMinute = 9 * 60;
    const endMinute = 17 * 60;
    const shadowWarmupMs = Math.min(1200, Math.max(450, Math.floor(workerSimSpeedMs * 0.6)));
    let minute = startMinute;
    let tick = 0;

    const runSamplingStep = async () => {
      if (workerSimBusyRef.current) return;
      const activeShadow = shadowRef.current;
      if (!activeShadow) return;
      workerSimBusyRef.current = true;
      try {
        const setSliderFn = setSliderRef.current;
        if (setSliderFn) setSliderFn(minute);
        setWorkerSimMinute(minute);
        applyShadowDateForSimMinute(
          shadowRef.current,
          controllerRef.current ?? { isReady: () => false },
          dateStrRef.current,
          minute,
        );
        tick += 1;
        setWorkerSimTick(tick);
        await new Promise((resolve) => window.setTimeout(resolve, shadowWarmupMs));

        const featureCollection = buildWorkerFeatureCollection(
          workerAreaGeometry,
          workerTaskType,
          buildingsRef.current ?? [],
          tick,
        );
        const workerPoints = featureCollection.features
          .filter((f) => f.geometry?.type === 'Point')
          .map((f) => {
            const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates;
            const props = (f.properties ?? {}) as Partial<WorkerFeatureProps>;
            return {
              lat,
              lng,
              id: Number(props.worker_id ?? 0),
            };
          });
        const exposureResults = await Promise.all(workerPoints.map(async (point) => {
          try {
            const screenPoint = controllerRef.current?.getContainerPoint({ lat: point.lat, lng: point.lng });
            if (!screenPoint) return false;
            return await activeShadow.isPositionInSun(screenPoint);
          } catch {
            return false;
          }
        }));
        setWorkerStats((prev) => {
          const next = { ...prev };
          for (let i = 0; i < exposureResults.length; i += 1) {
            const worker = workerPoints[i];
            const inSun = exposureResults[i];
            const noonPenalty = minute >= 12 * 60 && minute < 15 * 60 ? 0.2 : 0;
            const focusGain = inSun ? Math.max(0.35, 0.75 - noonPenalty) : 1.0;
            const curr = next[worker.id] ?? { sunMinutes: 0, shadeMinutes: 0, focusScore: 0 };
            next[worker.id] = {
              sunMinutes: curr.sunMinutes + (inSun ? stepMinutes : 0),
              shadeMinutes: curr.shadeMinutes + (!inSun ? stepMinutes : 0),
              focusScore: curr.focusScore + focusGain * stepMinutes,
            };
          }
          return next;
        });
        if (minute >= endMinute) {
          setWorkerSimRunning(false);
          return;
        }
        minute = Math.min(endMinute, minute + stepMinutes);
      } finally {
        workerSimBusyRef.current = false;
      }
    };

    const setSliderFn = setSliderRef.current;
    if (setSliderFn) setSliderFn(startMinute);
    setWorkerSimMinute(startMinute);
    applyShadowDateForSimMinute(
      shadowRef.current,
      controllerRef.current ?? { isReady: () => false },
      dateStrRef.current,
      startMinute,
    );
    workerSimStartTimeoutRef.current = window.setTimeout(() => {
      void runSamplingStep();
      workerSimTimerRef.current = window.setInterval(() => {
        void runSamplingStep();
      }, workerSimSpeedMs);
    }, shadowWarmupMs);

    return stopWorkerSimulationTimers;
  }, [
    stopWorkerSimulationTimers,
    workerSimRunning,
    isWorkerMode,
    workerAreaGeometry,
    workerTaskType,
    workerSimSpeedMs,
    buildingsRef,
    shadowRef,
    controllerRef,
    setSliderRef,
    dateStrRef,
    setWorkerSimMinute,
    setWorkerSimTick,
    setWorkerStats,
    setWorkerSimRunning,
  ]);

  return { startWorkerSimulation, stopWorkerSimulationTimers };
}
