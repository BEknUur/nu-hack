import type L from 'leaflet';
import type { Language } from '@/i18n';
import type { UseDateTimeReturn } from '@/hooks/useDateTime';
import { useMapLibreAoiOverlay } from '@/pages/MapPage/hooks/useMapLibreAoiOverlay';
import { useMapLibreAreaDrawing } from '@/pages/MapPage/hooks/useMapLibreAreaDrawing';
import { useTreeCandidateAnchor } from '@/pages/MapPage/hooks/useTreeCandidateAnchor';
import { useTreeExplanation } from '@/pages/MapPage/hooks/useTreeExplanation';
import { useTreeCandidateLayer } from '@/pages/MapPage/hooks/useTreeCandidateLayer';
import { useWorkerCrewLayer } from '@/pages/MapPage/hooks/useWorkerCrewLayer';
import { useWorkerInteractions } from '@/pages/MapPage/hooks/useWorkerInteractions';
import { useWorkerSimulation } from '@/pages/MapPage/hooks/useWorkerSimulation';
import { useMapViewEffects } from '@/pages/MapPage/hooks/useMapViewEffects';
import { useMapInfoClick } from '@/pages/MapPage/hooks/useMapInfoClick';
import { useSelectedBuildingHighlight } from '@/pages/MapPage/hooks/useSelectedBuildingHighlight';
import { useLeafletStaticDataset } from '@/pages/MapPage/hooks/useLeafletStaticDataset';
import type { UseTreeStateResult } from '@/pages/MapPage/useTreeState';
import type { UseWorkerStateResult } from '@/pages/MapPage/useWorkerState';
import type { ClickInfo } from '@/types/map';
import type { SelectedBuilding } from '@/types/building';
import type { MapEngineState } from '@/types/map-engine';

interface UseMapPageEffectsArgs {
  engineState: MapEngineState;
  dt: UseDateTimeReturn & { language: Language };
  tree: UseTreeStateResult;
  worker: UseWorkerStateResult;
  isTreeMode: boolean;
  isWorkerMode: boolean;
  sunExposure: boolean;
  is3D: boolean;
  isSatellite: boolean;
  clickInfo: ClickInfo | null;
  selectedBuilding: SelectedBuilding | null;
  setClickInfo: React.Dispatch<React.SetStateAction<ClickInfo | null>>;
  setSelectedBuilding: React.Dispatch<React.SetStateAction<SelectedBuilding | null>>;
  staticDatasetLayerRef: React.RefObject<L.GeoJSON | null>;
  sunEdgesLayerRef: React.RefObject<L.LayerGroup | null>;
  selectedBuildingLayerRef: React.RefObject<L.LayerGroup | null>;
  suppressNextMapClickRef: React.RefObject<boolean>;
}

export function useMapPageEffects({
  engineState,
  dt,
  tree,
  worker,
  isTreeMode,
  isWorkerMode,
  sunExposure,
  is3D,
  isSatellite,
  clickInfo,
  selectedBuilding,
  setClickInfo,
  setSelectedBuilding,
  staticDatasetLayerRef,
  sunEdgesLayerRef,
  selectedBuildingLayerRef,
  suppressNextMapClickRef,
}: UseMapPageEffectsArgs) {
  const {
    engine,
    rawMapRef,
    buildingsRef,
    controller,
    shadow,
  } = engineState;

  useTreeCandidateAnchor({
    enabled: isTreeMode,
    engine,
    rawMapRef,
    controller,
    selectedTreeCandidate: tree.selectedTreeCandidate,
    setTreeCardAnchorPoint: tree.setTreeCardAnchorPoint,
  });

  useTreeExplanation({
    enabled: isTreeMode,
    language: dt.language,
    selectedTreeCandidate: tree.selectedTreeCandidate,
    treeSummerWeight: tree.treeSummerWeight,
    explainFailedMessage: tree.treeUi.explainFailed,
    setTreeExplanation: tree.setTreeExplanation,
    setTreeExplainError: tree.setTreeExplainError,
    setTreeExplainLoading: tree.setTreeExplainLoading,
  });

  useMapLibreAoiOverlay({
    engine,
    rawMapRef,
    geometry: isTreeMode
      ? (tree.treeDraftGeometry ?? tree.treeAreaGeometry)
      : (isWorkerMode ? (worker.workerDraftGeometry ?? worker.workerAreaGeometry) : null),
    mode: isTreeMode ? tree.treeDrawMode : (isWorkerMode ? 'worker-zone' : null),
  });

  useMapLibreAreaDrawing({
    enabled: engine === 'maplibre' && isTreeMode && tree.treeDrawArmed,
    rawMapRef,
    drawMode: tree.treeDrawMode,
    onBegin: () => {
      tree.setTreeDrawing(true);
      tree.setTreeDraftGeometry(null);
      tree.setTreeExplainError(null);
    },
    onPreview: tree.setTreeDraftGeometry,
    onFinish: (geometry, cancelled) => {
      if (geometry) {
        tree.applyTreeAreaGeometry(geometry);
        tree.setTreeWizardStep('settings');
      } else if (!cancelled) {
        tree.setTreeError(tree.treeUi.areaMissing);
        tree.setTreeWizardStep('shape');
      }
      tree.setTreeDraftGeometry(null);
      tree.setTreeDrawArmed(false);
      tree.setTreeDrawing(false);
      if (cancelled) {
        tree.setTreeWizardStep('shape');
      }
    },
  });

  useMapLibreAreaDrawing({
    enabled: engine === 'maplibre' && isWorkerMode && worker.workerDrawMode !== null,
    rawMapRef,
    drawMode: worker.workerDrawMode ?? 'rectangle',
    onBegin: () => {
      worker.setWorkerDraftGeometry(null);
    },
    onPreview: worker.setWorkerDraftGeometry,
    onFinish: (geometry) => {
      worker.applyWorkerAreaGeometry(geometry);
      worker.setWorkerDraftGeometry(null);
    },
  });

  useTreeCandidateLayer({
    engine,
    rawMapRef,
    isTreeMode,
    treeCandidates: tree.treeCandidates,
    selectedTreeCandidateId: tree.selectedTreeCandidate?.id ?? null,
    treeDrawArmed: tree.treeDrawArmed,
    treeDrawing: tree.treeDrawing,
    onSelectCandidate: tree.setSelectedTreeCandidate,
    onClearStandardSelection: () => {
      setClickInfo(null);
      setSelectedBuilding(null);
    },
  });

  useWorkerCrewLayer({
    engine,
    rawMapRef,
    buildingsRef,
    isWorkerMode,
    workerAreaGeometry: worker.workerAreaGeometry,
    workerTaskType: worker.workerTaskType,
    workerSimTick: worker.workerSimTick,
  });

  useWorkerInteractions({
    engine,
    rawMapRef,
    isWorkerMode,
    workerTaskType: worker.workerTaskType,
    selectedWorker: worker.selectedWorker,
    workerStats: worker.workerStats,
    setSelectedWorker: worker.setSelectedWorker,
  });

  useWorkerSimulation({
    isWorkerMode,
    workerAreaGeometry: worker.workerAreaGeometry,
    workerTaskType: worker.workerTaskType,
    workerSimRunId: worker.workerSimRunId,
    workerSimRunning: worker.workerSimRunning,
    workerSimSpeedMs: worker.workerSimSpeedMs,
    buildingsRef,
    shadow,
    controller,
    setSlider: dt.setSlider,
    setWorkerSimRunning: worker.setWorkerSimRunning,
    setWorkerSimMinute: worker.setWorkerSimMinute,
    setWorkerSimTick: worker.setWorkerSimTick,
    setWorkerStats: worker.setWorkerStats,
  });

  useMapViewEffects({
    engine,
    rawMapRef,
    controller,
    shadow,
    date: dt.date,
    dateStr: dt.dateStr,
    sunExposure,
    is3D,
    isSatellite,
    isWorkerMode,
  });

  useMapInfoClick({
    enabled: !isTreeMode,
    buildingsRef,
    controller,
    shadow,
    dateStr: dt.dateStr,
    setClickInfo,
    setSelectedBuilding,
    suppressNextMapClickRef,
  });

  useSelectedBuildingHighlight({
    engine,
    rawMapRef,
    selectedBuildingLayerRef,
    selectedBuilding,
    bestSide: clickInfo?.predictedBestSide,
  });

  useLeafletStaticDataset({
    engine,
    rawMapRef,
    staticDatasetLayerRef,
    sunEdgesLayerRef,
    suppressNextMapClickRef,
    setClickInfo,
  });
}
