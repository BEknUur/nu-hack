import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { TreeDrawMode } from '@/types/tree-optimizer';
import { SegmentedOptionGroup } from '@/components/mapControls/primitives';

export type TreeControlVariant = 'wizard' | 'panel';

interface DrawModeOption {
  mode: TreeDrawMode;
  label: string;
}

interface TreeAreaDrawControlsProps {
  variant: TreeControlVariant;
  shapeLabel: string;
  drawMode: TreeDrawMode;
  drawModeOptions: DrawModeOption[];
  onDrawModeChange: (mode: TreeDrawMode) => void;
  hasArea: boolean;
  isDrawing: boolean;
  onStartDrawing: () => void;
  onClearArea: () => void;
  onCancelDrawing?: () => void;
  drawActionLabel: string;
  redrawActionLabel: string;
  clearActionLabel: string;
  cancelActionLabel?: string;
  clearDisabled: boolean;
  continueActionLabel?: string;
  continueDisabled?: boolean;
  onContinue?: () => void;
  statusContent?: ReactNode;
  drawingContent?: ReactNode;
  postActionsContent?: ReactNode;
}

export function TreeAreaDrawControls({
  variant,
  shapeLabel,
  drawMode,
  drawModeOptions,
  onDrawModeChange,
  hasArea,
  isDrawing,
  onStartDrawing,
  onClearArea,
  onCancelDrawing,
  drawActionLabel,
  redrawActionLabel,
  clearActionLabel,
  cancelActionLabel,
  clearDisabled,
  continueActionLabel,
  continueDisabled,
  onContinue,
  statusContent,
  drawingContent,
  postActionsContent,
}: TreeAreaDrawControlsProps) {
  const selectorButtonClassName = variant === 'panel'
    ? 'px-2 py-1.5 text-[12px]'
    : 'px-2.5 py-1.5 text-[12px]';

  const secondaryAction = isDrawing && onCancelDrawing
    ? onCancelDrawing
    : onClearArea;

  const secondaryLabel = isDrawing && cancelActionLabel
    ? cancelActionLabel
    : clearActionLabel;

  return (
    <>
      {shapeLabel ? (
        <div className="mt-2 text-[13px] text-[var(--ink-soft)]">{shapeLabel}</div>
      ) : null}
      <div className="mt-2">
        <SegmentedOptionGroup
          value={drawMode}
          onChange={(value) => onDrawModeChange(value as TreeDrawMode)}
          options={drawModeOptions.map((option) => ({ value: option.mode, label: option.label }))}
          buttonClassName={selectorButtonClassName}
        />
      </div>

      {statusContent}
      {drawingContent}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onStartDrawing}
          className={cn(
            'inline-flex items-center justify-center rounded-md border border-[color:var(--yellow-strong)] bg-[var(--yellow)] px-2.5 py-2 text-[13px] font-medium text-[#06080f] transition-colors hover:bg-[var(--yellow-strong)] hover:text-white',
            variant === 'wizard' && 'disabled:cursor-not-allowed disabled:opacity-70',
          )}
        >
          {hasArea ? redrawActionLabel : drawActionLabel}
        </button>
        <button
          type="button"
          onClick={secondaryAction}
          className="map-segment rounded-md px-2.5 py-2 text-[13px] font-medium"
          disabled={clearDisabled}
        >
          {secondaryLabel}
        </button>
      </div>

      {onContinue && continueActionLabel && (
        <button
          type="button"
          onClick={onContinue}
          className="mt-2 inline-flex w-full items-center justify-center rounded-md border border-[color:var(--line)] bg-white px-2.5 py-2 text-[13px] font-medium text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={continueDisabled}
        >
          {continueActionLabel}
        </button>
      )}

      {postActionsContent}
    </>
  );
}
