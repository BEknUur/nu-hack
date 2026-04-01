import { useEffect, useRef } from 'react';
import type { MapEngineController } from '@/types/map-engine';
import { buildWorkerFeatureCollection, type WorkerFeatureProps, type WorkerTaskType } from '@/pages/MapPage/workerSimulation';
import type { RankAreaGeometry } from '@/types/tree-optimizer';
import type { ShadowEngineController } from '@/types/shadow-engine';

interface UseWorkerSimulationArgs {
  isWorkerMode: boolean;
  workerAreaGeometry: RankAreaGeometry | null;
  workerTaskType: WorkerTaskType;
  workerSimRunId: number;
  workerSimRunning: boolean;
  workerSimSpeedMs: number;
  buildingsRef: React.RefObject<GeoJSON.Feature[]>;
  shadow: ShadowEngineController | null;
  controller: MapEngineController;
  setSlider: (value: number) => void;
  setWorkerSimRunning: React.Dispatch<React.SetStateAction<boolean>>;
  setWorkerSimMinute: React.Dispatch<React.SetStateAction<number>>;
  setWorkerSimTick: React.Dispatch<React.SetStateAction<number>>;
  setWorkerStats: React.Dispatch<React.SetStateAction<Record<number, {
    sunMinutes: number;
    shadeMinutes: number;
    focusScore: number;
  }>>>;
}

export function useWorkerSimulation({
  isWorkerMode,
  workerAreaGeometry,
  workerTaskType,
  workerSimRunId,
  workerSimRunning,
  workerSimSpeedMs,
  buildingsRef,
  shadow,
  controller,
  setSlider,
  setWorkerSimRunning,
  setWorkerSimMinute,
  setWorkerSimTick,
  setWorkerStats,
}: UseWorkerSimulationArgs) {
  const shadowRef = useRef(shadow);
  const controllerRef = useRef(controller);
  const setSliderRef = useRef(setSlider);
  const workerSimBusyRef = useRef(false);
  const workerSimTimerRef = useRef<number | null>(null);
  const workerSimStartTimeoutRef = useRef<number | null>(null);

  shadowRef.current = shadow;
  controllerRef.current = controller;
  setSliderRef.current = setSlider;

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
        setSliderRef.current(minute);
        setWorkerSimMinute(minute);
        tick += 1;
        setWorkerSimTick(tick);
        await new Promise((resolve) => window.setTimeout(resolve, shadowWarmupMs));

        const featureCollection = buildWorkerFeatureCollection(
          workerAreaGeometry,
          workerTaskType,
          buildingsRef.current,
          tick,
        );
        const workerPoints = featureCollection.features
          .filter((feature) => feature.geometry?.type === 'Point')
          .map((feature) => {
            const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates;
            const props = (feature.properties ?? {}) as Partial<WorkerFeatureProps>;
            return { lat, lng, id: Number(props.worker_id ?? 0) };
          });
        const exposureResults = await Promise.all(workerPoints.map(async (point) => {
          try {
            const screenPoint = controllerRef.current.getContainerPoint({ lat: point.lat, lng: point.lng });
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
            const current = next[worker.id] ?? { sunMinutes: 0, shadeMinutes: 0, focusScore: 0 };
            next[worker.id] = {
              sunMinutes: current.sunMinutes + (inSun ? stepMinutes : 0),
              shadeMinutes: current.shadeMinutes + (!inSun ? stepMinutes : 0),
              focusScore: current.focusScore + focusGain * stepMinutes,
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

    setSliderRef.current(startMinute);
    setWorkerSimMinute(startMinute);
    workerSimStartTimeoutRef.current = window.setTimeout(() => {
      void runSamplingStep();
      workerSimTimerRef.current = window.setInterval(() => {
        void runSamplingStep();
      }, workerSimSpeedMs);
    }, shadowWarmupMs);

    return () => {
      if (workerSimStartTimeoutRef.current != null) {
        window.clearTimeout(workerSimStartTimeoutRef.current);
        workerSimStartTimeoutRef.current = null;
      }
      if (workerSimTimerRef.current != null) {
        window.clearInterval(workerSimTimerRef.current);
        workerSimTimerRef.current = null;
      }
      workerSimBusyRef.current = false;
    };
  }, [
    buildingsRef,
    isWorkerMode,
    setWorkerSimMinute,
    setWorkerSimRunning,
    setWorkerSimTick,
    setWorkerStats,
    workerAreaGeometry,
    workerSimRunId,
    workerSimRunning,
    workerSimSpeedMs,
    workerTaskType,
  ]);
}
