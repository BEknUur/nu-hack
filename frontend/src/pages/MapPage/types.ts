import type { TreeWizardStep } from '@/components/TreeOptimizerWizard';
import type {
  RankAreaGeometry,
  TreeDrawMode,
  TreeExplainResponse,
  TreeRankCandidate,
} from '@/types/tree-optimizer';
import type {
  SelectedWorkerInfo,
  WorkerDrawMode,
  WorkerExposureStat,
  WorkerTaskType,
} from '@/pages/MapPage/workerSimulation';

export interface ContextMenuState {
  x: number;
  y: number;
  lat: number;
  lng: number;
  annualSunHours: number | null;
  dailySunHours: number | null;
  loadingInfo: boolean;
  error: string | null;
}

export type ScenarioMode = 'default' | 'apartments' | 'trees' | 'workers' | 'solarFlowers';

export interface TreeUiMessages {
  mapNotReady: string;
  areaMissing: string;
  noCandidates: string;
  rankFailed: string;
  explainFailed: string;
}

export interface TreeStateSnapshot {
  isTreeMode: boolean;
  treeSummerWeight: number;
  treeTopK: number;
  treeMinWinterLight: number;
  treeWizardStep: TreeWizardStep;
  treeDrawMode: TreeDrawMode;
  treeDrawArmed: boolean;
  treeDrawing: boolean;
  treeAreaGeometry: RankAreaGeometry | null;
  treeDraftGeometry: RankAreaGeometry | null;
  treeAreaKm2: number | null;
  treeLoading: boolean;
  treeError: string | null;
  treeCandidates: TreeRankCandidate[];
  selectedTreeCandidate: TreeRankCandidate | null;
  treeCardAnchorPoint: { x: number; y: number } | null;
  treeExplanation: TreeExplainResponse | null;
  treeExplainLoading: boolean;
  treeExplainError: string | null;
}

export interface WorkerStateSnapshot {
  isWorkerMode: boolean;
  workerDrawMode: WorkerDrawMode;
  workerAreaGeometry: RankAreaGeometry | null;
  workerDraftGeometry: RankAreaGeometry | null;
  workerAreaKm2: number | null;
  workerTaskType: WorkerTaskType;
  workerSimRunId: number;
  workerSimTick: number;
  workerSimRunning: boolean;
  workerSimMinute: number;
  workerStats: Record<number, WorkerExposureStat>;
  workerSimSpeedMs: number;
  selectedWorker: SelectedWorkerInfo | null;
}
