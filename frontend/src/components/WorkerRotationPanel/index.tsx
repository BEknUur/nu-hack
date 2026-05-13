import type { CSSProperties } from 'react';
import type { MapEngineKind } from '@/types/map-engine';
import type {
  SelectedWorkerInfo,
  WorkerDrawMode,
  WorkerExposureStat,
  WorkerTaskType,
} from '@/pages/MapPage/workerSimulation';
import { minuteToClockLabel } from '@/pages/MapPage/workerSimulation';

interface WorkerRotationPanelProps {
  engine: MapEngineKind;
  sunExposure: boolean;
  onSunExposureChange: (value: boolean) => void;
  is3D: boolean;
  onViewModeChange: (value: boolean) => void;
  isSatellite: boolean;
  onBasemapChange: (value: boolean) => void;
  workerTaskType: WorkerTaskType;
  onWorkerTaskTypeChange: (value: WorkerTaskType) => void;
  workerDrawMode: WorkerDrawMode;
  onWorkerDrawModeChange: (value: WorkerDrawMode) => void;
  workerAreaKm2: number | null;
  workerAreaReady: boolean;
  workerSimRunning: boolean;
  workerSimMinute: number;
  workerSimSpeedMs: number;
  onWorkerSimSpeedChange: (value: number) => void;
  onStartSimulation: () => void;
  selectedWorker: SelectedWorkerInfo | null;
  workerStats: Record<number, WorkerExposureStat>;
}

export default function WorkerRotationPanel({
  engine,
  sunExposure,
  onSunExposureChange,
  is3D,
  onViewModeChange,
  isSatellite,
  onBasemapChange,
  workerTaskType,
  onWorkerTaskTypeChange,
  workerDrawMode,
  onWorkerDrawModeChange,
  workerAreaKm2,
  workerAreaReady,
  workerSimRunning,
  workerSimMinute,
  workerSimSpeedMs,
  onWorkerSimSpeedChange,
  onStartSimulation,
  selectedWorker,
  workerStats,
}: WorkerRotationPanelProps) {
  return (
    <div className="map-panel absolute right-4 top-[8.5rem] z-[1000] w-[320px] max-w-[calc(100vw-2rem)] rounded-xl p-4 text-[var(--ink)] md:top-4">
      <div className="ui-mono text-[11px] text-[var(--ink-soft)]">Worker rotation monitor</div>
      <h3 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[var(--blue-strong)]">Plan safer field shifts</h3>

      <div className="mt-3 rounded-xl border border-[color:var(--line)] bg-white/80 p-3">
        <div className="ui-mono text-[10px] text-[var(--ink-soft)]">Analysis mode</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            onClick={() => onSunExposureChange(false)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${!sunExposure
              ? 'border-[color:var(--blue-strong)] bg-[var(--blue-strong)] text-white'
              : 'border-[color:var(--line)] bg-[var(--surface)] text-[var(--ink-soft)]'}`}
          >
            Shadows
          </button>
          <button
            onClick={() => onSunExposureChange(true)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${sunExposure
              ? 'border-[color:var(--blue-strong)] bg-[var(--blue-strong)] text-white'
              : 'border-[color:var(--line)] bg-[var(--surface)] text-[var(--ink-soft)]'}`}
          >
            Exposure
          </button>
        </div>

        {engine === 'maplibre' && (
          <>
            <div className="mt-3 ui-mono text-[10px] text-[var(--ink-soft)]">View</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                onClick={() => onViewModeChange(false)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium ${!is3D
                  ? 'border-[color:var(--blue-strong)] bg-[var(--blue-strong)] text-white'
                  : 'border-[color:var(--line)] bg-[var(--surface)] text-[var(--ink-soft)]'}`}
              >
                2D
              </button>
              <button
                onClick={() => onViewModeChange(true)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium ${is3D
                  ? 'border-[color:var(--blue-strong)] bg-[var(--blue-strong)] text-white'
                  : 'border-[color:var(--line)] bg-[var(--surface)] text-[var(--ink-soft)]'}`}
              >
                3D
              </button>
            </div>

            <div className="mt-3 ui-mono text-[10px] text-[var(--ink-soft)]">Base map</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                onClick={() => onBasemapChange(false)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium ${!isSatellite
                  ? 'border-[color:var(--blue-strong)] bg-[var(--blue-strong)] text-white'
                  : 'border-[color:var(--line)] bg-[var(--surface)] text-[var(--ink-soft)]'}`}
              >
                Standard
              </button>
              <button
                onClick={() => onBasemapChange(true)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium ${isSatellite
                  ? 'border-[color:var(--blue-strong)] bg-[var(--blue-strong)] text-white'
                  : 'border-[color:var(--line)] bg-[var(--surface)] text-[var(--ink-soft)]'}`}
              >
                Satellite
              </button>
            </div>
          </>
        )}
      </div>

      <div className="mt-3 rounded-xl border border-[color:var(--line)] bg-white/80 p-3">
        <div className="ui-mono text-[10px] text-[var(--ink-soft)]">Step 1</div>
        <div className="mt-1 text-sm text-[var(--ink)]">Task type</div>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => onWorkerTaskTypeChange('facade_maintenance')}
            className={`rounded-full border px-2.5 py-1 text-[11px] ${workerTaskType === 'facade_maintenance'
              ? 'border-[color:var(--blue-strong)] bg-[var(--blue-strong)] text-white'
              : 'border-[color:var(--line)] bg-[var(--surface)] text-[var(--ink)]'}`}
          >
            Facade maintenance
          </button>
          <button
            onClick={() => onWorkerTaskTypeChange('road_repair')}
            className={`rounded-full border px-2.5 py-1 text-[11px] ${workerTaskType === 'road_repair'
              ? 'border-[color:var(--blue-strong)] bg-[var(--blue-strong)] text-white'
              : 'border-[color:var(--line)] bg-[var(--surface)] text-[var(--ink)]'}`}
          >
            Road repair
          </button>
        </div>
        <div className="mt-2 ui-mono text-[10px] text-[var(--ink-soft)]">
          Workday exposure window: 09:00 - 17:00
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-[color:var(--line)] bg-white/80 p-3">
        <div className="ui-mono text-[10px] text-[var(--ink-soft)]">Step 2</div>
        <div className="mt-1 text-sm text-[var(--ink)]">Select work zone on map</div>
        <div className="mt-2 flex flex-wrap gap-1">
          {(['rectangle', 'circle', 'polygon', 'freehand'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onWorkerDrawModeChange(workerDrawMode === mode ? null : mode)}
              className={`rounded-md border px-2 py-1 text-[11px] capitalize ${workerDrawMode === mode
                ? 'border-[color:var(--blue-strong)] bg-[var(--blue-strong)] text-white'
                : 'border-[color:var(--line)] bg-[var(--surface)] text-[var(--ink)]'}`}
            >
              {mode}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="ui-mono text-[11px] text-[var(--ink-soft)]">
            {workerDrawMode ? `Draw mode: ${workerDrawMode}` : 'Choose draw mode to start'}
          </span>
          {workerAreaKm2 != null && (
            <span className="ui-mono text-[11px] text-[var(--ink-soft)]">
              {workerAreaKm2.toFixed(2)} km2
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-[color:var(--line)] bg-white/80 p-3">
        <div className="ui-mono text-[10px] text-[var(--ink-soft)]">Step 3</div>
        <div className="mt-1 text-sm text-[var(--ink)]">Run simulation (09:00 - 17:00)</div>
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={onStartSimulation}
            disabled={!workerAreaReady || workerSimRunning}
            className="rounded-lg border border-[color:var(--blue-strong)] bg-[var(--blue-strong)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--blue)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Start
          </button>
          <span className="ui-mono text-[11px] text-[var(--ink-soft)]">
            {minuteToClockLabel(workerSimMinute)}
          </span>
        </div>

        <div className="mt-2">
          <div className="ui-mono text-[10px] text-[var(--ink-soft)]">Speed</div>
          <input
            type="range"
            min={600}
            max={2600}
            step={100}
            value={workerSimSpeedMs}
            className="time-slider mt-1"
            style={{ '--pct': `${((workerSimSpeedMs - 600) / 2000) * 100}%` } as CSSProperties}
            onChange={(event) => onWorkerSimSpeedChange(Number(event.target.value))}
            disabled={workerSimRunning}
          />
          <div className="mt-1 ui-mono text-[10px] text-[var(--ink-soft)]">
            {workerSimSpeedMs} ms per step ({workerSimRunning ? 'running' : 'ready'})
          </div>
        </div>
      </div>

      {selectedWorker ? (
        <div className="mt-3 rounded-xl border border-[color:var(--line)] bg-white/80 p-3">
          <div className="ui-mono text-[10px] text-[var(--ink-soft)]">Worker details</div>
          <div className="mt-1 text-sm font-medium text-[var(--ink)]">
            {selectedWorker.emoji} {selectedWorker.worker_name}
          </div>
          <div className="mt-1 text-[11px] text-[var(--ink-soft)]">
            ID: {selectedWorker.worker_id} · {selectedWorker.activity}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
            <div className="rounded-lg border border-[color:var(--line)] bg-white px-2 py-1.5">
              <div className="ui-mono text-[10px] text-[var(--ink-soft)]">Sun</div>
              <div className="font-medium text-[var(--ink)]">{workerStats[selectedWorker.worker_id]?.sunMinutes ?? 0} min</div>
            </div>
            <div className="rounded-lg border border-[color:var(--line)] bg-white px-2 py-1.5">
              <div className="ui-mono text-[10px] text-[var(--ink-soft)]">Shade</div>
              <div className="font-medium text-[var(--ink)]">{workerStats[selectedWorker.worker_id]?.shadeMinutes ?? 0} min</div>
            </div>
            <div className="rounded-lg border border-[color:var(--line)] bg-white px-2 py-1.5">
              <div className="ui-mono text-[10px] text-[var(--ink-soft)]">Focus</div>
              <div className="font-medium text-[var(--ink)]">{(workerStats[selectedWorker.worker_id]?.focusScore ?? 0).toFixed(1)}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-[color:var(--line)] bg-white/80 p-3 text-[11px] text-[var(--ink-soft)]">
          Click any worker on map to see personal stats and activity.
        </div>
      )}
    </div>
  );
}
