import type { CSSProperties } from 'react';
import { WIZARD_COPY, drawModeHint } from '@/components/TreeOptimizerWizard';
import { TreeAreaDrawControls } from '@/components/treeShared/TreeAreaDrawControls';
import type { Language } from '@/i18n';
import type { RankAreaGeometry, TreeDrawMode } from '@/types/tree-optimizer';
import { minuteToClockLabel, type WorkerTaskType } from '@/pages/MapPage/workerSimulation';

const WORKER_PANEL_EXTRA: Record<
  Language,
  {
    area: string;
    facade: string;
    road: string;
    task: string;
    sim: string;
    continueAfterArea: string;
    scenarioTitle: string;
  }
> = {
  ru: {
    area: 'Область',
    facade: 'Фасад',
    road: 'Дорога',
    task: 'Задача',
    sim: 'Симуляция',
    continueAfterArea: 'Далее',
    scenarioTitle: 'Рабочие',
  },
  kk: {
    area: 'Аймақ',
    facade: 'Қасбет',
    road: 'Жол',
    task: 'Тапсырма',
    sim: 'Симуляция',
    continueAfterArea: 'Келесі',
    scenarioTitle: 'Жұмысшылар',
  },
  en: {
    area: 'Area',
    facade: 'Facade',
    road: 'Road',
    task: 'Task',
    sim: 'Sim',
    continueAfterArea: 'Next',
    scenarioTitle: 'Workers',
  },
};

const STEP_CARD_CLASS =
  'rounded-md border border-[color:var(--line)] bg-white/72 p-2';

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
  const areaStatus = workerAreaStep === 'drawing'
    ? wizardCopy.drawingActive
    : workerAreaKm2 != null
      ? `${workerAreaKm2.toFixed(2)} km2`
      : null;
  const shapeButtons: Array<{ mode: TreeDrawMode; label: string }> = [
    { mode: 'rectangle', label: wizardCopy.drawRectangle },
    { mode: 'circle', label: wizardCopy.drawCircle },
  ];

  return (
    <div className="map-panel absolute right-4 top-[8.5rem] z-[1100] hidden w-[264px] max-w-[calc(100vw-2rem)] rounded-lg p-2.5 text-[var(--ink)] md:top-4 md:block">
      <div className="text-[17px] font-semibold tracking-[-0.04em]">{panelExtra.scenarioTitle}</div>

      <div className="mt-2.5 space-y-2">
        <div className={STEP_CARD_CLASS}>
          <div className="ui-mono text-[10px] text-[var(--ink-soft)]">{panelExtra.area}</div>
          <TreeAreaDrawControls
            variant="wizard"
            shapeLabel=""
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
            statusContent={areaStatus ? (
              <div className="mt-2 ui-mono text-[10px] text-[var(--ink-soft)]">
                {areaStatus}
              </div>
            ) : undefined}
            drawingContent={
              workerAreaStep === 'drawing' || workerDrawing ? (
                <div className="mt-2 rounded-md border border-[color:var(--line)] bg-white/72 px-2 py-1.5">
                  <div className="flex items-center gap-2 text-[11px] text-[var(--yellow-strong)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--yellow-strong)] animate-pulse-dot" />
                    <span>{wizardCopy.drawingTitle}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-[var(--ink-soft)]">{drawModeHint(wizardCopy, workerDrawMode)}</p>
                </div>
              ) : undefined
            }
          />
        </div>

        <div id="worker-task-card" className={STEP_CARD_CLASS}>
          <div className="ui-mono text-[10px] text-[var(--ink-soft)]">{panelExtra.task}</div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => onWorkerTaskTypeChange('facade_maintenance')}
              className={`rounded-full border px-2.5 py-1 text-[11px] ${workerTaskType === 'facade_maintenance'
                ? 'border-[color:var(--yellow-strong)] bg-[var(--yellow)] text-[#06080f]'
                : 'border-[color:var(--line)] bg-[var(--surface)] text-[var(--ink)]'}`}
            >
              {panelExtra.facade}
            </button>
            <button
              type="button"
              onClick={() => onWorkerTaskTypeChange('road_repair')}
              className={`rounded-full border px-2.5 py-1 text-[11px] ${workerTaskType === 'road_repair'
                ? 'border-[color:var(--yellow-strong)] bg-[var(--yellow)] text-[#06080f]'
                : 'border-[color:var(--line)] bg-[var(--surface)] text-[var(--ink)]'}`}
            >
              {panelExtra.road}
            </button>
          </div>
        </div>

        <div className={STEP_CARD_CLASS}>
          <div className="ui-mono text-[10px] text-[var(--ink-soft)]">{panelExtra.sim}</div>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onStartSimulation}
              disabled={!workerAreaGeometry || workerSimRunning}
              className="rounded-md border border-[color:var(--yellow-strong)] bg-[var(--yellow)] px-2.5 py-1.5 text-[12px] font-medium text-[#06080f] transition-colors hover:bg-[var(--yellow-strong)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Go
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
              {workerSimSpeedMs} ms
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
