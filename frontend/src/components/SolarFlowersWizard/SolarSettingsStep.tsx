import type { CSSProperties } from 'react';
import { LoaderCircle, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  SolarOptimizationTarget,
  SolarPanelType,
} from '@/types/solar-flowers';
import type { SolarWizardCopy } from '@/components/SolarFlowersWizard/copy';
import type {
  SolarPanelTypeOption,
  SolarTargetOption,
} from '@/components/SolarFlowersWizard/types';
import {
  DARK_CARD,
  DARK_CARD_BORDER,
  ORANGE,
  SOLAR_CHIP_ACTIVE,
  SOLAR_CHIP_BASE,
  SOLAR_CHIP_IDLE,
} from '@/components/SolarFlowersWizard/styles';

interface SolarSettingsStepProps {
  areaKm2: number | null;
  panelType: SolarPanelType;
  target: SolarOptimizationTarget;
  topK: number;
  loading: boolean;
  error: string | null;
  hasArea: boolean;
  panelTypes: SolarPanelTypeOption[];
  targets: SolarTargetOption[];
  copy: SolarWizardCopy;
  onPanelTypeChange: (type: SolarPanelType) => void;
  onTargetChange: (target: SolarOptimizationTarget) => void;
  onTopKChange: (topK: number) => void;
  onRunRanking: () => void;
  onBackToShape: () => void;
}

export function SolarSettingsStep({
  areaKm2,
  panelType,
  target,
  topK,
  loading,
  error,
  hasArea,
  panelTypes,
  targets,
  copy,
  onPanelTypeChange,
  onTargetChange,
  onTopKChange,
  onRunRanking,
  onBackToShape,
}: SolarSettingsStepProps) {
  return (
    <div
      className="rounded-xl p-4 space-y-4"
      style={{ background: DARK_CARD, border: `1px solid ${DARK_CARD_BORDER}` }}
    >
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="h-3.5 w-3.5 flex-shrink-0" style={{ color: ORANGE }} />
        <span className="text-sm font-semibold text-white">{copy.settingsTitle}</span>
      </div>

      {areaKm2 != null && (
        <div
          className="flex items-center justify-between rounded-lg px-3 py-1.5"
          style={{ background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.12)' }}
        >
          <span className="text-[11px] text-white/40">{copy.areaLabel}</span>
          <span className="font-mono text-[11px]" style={{ color: ORANGE }}>
            {areaKm2.toFixed(3)} km²
          </span>
        </div>
      )}

      <div>
        <span className="text-[11px] text-white/40 uppercase tracking-wide">{copy.panelTypeLabel}</span>
        <div className="mt-2 flex flex-col gap-1.5">
          {panelTypes.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => onPanelTypeChange(value)}
              className={cn(SOLAR_CHIP_BASE, 'w-full justify-start', panelType === value ? SOLAR_CHIP_ACTIVE : SOLAR_CHIP_IDLE)}
            >
              <Icon className="h-3 w-3 flex-shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="text-[11px] text-white/40 uppercase tracking-wide">{copy.targetLabel}</span>
        <div className="mt-2 flex flex-col gap-1.5">
          {targets.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => onTargetChange(value)}
              className={cn(SOLAR_CHIP_BASE, 'w-full justify-start', target === value ? SOLAR_CHIP_ACTIVE : SOLAR_CHIP_IDLE)}
            >
              <Icon className="h-3 w-3 flex-shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="text-[11px] text-white/40 uppercase tracking-wide">{copy.countLabel}</span>
        <div className="mt-2 flex gap-1.5 flex-wrap">
          {[10, 20, 35, 50].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onTopKChange(n)}
              className={cn(SOLAR_CHIP_BASE, topK === n ? SOLAR_CHIP_ACTIVE : SOLAR_CHIP_IDLE)}
              style={{ minWidth: '3rem' } as CSSProperties}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div
          className="rounded-lg px-3 py-2 text-xs leading-snug"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={onRunRanking}
          disabled={loading || !hasArea}
          className="flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold text-white transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: loading ? 'rgba(251,146,60,0.5)' : ORANGE }}
        >
          {loading && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
          {loading ? copy.runningBtn : copy.runBtn}
        </button>
        <button
          type="button"
          onClick={onBackToShape}
          className="flex items-center justify-center rounded-lg px-3 py-2.5 text-xs font-medium text-white/40 transition-all duration-150"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {copy.backBtn}
        </button>
      </div>
    </div>
  );
}
