import type { CSSProperties } from 'react';
import type { TreeControlVariant } from '@/components/treeShared/TreeAreaDrawControls';

interface TreeRankingControlsProps {
  variant: TreeControlVariant;
  balanceLabel: string;
  seasonShareLabel: string;
  summerHint: string;
  winterHint: string;
  topNLabel: string;
  minWinterLightLabel: string;
  summerPct: number;
  topK: number;
  minWinterLight: number;
  onSummerWeightChange: (value: number) => void;
  onTopKChange: (value: number) => void;
  onMinWinterLightChange: (value: number) => void;
  controlsDisabled: boolean;
  loading: boolean;
  runLabel: string;
  runningLabel: string;
  onRun: () => void;
  runDisabled: boolean;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export function TreeRankingControls({
  variant,
  balanceLabel,
  seasonShareLabel,
  summerHint,
  winterHint,
  topNLabel,
  minWinterLightLabel,
  summerPct,
  topK,
  minWinterLight,
  onSummerWeightChange,
  onTopKChange,
  onMinWinterLightChange,
  controlsDisabled,
  loading,
  runLabel,
  runningLabel,
  onRun,
  runDisabled,
  secondaryActionLabel,
  onSecondaryAction,
}: TreeRankingControlsProps) {
  const hasSecondaryAction = Boolean(secondaryActionLabel && onSecondaryAction);

  return (
    <>
      <div className="mt-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-medium text-[var(--ink)]">{balanceLabel}</span>
          <span className="ui-mono text-[11px] text-[var(--ink-soft)]">{seasonShareLabel}</span>
        </div>
        <input
          type="range"
          className="time-slider mt-2"
          min={0}
          max={100}
          step={1}
          value={summerPct}
          style={{ '--pct': `${summerPct}%` } as CSSProperties}
          onChange={(event) => onSummerWeightChange(Number(event.target.value) / 100)}
          disabled={controlsDisabled}
        />
        <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--ink-soft)]">
          <span>{summerHint}</span>
          <span>{winterHint}</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="text-[13px] text-[var(--ink-soft)]">
          {topNLabel}
          <select
            className="map-input mt-1 w-full rounded-md px-2 py-1.5 text-[13px] text-[var(--ink)]"
            value={topK}
            onChange={(event) => onTopKChange(Number(event.target.value))}
            disabled={controlsDisabled}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </label>

        <label className="text-[13px] text-[var(--ink-soft)]">
          {minWinterLightLabel}
          <select
            className="map-input mt-1 w-full rounded-md px-2 py-1.5 text-[13px] text-[var(--ink)]"
            value={minWinterLight}
            onChange={(event) => onMinWinterLightChange(Number(event.target.value))}
            disabled={controlsDisabled}
          >
            <option value={0.2}>20%</option>
            <option value={0.3}>30%</option>
            <option value={0.4}>40%</option>
            <option value={0.5}>50%</option>
          </select>
        </label>
      </div>

      <div className={hasSecondaryAction ? 'mt-3 grid grid-cols-2 gap-2' : 'mt-3'}>
        <button
          type="button"
          onClick={onRun}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[color:var(--yellow-strong)] bg-[var(--yellow)] px-2.5 py-2 text-[13px] font-medium text-[#06080f] transition-colors hover:bg-[var(--yellow-strong)] hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
          disabled={runDisabled}
        >
          {loading ? runningLabel : runLabel}
        </button>

        {hasSecondaryAction && (
          <button
            type="button"
            onClick={onSecondaryAction}
            className={variant === 'wizard'
              ? 'map-segment rounded-md px-2.5 py-2 text-[13px] font-medium'
              : 'map-segment rounded-md px-2.5 py-2 text-[13px] font-medium'}
          >
            {secondaryActionLabel}
          </button>
        )}
      </div>
    </>
  );
}
