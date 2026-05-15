import { SlidersHorizontal, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SolarDrawMode, SolarWizardStep } from '@/types/solar-flowers';
import type { SolarWizardCopy } from '@/components/SolarFlowersWizard/copy';
import type { SolarDrawShapeOption } from '@/components/SolarFlowersWizard/types';
import {
  ACCENT_BG,
  ACCENT_BORDER,
  DARK_CARD,
  DARK_CARD_BORDER,
  ORANGE,
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
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: DARK_CARD, border: `1px solid ${DARK_CARD_BORDER}` }}
    >
      <div className="flex items-center gap-2">
        <MapPin className="h-3.5 w-3.5 flex-shrink-0" style={{ color: ORANGE }} />
        <span className="text-sm font-semibold text-white">{copy.drawTitle}</span>
      </div>
      <p className="text-[12px] text-white/40 leading-snug">{copy.drawHint}</p>

      <div className="grid grid-cols-2 gap-1.5">
        {drawShapes.map(({ mode, label, Icon }) => (
          <button
            key={mode}
            type="button"
            onClick={() => onDrawModeChange(mode)}
            className={cn(SOLAR_CHIP_BASE, drawMode === mode ? SOLAR_CHIP_ACTIVE : SOLAR_CHIP_IDLE)}
          >
            <Icon className="h-3 w-3 flex-shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {areaKm2 != null && (
        <div
          className="flex items-center justify-between rounded-lg px-3 py-2"
          style={{ background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.14)' }}
        >
          <span className="text-[11px] text-white/40">{copy.areaLabel}</span>
          <span className="font-mono text-[11px]" style={{ color: ORANGE }}>
            {areaKm2.toFixed(3)} km²
          </span>
        </div>
      )}

      {(step === 'drawing' || drawingInProgress) && (
        <div
          className="flex items-center justify-between rounded-lg px-3 py-2"
          style={{ background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.14)' }}
        >
          <div className="flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full animate-pulse"
              style={{ background: ORANGE }}
            />
            <span className="text-[11px]" style={{ color: ORANGE }}>{copy.drawingActive}</span>
          </div>
          <span className="text-[10px] text-white/25">{copy.drawingEsc}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={step === 'drawing' ? onCancelDrawing : onStartDrawing}
          className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-all duration-150"
          style={{ background: step === 'drawing' ? 'rgba(255,255,255,0.06)' : ORANGE, border: `1px solid ${step === 'drawing' ? 'rgba(255,255,255,0.1)' : 'transparent'}` }}
        >
          {step === 'drawing'
            ? copy.cancelBtn
            : hasArea
            ? copy.redrawBtn
            : copy.drawBtn}
        </button>
        <button
          type="button"
          onClick={onClearArea}
          disabled={!hasArea && step !== 'drawing'}
          className="flex items-center justify-center rounded-lg px-3 py-2 text-xs font-medium text-white/40 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {copy.clearBtn}
        </button>
      </div>

      {step !== 'drawing' && (
        <button
          type="button"
          onClick={onContinueToSettings}
          disabled={!hasArea}
          className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            color: hasArea ? ORANGE : 'rgba(255,255,255,0.3)',
            border: `1px solid ${hasArea ? ACCENT_BORDER : 'rgba(255,255,255,0.07)'}`,
            background: hasArea ? ACCENT_BG : 'transparent',
          }}
        >
          <SlidersHorizontal className="h-3 w-3" />
          {copy.continueBtn}
        </button>
      )}
    </div>
  );
}
