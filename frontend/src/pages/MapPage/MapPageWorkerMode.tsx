import WorkerRotationPanel from '@/components/WorkerRotationPanel';
import type { UseWorkerStateResult } from '@/pages/MapPage/useWorkerState';

interface MapPageWorkerModeProps {
  visible: boolean;
  worker: UseWorkerStateResult;
}

export function MapPageWorkerMode({
  visible,
  worker,
}: MapPageWorkerModeProps) {
  if (!visible) return null;

  return (
    <WorkerRotationPanel
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
