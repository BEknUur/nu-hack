import type { CSSProperties } from 'react';
import { WIZARD_COPY, drawModeHint } from '@/components/TreeOptimizerWizard';
import { TreeAreaDrawControls } from '@/components/treeShared/TreeAreaDrawControls';
import type { Language } from '@/i18n';
import type { RankAreaGeometry, TreeDrawMode } from '@/types/tree-optimizer';
import { minuteToClockLabel, type WorkerTaskType } from '@/pages/MapPage/workerSimulation';

const WORKER_PANEL_EXTRA: Record<
  Language,
  {
    continueAfterArea: string;
    stepTask: string;
    stepSim: string;
    scenarioTag: string;
    scenarioTitle: string;
  }
> = {
  ru: {
    continueAfterArea: 'Далее: тип задачи',
    stepTask: 'Шаг 2 из 3 · Тип задачи',
    stepSim: 'Шаг 3 из 3 · Симуляция (09:00–17:00)',
    scenarioTag: 'Сценарий',
    scenarioTitle: 'Рабочие',
  },
  kk: {
    continueAfterArea: 'Келесі: тапсырма түрі',
    stepTask: '2 / 3-қадам · Тапсырма түрі',
    stepSim: '3 / 3-қадам · Симуляция (09:00–17:00)',
    scenarioTag: 'Сценарий',
    scenarioTitle: 'Жұмысшылар',
  },
  en: {
    continueAfterArea: 'Continue to task type',
    stepTask: 'Step 2 of 3 · Task type',
    stepSim: 'Step 3 of 3 · Simulation (09:00–17:00)',
    scenarioTag: 'Scenario',
    scenarioTitle: 'Workers',
  },
};

const STEP_CARD_CLASS =
  'rounded-xl border border-[color:var(--line)] bg-white/80 p-3';

export interface WorkerScenarioPanelProps {
  language: Language;
  workerDrawMode: TreeDrawMode;
  onWorkerDrawModeChange: (mode: TreeDrawMode) => void;
  workerAreaStep: 'shape' | 'drawing';
  workerDrawing: boolean;
  workerAreaGeometry: RankAreaGeometry | null;
  workerAreaKm2: number | null;
  workerTaskType: WorkerTaskType;
  onWorkerTaskTypeChange: (task: WorkerTaskType) => void;
  workerSimRunning: boolean;
  workerSimMinute: number;
  workerSimSpeedMs: number;
  onWorkerSimSpeedMsChange: (ms: number) => void;
  onStartAreaDrawing: () => void;
  onCancelAreaDrawing: () => void;
  onClearWorkerArea: () => void;
  onStartSimulation: () => void;
}

export function WorkerScenarioPanel({
  language,
  workerDrawMode,
  onWorkerDrawModeChange,
  workerAreaStep,
  workerDrawing,
  workerAreaGeometry,
  workerAreaKm2,
  workerTaskType,
  onWorkerTaskTypeChange,
  workerSimRunning,
  workerSimMinute,
  workerSimSpeedMs,
  onWorkerSimSpeedMsChange,
  onStartAreaDrawing,
  onCancelAreaDrawing,
  onClearWorkerArea,
  onStartSimulation,
}: WorkerScenarioPanelProps) {
  const wizardCopy = WIZARD_COPY[language];
  const panelExtra = WORKER_PANEL_EXTRA[language];
  const shapeButtons: Array<{ mode: TreeDrawMode; label: string }> = [
    { mode: 'rectangle', label: wizardCopy.drawRectangle },
    { mode: 'circle', label: wizardCopy.drawCircle },
    { mode: 'polygon', label: wizardCopy.drawPolygon },
    { mode: 'freehand', label: wizardCopy.drawFreehand },
  ];

  return (
    <div className="map-panel absolute right-4 top-[8.5rem] z-[1100] w-[320px] max-w-[calc(100vw-2rem)] rounded-xl p-4 text-[var(--ink)] md:top-4">
      <div>
        <div className="ui-mono text-[11px] text-[var(--ink-soft)]">{panelExtra.scenarioTag}</div>
        <div className="mt-1 text-xl font-semibold tracking-[-0.04em]">{panelExtra.scenarioTitle}</div>
      </div>

      <div className="mt-4 space-y-4">
        <div className={STEP_CARD_CLASS}>
          <div className="ui-mono text-[10px] text-[var(--ink-soft)]">Step 1</div>
          <div className="mt-1 text-sm text-[var(--ink)]">Select area on map</div>
          <TreeAreaDrawControls
            variant="wizard"
            shapeLabel={wizardCopy.drawModeLabel}
            drawMode={workerDrawMode}
            drawModeOptions={shapeButtons}
            onDrawModeChange={onWorkerDrawModeChange}
            hasArea={Boolean(workerAreaGeometry)}
            isDrawing={workerAreaStep === 'drawing'}
            onStartDrawing={onStartAreaDrawing}
            onClearArea={onClearWorkerArea}
            onCancelDrawing={onCancelAreaDrawing}
            drawActionLabel={wizardCopy.drawAction}
            redrawActionLabel={wizardCopy.redrawAction}
            clearActionLabel={wizardCopy.clearAction}
            cancelActionLabel={wizardCopy.cancelDrawing}
            clearDisabled={!workerAreaGeometry && workerAreaStep !== 'drawing'}
            continueActionLabel={panelExtra.continueAfterArea}
            continueDisabled={!workerAreaGeometry}
            onContinue={
              workerAreaStep !== 'drawing'
                ? () => {
                    document.getElementById('worker-task-card')?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'nearest',
                    });
                  }
                : undefined
            }
            statusContent={(
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="ui-mono text-[11px] text-[var(--ink-soft)]">
                  {workerAreaStep === 'drawing' ? wizardCopy.stepDrawing : wizardCopy.stepShape}
                </span>
                <span className="ui-mono text-[11px] text-[var(--ink-soft)]">
                  {workerDrawMode}
                </span>
                {workerAreaKm2 != null && (
                  <span className="ui-mono text-[11px] text-[var(--ink-soft)]">
                    {workerAreaKm2.toFixed(2)} km2
                  </span>
                )}
              </div>
            )}
            drawingContent={
              workerAreaStep === 'drawing' || workerDrawing ? (
                <div className="mt-3 rounded-lg border border-[color:var(--line)] bg-white/70 p-3">
                  <div className="text-sm font-medium text-[var(--ink)]">{wizardCopy.drawingTitle}</div>
                  <p className="mt-1 text-sm text-[var(--ink-soft)]">
                    {drawModeHint(wizardCopy, workerDrawMode)}
                  </p>
                  <p className="mt-2 text-[11px] text-[var(--ink-soft)]">{wizardCopy.drawingSubHint}</p>
                  <div className="mt-2 inline-flex items-center gap-2 text-xs text-[var(--blue-strong)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--blue-strong)] animate-pulse-dot" />
                    {wizardCopy.drawingActive}
                  </div>
                </div>
              ) : undefined
            }
          />
        </div>

        <div id="worker-task-card" className={STEP_CARD_CLASS}>
          <div className="ui-mono text-[11px] text-[var(--ink-soft)]">{panelExtra.stepTask}</div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => onWorkerTaskTypeChange('facade_maintenance')}
              className={`rounded-full border px-2.5 py-1 text-[11px] ${workerTaskType === 'facade_maintenance'
                ? 'border-[color:var(--blue-strong)] bg-[var(--blue-strong)] text-white'
                : 'border-[color:var(--line)] bg-[var(--surface)] text-[var(--ink)]'}`}
            >
              Facade maintenance
            </button>
            <button
              type="button"
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

        <div className={STEP_CARD_CLASS}>
          <div className="ui-mono text-[11px] text-[var(--ink-soft)]">{panelExtra.stepSim}</div>
          <div className="mt-1 text-sm text-[var(--ink)]">Run simulation</div>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onStartSimulation}
              disabled={!workerAreaGeometry || workerSimRunning}
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
              onChange={(event) => onWorkerSimSpeedMsChange(Number(event.target.value))}
              disabled={workerSimRunning}
            />
            <div className="mt-1 ui-mono text-[10px] text-[var(--ink-soft)]">
              {workerSimSpeedMs} ms per step ({workerSimRunning ? 'running' : 'ready'})
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
