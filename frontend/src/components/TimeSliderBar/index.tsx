import type { CSSProperties } from 'react';
import { Clock3 } from 'lucide-react';

interface TimeSliderBarProps {
  sliderValue: number;
  sliderPct: number;
  timeLabel: string;
  onSliderChange: (val: number) => void;
}

const MARKERS = ['00:00', '06:00', '12:00', '18:00', '23:59'];

export default function TimeSliderBar({
  sliderValue,
  sliderPct,
  timeLabel,
  onSliderChange,
}: TimeSliderBarProps) {
  return (
    <div className="pointer-events-none absolute bottom-4 left-1/2 z-[1000] w-[min(960px,calc(100vw-2rem))] -translate-x-1/2">
      <div className="map-panel pointer-events-auto rounded-xl px-4 py-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-5">
          <div className="flex items-center gap-3 md:min-w-[170px]">
            <div className="map-chip flex h-11 w-11 items-center justify-center rounded-lg">
              <Clock3 className="h-4 w-4 text-[var(--blue-strong)]" />
            </div>
            <div>
              <div className="ui-mono text-[11px] text-[var(--ink-soft)]">Time of day</div>
              <div className="mt-1 text-xl font-semibold tracking-[-0.04em] text-[var(--yellow-strong)]">
                {timeLabel}
              </div>
            </div>
          </div>

          <div className="flex-1">
            <input
              type="range"
              className="time-slider"
              min={0}
              max={1439}
              step={1}
              value={sliderValue}
              onChange={(e) => onSliderChange(Number(e.target.value))}
              style={{ '--pct': `${sliderPct}%` } as CSSProperties}
            />

            <div className="mt-2 flex justify-between ui-mono text-[11px] text-[var(--ink-soft)]">
              {MARKERS.map((marker) => (
                <span key={marker}>{marker}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
