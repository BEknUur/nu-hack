interface TimeSliderBarProps {
  sliderValue: number;
  sliderPct: number;
  timeLabel: string;
  onSliderChange: (val: number) => void;
}

export default function TimeSliderBar({
  sliderValue,
  sliderPct,
  timeLabel,
  onSliderChange,
}: TimeSliderBarProps) {
  return (
    <div className="absolute left-0 right-0 bottom-0 z-[1000]">
      <div className="w-full border-t border-white/[0.1] bg-[rgba(55,58,71,0.9)] px-4 pt-2 pb-3 text-white shadow-[0_-8px_24px_rgba(0,0,0,0.35)] backdrop-blur-[10px]">
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="text-xs font-semibold uppercase tracking-[0.9px] text-white/70">Time</span>
          <span className="text-base font-bold text-[#ff6b00] tabular-nums">{timeLabel}</span>
        </div>

        <input
          type="range"
          className="time-slider"
          min={0}
          max={1439}
          step={1}
          value={sliderValue}
          onChange={(e) => onSliderChange(Number(e.target.value))}
          style={{ '--pct': `${sliderPct}%` } as React.CSSProperties}
        />

        <div className="flex justify-between text-[11px] text-white/60 mt-1.5">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>23:59</span>
        </div>
      </div>
    </div>
  );
}
