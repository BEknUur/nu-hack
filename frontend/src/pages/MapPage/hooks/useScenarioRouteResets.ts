import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { type TreeWizardStep } from '@/components/TreeOptimizerWizard';
import type {
  RankAreaGeometry,
  TreeDrawMode,
  TreeExplainResponse,
  TreeRankCandidate,
} from '@/types/tree-optimizer';
import type { SelectedWorkerInfo, WorkerExposureStat, WorkerTaskType } from '@/pages/MapPage/workerSimulation';

export interface UseScenarioRouteResetsParams {
  isTreeMode: boolean;
  isWorkerMode: boolean;
  stopWorkerSimulationTimers: () => void;
  setTreeDrawArmed: Dispatch<SetStateAction<boolean>>;
  setTreeDrawing: Dispatch<SetStateAction<boolean>>;
  setTreeDraftGeometry: Dispatch<SetStateAction<RankAreaGeometry | null>>;
  setTreeAreaGeometry: Dispatch<SetStateAction<RankAreaGeometry | null>>;
  setTreeAreaKm2: Dispatch<SetStateAction<number | null>>;
  setTreeCandidates: Dispatch<SetStateAction<TreeRankCandidate[]>>;
  setSelectedTreeCandidate: Dispatch<SetStateAction<TreeRankCandidate | null>>;
  setTreeExplanation: Dispatch<SetStateAction<TreeExplainResponse | null>>;
  setTreeExplainError: Dispatch<SetStateAction<string | null>>;
  setTreeError: Dispatch<SetStateAction<string | null>>;
  setTreeWizardStep: Dispatch<SetStateAction<TreeWizardStep>>;
  setWorkerSimRunning: Dispatch<SetStateAction<boolean>>;
  setWorkerSimMinute: Dispatch<SetStateAction<number>>;
  setWorkerStats: Dispatch<SetStateAction<Record<number, WorkerExposureStat>>>;
  setSelectedWorker: Dispatch<SetStateAction<SelectedWorkerInfo | null>>;
  setWorkerDrawMode: Dispatch<SetStateAction<TreeDrawMode>>;
  setWorkerDrawArmed: Dispatch<SetStateAction<boolean>>;
  setWorkerDrawing: Dispatch<SetStateAction<boolean>>;
  setWorkerAreaStep: Dispatch<SetStateAction<'shape' | 'drawing'>>;
  setWorkerDraftGeometry: Dispatch<SetStateAction<RankAreaGeometry | null>>;
  setWorkerAreaGeometry: Dispatch<SetStateAction<RankAreaGeometry | null>>;
  setWorkerAreaKm2: Dispatch<SetStateAction<number | null>>;
  setWorkerTaskType: Dispatch<SetStateAction<WorkerTaskType>>;
}

export function useScenarioRouteResets({
  isTreeMode,
  isWorkerMode,
  stopWorkerSimulationTimers,
  setTreeDrawArmed,
  setTreeDrawing,
  setTreeDraftGeometry,
  setTreeAreaGeometry,
  setTreeAreaKm2,
  setTreeCandidates,
  setSelectedTreeCandidate,
  setTreeExplanation,
  setTreeExplainError,
  setTreeError,
  setTreeWizardStep,
  setWorkerSimRunning,
  setWorkerSimMinute,
  setWorkerStats,
  setSelectedWorker,
  setWorkerDrawMode,
  setWorkerDrawArmed,
  setWorkerDrawing,
  setWorkerAreaStep,
  setWorkerDraftGeometry,
  setWorkerAreaGeometry,
  setWorkerAreaKm2,
  setWorkerTaskType,
}: UseScenarioRouteResetsParams) {
  useEffect(() => {
    if (isTreeMode || isWorkerMode) return;
    setTreeDrawArmed(false);
    setTreeDrawing(false);
    setTreeDraftGeometry(null);
    setTreeAreaGeometry(null);
    setTreeAreaKm2(null);
    setTreeCandidates([]);
    setSelectedTreeCandidate(null);
    setTreeExplanation(null);
    setTreeExplainError(null);
    setTreeError(null);
    setTreeWizardStep('shape');
  }, [isTreeMode, isWorkerMode]);

  useEffect(() => {
    if (isWorkerMode) return;
    stopWorkerSimulationTimers();
    setWorkerSimRunning(false);
    setWorkerSimMinute(9 * 60);
    setWorkerStats({});
    setSelectedWorker(null);
    setWorkerDrawMode('rectangle');
    setWorkerDrawArmed(false);
    setWorkerDrawing(false);
    setWorkerAreaStep('shape');
    setWorkerDraftGeometry(null);
    setWorkerAreaGeometry(null);
    setWorkerAreaKm2(null);
    setWorkerTaskType('facade_maintenance');
  }, [isWorkerMode, stopWorkerSimulationTimers]);
}
