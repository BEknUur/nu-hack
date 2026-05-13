import WorkerRotationPanel from '@/components/WorkerRotationPanel';
import type { MapEngineKind } from '@/types/map-engine';
import type { UseWorkerStateResult } from '@/pages/MapPage/useWorkerState';

interface MapPageWorkerModeProps {
  visible: boolean;
  engine: MapEngineKind;
  sunExposure: boolean;
  onSunExposureChange: (value: boolean) => void;
  is3D: boolean;
  onViewModeChange: (value: boolean) => void;
  isSatellite: boolean;
  onBasemapChange: (value: boolean) => void;
  worker: UseWorkerStateResult;
}

export function MapPageWorkerMode({
  visible,
  engine,
  sunExposure,
  onSunExposureChange,
  is3D,
  onViewModeChange,
  isSatellite,
  onBasemapChange,
  worker,
}: MapPageWorkerModeProps) {
  if (!visible) return null;

  return (
    <WorkerRotationPanel
      engine={engine}
      sunExposure={sunExposure}
      onSunExposureChange={onSunExposureChange}
      is3D={is3D}
      onViewModeChange={onViewModeChange}
      isSatellite={isSatellite}
      onBasemapChange={onBasemapChange}
      workerTaskType={worker.workerTaskType}
      onWorkerTaskTypeChange={worker.setWorkerTaskType}
      workerDrawMode={worker.workerDrawMode}
      onWorkerDrawModeChange={worker.handleWorkerDrawModeChange}
      workerAreaKm2={worker.workerAreaKm2}
      workerAreaReady={Boolean(worker.workerAreaGeometry)}
      workerSimRunning={worker.workerSimRunning}
      workerSimMinute={worker.workerSimMinute}
      workerSimSpeedMs={worker.workerSimSpeedMs}
      onWorkerSimSpeedChange={worker.setWorkerSimSpeedMs}
      onStartSimulation={worker.startWorkerSimulation}
      selectedWorker={worker.selectedWorker}
      workerStats={worker.workerStats}
    />
  );
}
