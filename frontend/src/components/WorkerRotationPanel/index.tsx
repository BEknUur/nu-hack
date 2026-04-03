import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import type {
  SelectedWorkerInfo,
  WorkerDrawMode,
  WorkerExposureStat,
  WorkerTaskType,
} from '@/pages/MapPage/workerSimulation';
import { minuteToClockLabel } from '@/pages/MapPage/workerSimulation';

interface WorkerRotationPanelProps {
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
  const pillClass = (active: boolean) => cn(
    'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
    active
      ? 'border-[color:var(--blue-strong)] bg-[var(--blue-strong)] text-white'
      : 'border-[color:var(--line)] bg-white text-[var(--ink)]',
  );

  return (
    <div className="map-panel absolute right-4 top-[8.5rem] z-[1000] w-[320px] max-w-[calc(100vw-2rem)] rounded-xl p-4 text-[var(--ink)] md:top-4">
      <div className="ui-mono text-[11px] text-[var(--ink-soft)]">Worker rotation monitor</div>
      <h3 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-[var(--blue-strong)]">Plan safer field shifts</h3>

      <div className="mt-4 rounded-xl border border-[color:var(--line)] bg-white/80 p-3">
        <div className="ui-mono text-[10px] text-[var(--ink-soft)]">Step 1</div>
        <div className="mt-1 text-sm text-[var(--ink)]">Select area on map</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(['rectangle', 'circle', 'polygon', 'freehand'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onWorkerDrawModeChange(workerDrawMode === mode ? null : mode)}
              className={cn('map-segment rounded-lg px-3 py-2 text-sm font-medium capitalize', workerDrawMode === mode && 'is-active')}
            >
              {mode}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
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

      <div className="mt-4 rounded-xl border border-[color:var(--line)] bg-white/80 p-3">
        <div className="ui-mono text-[10px] text-[var(--ink-soft)]">Step 2</div>
        <div className="mt-1 text-sm text-[var(--ink)]">Task type</div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            onClick={() => onWorkerTaskTypeChange('facade_maintenance')}
            className={pillClass(workerTaskType === 'facade_maintenance')}
          >
            Facade maintenance
          </button>
          <button
            onClick={() => onWorkerTaskTypeChange('road_repair')}
            className={pillClass(workerTaskType === 'road_repair')}
          >
            Road repair
          </button>
        </div>
        <div className="mt-2 ui-mono text-[11px] text-[var(--ink-soft)]">
          Workday exposure window: 09:00 - 17:00
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-[color:var(--line)] bg-white/80 p-3">
        <div className="ui-mono text-[10px] text-[var(--ink-soft)]">Step 3</div>
        <div className="mt-1 text-sm text-[var(--ink)]">Run simulation (09:00 - 17:00)</div>
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={onStartSimulation}
            disabled={!workerAreaReady || workerSimRunning}
            className="rounded-lg border border-[color:var(--blue-strong)] bg-[var(--blue-strong)] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--blue)] disabled:cursor-not-allowed disabled:opacity-60"
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
        <div className="mt-4 rounded-xl border border-[color:var(--line)] bg-white/80 p-3">
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
      ) : null}
    </div>
  );
}
