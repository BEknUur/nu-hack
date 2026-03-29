import { MAP_CONFIG } from '@/config/map';

interface ControlPanelProps {
  dateStr: string;
  onDateChange: (v: string) => void;
  sunExposure: boolean;
  onModeChange: (exposure: boolean) => void;
  zoom: number;
  loadingBuildings: boolean;
}

export default function ControlPanel({
  dateStr,
  onDateChange,
  sunExposure,
  onModeChange,
  zoom,
  loadingBuildings,
}: ControlPanelProps) {
  const buildingsActive = zoom >= MAP_CONFIG.buildingsMinZoom;

  return (
    <div className="absolute top-4 right-4 z-[1000] w-[272px] bg-[rgba(8,12,28,0.9)] backdrop-blur-[16px] border border-white/[0.08] rounded-2xl pt-4 px-[18px] pb-[14px] text-[#e8eaf6] font-sans shadow-[0_12px_40px_rgba(0,0,0,0.5)]">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[15px] font-bold text-white tracking-[0.2px]">Shadow Map</span>
        {loadingBuildings && (
          <span
            className="w-2 h-2 rounded-full bg-[#4fc3f7] animate-pulse-dot"
            title="Loading buildings…"
          />
        )}
      </div>

      {/* Date */}
      <div className="mb-[14px]">
        <label className="block text-[10px] font-semibold tracking-[0.9px] uppercase text-[rgba(163,175,220,0.7)] mb-1.5">
          Date
        </label>
        <input
          type="date"
          className="date-picker w-full bg-white/[0.07] border border-white/[0.12] rounded-lg text-[#e8eaf6] px-2.5 py-2 text-[13px] outline-none cursor-pointer transition-colors focus:border-[rgba(79,195,247,0.5)]"
          value={dateStr}
          onChange={(e) => onDateChange(e.target.value)}
        />
      </div>

      {/* Mode toggle */}
      <div className="mb-[14px]">
        <label className="block text-[10px] font-semibold tracking-[0.9px] uppercase text-[rgba(163,175,220,0.7)] mb-1.5">
          Mode
        </label>
        <div className="flex gap-1.5">
          <button
            onClick={() => onModeChange(false)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg border cursor-pointer transition-all
              ${!sunExposure
                ? 'bg-[rgba(79,195,247,0.18)] border-[rgba(79,195,247,0.6)] text-[#4fc3f7] font-semibold'
                : 'bg-white/[0.06] border-white/[0.12] text-white/[0.55] hover:bg-white/10 hover:text-white/80'
              }`}
          >
            Shadows
          </button>
          <button
            onClick={() => onModeChange(true)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg border cursor-pointer transition-all
              ${sunExposure
                ? 'bg-[rgba(79,195,247,0.18)] border-[rgba(79,195,247,0.6)] text-[#4fc3f7] font-semibold'
                : 'bg-white/[0.06] border-white/[0.12] text-white/[0.55] hover:bg-white/10 hover:text-white/80'
              }`}
          >
            Sun Exposure
          </button>
        </div>
      </div>

      {/* Zoom hint */}
      <div className="flex items-center gap-[7px] text-[11px] text-white/35">
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${
            buildingsActive
              ? 'bg-[#69f0ae] shadow-[0_0_6px_rgba(105,240,174,0.7)]'
              : 'bg-white/25'
          }`}
        />
        <span>
          {buildingsActive
            ? 'Buildings loaded from OSM'
            : `Zoom to ${MAP_CONFIG.buildingsMinZoom}+ for buildings (now: ${Math.round(zoom)})`}
        </span>
      </div>
    </div>
  );
}
