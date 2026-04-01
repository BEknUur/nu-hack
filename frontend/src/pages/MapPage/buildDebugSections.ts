import type { MapPageDebugSection } from '@/components/MapPageDebugger';
import type { SelectedBuilding } from '@/types/building';
import type { ClickInfo } from '@/types/map';
import { minuteToClockLabel } from '@/pages/MapPage/workerSimulation';
import { formatAreaSummary, formatCoord } from '@/pages/MapPage/helpers';
import type { ScenarioMode, TreeStateSnapshot, WorkerStateSnapshot } from '@/pages/MapPage/types';

interface BuildDebugSectionsArgs {
  scenarioMode: ScenarioMode;
  engine: string;
  zoom: number;
  buildingsCount: number;
  loadingBuildings: boolean;
  sunExposure: boolean;
  is3D: boolean;
  isSatellite: boolean;
  dateStr: string;
  timeLabel: string;
  clickInfo: ClickInfo | null;
  selectedBuilding: SelectedBuilding | null;
  tree: TreeStateSnapshot;
  worker: WorkerStateSnapshot;
}

export function buildDebugSections({
  scenarioMode,
  engine,
  zoom,
  buildingsCount,
  loadingBuildings,
  sunExposure,
  is3D,
  isSatellite,
  dateStr,
  timeLabel,
  clickInfo,
  selectedBuilding,
  tree,
  worker,
}: BuildDebugSectionsArgs): MapPageDebugSection[] {
  return [
    {
      id: 'core',
      title: 'Core',
      items: [
        { label: 'scenario', value: scenarioMode },
        { label: 'engine', value: engine },
        { label: 'zoom', value: zoom.toFixed(2) },
        { label: 'buildings', value: buildingsCount },
        { label: 'loading', value: loadingBuildings },
        { label: 'sunExposure', value: sunExposure },
        { label: '3d', value: is3D },
        { label: 'satellite', value: isSatellite },
        { label: 'date', value: dateStr },
        { label: 'time', value: timeLabel },
      ],
    },
    {
      id: 'info',
      title: 'Info Click',
      items: [
        { label: 'clickedLat', value: formatCoord(clickInfo?.lat) },
        { label: 'clickedLng', value: formatCoord(clickInfo?.lng) },
        { label: 'inSun', value: clickInfo?.inSun ?? '-' },
        { label: 'buildingId', value: clickInfo?.buildingId ?? selectedBuilding?.id ?? '-' },
        { label: 'building', value: clickInfo?.buildingLabel ?? selectedBuilding?.label ?? '-' },
        { label: 'detailsLoading', value: clickInfo?.buildingInfoLoading ?? false },
        { label: 'prediction', value: clickInfo?.predictionLoading ?? false },
        {
          label: 'bestSide',
          value: clickInfo?.predictedBestSide
            ? `${clickInfo.predictedBestSide} ${clickInfo.predictedConfidence != null ? `(${Math.round(clickInfo.predictedConfidence * 100)}%)` : ''}`
            : '-',
        },
      ],
    },
    {
      id: 'trees',
      title: 'Trees',
      items: [
        { label: 'active', value: tree.isTreeMode },
        { label: 'step', value: tree.treeWizardStep },
        { label: 'drawMode', value: tree.treeDrawMode },
        { label: 'drawArmed', value: tree.treeDrawArmed },
        { label: 'drawing', value: tree.treeDrawing },
        { label: 'area', value: formatAreaSummary(tree.treeAreaGeometry) },
        { label: 'draft', value: formatAreaSummary(tree.treeDraftGeometry) },
        { label: 'areaKm2', value: tree.treeAreaKm2 != null ? tree.treeAreaKm2.toFixed(3) : '-' },
        { label: 'topK', value: tree.treeTopK },
        { label: 'summerWeight', value: tree.treeSummerWeight.toFixed(2) },
        { label: 'winterMin', value: tree.treeMinWinterLight.toFixed(2) },
        { label: 'candidates', value: tree.treeCandidates.length },
        { label: 'selected', value: tree.selectedTreeCandidate?.id ?? '-' },
        { label: 'explaining', value: tree.treeExplainLoading },
        { label: 'error', value: tree.treeError ?? tree.treeExplainError ?? '-' },
      ],
    },
    {
      id: 'workers',
      title: 'Workers',
      items: [
        { label: 'active', value: worker.isWorkerMode },
        { label: 'taskType', value: worker.workerTaskType },
        { label: 'drawMode', value: worker.workerDrawMode ?? '-' },
        { label: 'area', value: formatAreaSummary(worker.workerAreaGeometry) },
        { label: 'draft', value: formatAreaSummary(worker.workerDraftGeometry) },
        { label: 'areaKm2', value: worker.workerAreaKm2 != null ? worker.workerAreaKm2.toFixed(3) : '-' },
        { label: 'simRunning', value: worker.workerSimRunning },
        { label: 'simTick', value: worker.workerSimTick },
        { label: 'simTime', value: minuteToClockLabel(worker.workerSimMinute) },
        { label: 'simSpeedMs', value: worker.workerSimSpeedMs },
        { label: 'trackedWorkers', value: Object.keys(worker.workerStats).length },
        { label: 'selected', value: worker.selectedWorker?.worker_name ?? '-' },
      ],
    },
  ];
}
