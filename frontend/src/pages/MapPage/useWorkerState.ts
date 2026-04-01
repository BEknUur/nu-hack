import { useCallback, useEffect, useState } from 'react';
import { estimateGeometryAreaKm2 } from '@/utils/treeArea';
import type { RankAreaGeometry } from '@/types/tree-optimizer';
import type {
  SelectedWorkerInfo,
  WorkerDrawMode,
  WorkerExposureStat,
  WorkerTaskType,
} from '@/pages/MapPage/workerSimulation';
import type { WorkerStateSnapshot } from '@/pages/MapPage/types';

interface UseWorkerStateArgs {
  isWorkerMode: boolean;
  onSimulationStart: () => void;
}

export interface UseWorkerStateResult extends WorkerStateSnapshot {
  setWorkerDrawMode: React.Dispatch<React.SetStateAction<WorkerDrawMode>>;
  setWorkerAreaGeometry: React.Dispatch<React.SetStateAction<RankAreaGeometry | null>>;
  setWorkerDraftGeometry: React.Dispatch<React.SetStateAction<RankAreaGeometry | null>>;
  setWorkerAreaKm2: React.Dispatch<React.SetStateAction<number | null>>;
  setWorkerTaskType: React.Dispatch<React.SetStateAction<WorkerTaskType>>;
  setWorkerSimTick: React.Dispatch<React.SetStateAction<number>>;
  setWorkerSimRunning: React.Dispatch<React.SetStateAction<boolean>>;
  setWorkerSimMinute: React.Dispatch<React.SetStateAction<number>>;
  setWorkerStats: React.Dispatch<React.SetStateAction<Record<number, WorkerExposureStat>>>;
  setWorkerSimSpeedMs: React.Dispatch<React.SetStateAction<number>>;
  setSelectedWorker: React.Dispatch<React.SetStateAction<SelectedWorkerInfo | null>>;
  handleWorkerDrawModeChange: (mode: WorkerDrawMode) => void;
  applyWorkerAreaGeometry: (geometry: RankAreaGeometry | null) => void;
  startWorkerSimulation: () => void;
}

export function useWorkerState({
  isWorkerMode,
  onSimulationStart,
}: UseWorkerStateArgs): UseWorkerStateResult {
  const [workerDrawMode, setWorkerDrawMode] = useState<WorkerDrawMode>(null);
  const [workerAreaGeometry, setWorkerAreaGeometry] = useState<RankAreaGeometry | null>(null);
  const [workerDraftGeometry, setWorkerDraftGeometry] = useState<RankAreaGeometry | null>(null);
  const [workerAreaKm2, setWorkerAreaKm2] = useState<number | null>(null);
  const [workerTaskType, setWorkerTaskType] = useState<WorkerTaskType>('facade_maintenance');
  const [workerSimRunId, setWorkerSimRunId] = useState(0);
  const [workerSimTick, setWorkerSimTick] = useState(0);
  const [workerSimRunning, setWorkerSimRunning] = useState(false);
  const [workerSimMinute, setWorkerSimMinute] = useState<number>(9 * 60);
  const [workerStats, setWorkerStats] = useState<Record<number, WorkerExposureStat>>({});
  const [workerSimSpeedMs, setWorkerSimSpeedMs] = useState<number>(1400);
  const [selectedWorker, setSelectedWorker] = useState<SelectedWorkerInfo | null>(null);

  const handleWorkerDrawModeChange = useCallback((mode: WorkerDrawMode) => {
    setWorkerDrawMode(mode);
    setWorkerDraftGeometry(null);
  }, []);

  const applyWorkerAreaGeometry = useCallback((geometry: RankAreaGeometry | null) => {
    setWorkerAreaGeometry(geometry);
    setWorkerAreaKm2(geometry ? estimateGeometryAreaKm2(geometry) : null);
  }, []);

  const startWorkerSimulation = useCallback(() => {
    if (!workerAreaGeometry) return;
    setWorkerStats({});
    setSelectedWorker(null);
    setWorkerSimTick(0);
    setWorkerSimMinute(9 * 60);
    setWorkerSimRunId((prev) => prev + 1);
    setWorkerSimRunning(true);
    onSimulationStart();
  }, [onSimulationStart, workerAreaGeometry]);

  useEffect(() => {
    if (isWorkerMode) return;
    setWorkerSimRunning(false);
    setWorkerSimRunId(0);
    setWorkerSimMinute(9 * 60);
    setWorkerStats({});
    setSelectedWorker(null);
    setWorkerDrawMode(null);
    setWorkerDraftGeometry(null);
    setWorkerAreaGeometry(null);
    setWorkerAreaKm2(null);
    setWorkerTaskType('facade_maintenance');
  }, [isWorkerMode]);

  return {
    isWorkerMode,
    workerDrawMode,
    workerAreaGeometry,
    workerDraftGeometry,
    workerAreaKm2,
    workerTaskType,
    workerSimRunId,
    workerSimTick,
    workerSimRunning,
    workerSimMinute,
    workerStats,
    workerSimSpeedMs,
    selectedWorker,
    setWorkerDrawMode,
    setWorkerAreaGeometry,
    setWorkerDraftGeometry,
    setWorkerAreaKm2,
    setWorkerTaskType,
    setWorkerSimTick,
    setWorkerSimRunning,
    setWorkerSimMinute,
    setWorkerStats,
    setWorkerSimSpeedMs,
    setSelectedWorker,
    handleWorkerDrawModeChange,
    applyWorkerAreaGeometry,
    startWorkerSimulation,
  };
}
