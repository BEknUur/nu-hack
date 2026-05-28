import type { CSSProperties } from 'react';
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
  hasArea,
  error,
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
    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 space-y-3">
      <div className="text-sm font-medium text-[var(--ink)]">{copy.settingsTitle}</div>

      {areaKm2 != null && (
        <div className="flex items-center justify-between rounded-lg px-3 py-1.5 border border-[var(--line)] bg-[var(--surface)]">
          <span className="text-[11px] text-[var(--ink-soft)]">{copy.areaLabel}</span>
          <span className="font-mono text-[11px] text-[var(--yellow-strong)]">
            {areaKm2.toFixed(3)} km²
          </span>
        </div>
      )}

      <div>
        <span className="text-[11px] text-[var(--ink-soft)] uppercase tracking-wide">{copy.panelTypeLabel}</span>
        <div className="mt-2 flex flex-col gap-1.5">
          {panelTypes.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => onPanelTypeChange(value)}
              className={cn(SOLAR_CHIP_BASE, 'w-full justify-start', panelType === value ? SOLAR_CHIP_ACTIVE : SOLAR_CHIP_IDLE)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="text-[11px] text-[var(--ink-soft)] uppercase tracking-wide">{copy.targetLabel}</span>
        <div className="mt-2 flex flex-col gap-1.5">
          {targets.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => onTargetChange(value)}
              className={cn(SOLAR_CHIP_BASE, 'w-full justify-start', target === value ? SOLAR_CHIP_ACTIVE : SOLAR_CHIP_IDLE)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="text-[11px] text-[var(--ink-soft)] uppercase tracking-wide">{copy.countLabel}</span>
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
        <div className="rounded-lg px-3 py-2 text-xs leading-snug border border-red-300 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={onRunRanking}
          disabled={loading || !hasArea}
          className="flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold text-[#06080f] bg-[var(--yellow)] transition-all disabled:opacity-50"
        >
          {loading ? copy.runningBtn : copy.runBtn}
        </button>
        <button
          type="button"
          onClick={onBackToShape}
          className="flex items-center justify-center rounded-lg px-3 py-2.5 text-xs font-medium text-[var(--ink-soft)] border border-[var(--line)] transition-all hover:text-[var(--ink)]"
        >
          {copy.backBtn}
        </button>
      </div>
    </div>
  );
}
