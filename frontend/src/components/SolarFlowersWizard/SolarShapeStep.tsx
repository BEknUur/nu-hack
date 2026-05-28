import { cn } from '@/lib/utils';
import type { SolarDrawMode, SolarWizardStep } from '@/types/solar-flowers';
import type { SolarWizardCopy } from '@/components/SolarFlowersWizard/copy';
import type { SolarDrawShapeOption } from '@/components/SolarFlowersWizard/types';
import {
  SOLAR_CHIP_ACTIVE,
  SOLAR_CHIP_BASE,
  SOLAR_CHIP_IDLE,
} from '@/components/SolarFlowersWizard/styles';

interface SolarShapeStepProps {
  step: SolarWizardStep;
  drawMode: SolarDrawMode;
  drawingInProgress: boolean;
  hasArea: boolean;
  areaKm2: number | null;
  drawShapes: SolarDrawShapeOption[];
  copy: SolarWizardCopy;
  onDrawModeChange: (mode: SolarDrawMode) => void;
  onStartDrawing: () => void;
  onCancelDrawing: () => void;
  onContinueToSettings: () => void;
  onClearArea: () => void;
}

export function SolarShapeStep({
  step,
  drawMode,
  drawingInProgress,
  hasArea,
  areaKm2,
  drawShapes,
  copy,
  onDrawModeChange,
  onStartDrawing,
  onCancelDrawing,
  onContinueToSettings,
  onClearArea,
}: SolarShapeStepProps) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 space-y-3">
      <div className="text-sm font-medium text-[var(--ink)]">{copy.drawTitle}</div>
      <p className="text-[11px] text-[var(--ink-soft)] leading-snug">{copy.drawHint}</p>

      <div className="grid grid-cols-2 gap-1.5">
        {drawShapes.map(({ mode, label }) => (
          <button
            key={mode}
            type="button"
            onClick={() => onDrawModeChange(mode)}
            className={cn(SOLAR_CHIP_BASE, drawMode === mode ? SOLAR_CHIP_ACTIVE : SOLAR_CHIP_IDLE)}
          >
            {label}
          </button>
        ))}
      </div>

      {areaKm2 != null && (
        <div className="flex items-center justify-between rounded-lg px-3 py-2 border border-[var(--line)] bg-[var(--surface)]">
          <span className="text-[11px] text-[var(--ink-soft)]">{copy.areaLabel}</span>
          <span className="font-mono text-[11px] text-[var(--yellow-strong)]">
            {areaKm2.toFixed(3)} km²
          </span>
        </div>
      )}

      {(step === 'drawing' || drawingInProgress) && (
        <div className="flex items-center justify-between rounded-lg px-3 py-2 border border-[var(--yellow)] bg-[rgba(240,194,76,0.06)]">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full animate-pulse bg-[var(--yellow)]" />
            <span className="text-[11px] text-[var(--yellow-strong)]">{copy.drawingActive}</span>
          </div>
          <span className="text-[10px] text-[var(--ink-soft)]">{copy.drawingEsc}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={step === 'drawing' ? onCancelDrawing : onStartDrawing}
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all',
            step === 'drawing'
              ? 'border border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ink)]'
              : 'bg-[var(--yellow)] text-[#06080f]'
          )}
        >
          {step === 'drawing' ? copy.cancelBtn : hasArea ? copy.redrawBtn : copy.drawBtn}
        </button>
        <button
          type="button"
          onClick={onClearArea}
          disabled={!hasArea && step !== 'drawing'}
          className="flex items-center justify-center rounded-lg px-3 py-2 text-xs font-medium text-[var(--ink-soft)] border border-[var(--line)] transition-all disabled:opacity-30"
        >
          {copy.clearBtn}
        </button>
      </div>

      {step !== 'drawing' && (
        <button
          type="button"
          onClick={onContinueToSettings}
          disabled={!hasArea}
          className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all disabled:opacity-30 border border-[var(--line)] text-[var(--ink)] hover:border-[var(--yellow)] hover:bg-[rgba(240,194,76,0.06)]"
        >
          {copy.continueBtn}
        </button>
      )}
    </div>
  );
}
