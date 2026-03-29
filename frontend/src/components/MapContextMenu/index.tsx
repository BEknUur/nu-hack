interface MapContextMenuProps {
  x: number;
  y: number;
  lat: number;
  lng: number;
  annualSunHours: number | null;
  dailySunHours: number | null;
  loadingInfo: boolean;
  error: string | null;
  onShadows: () => void;
  onCenterMap: () => void;
  onClose: () => void;
}

export default function MapContextMenu({
  x,
  y,
  lat,
  lng,
  annualSunHours,
  dailySunHours,
  loadingInfo,
  error,
  onShadows,
  onCenterMap,
  onClose,
}: MapContextMenuProps) {
  return (
    <div
      className="absolute z-[1200] w-[270px] rounded-lg overflow-hidden border border-black/30 bg-[rgba(18,25,45,0.94)] shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-[#ff6b00] px-4 py-3 text-white font-bold text-[20px] tabular-nums">
        {lat.toFixed(4)}, {lng.toFixed(4)}
      </div>

      <div className="px-6 py-3 text-white text-[20px] font-semibold">
        Annual sunlight
        <div className="text-[14px] font-medium text-white/70">
          {loadingInfo
            ? 'Loading...'
            : error
            ? error
            : annualSunHours === null
            ? '-'
            : `${annualSunHours.toFixed(1)} hours`}
        </div>
      </div>
      <div className="px-6 py-3 text-white text-[20px] font-semibold">
        Hours in the sun
        <div className="text-[14px] font-medium text-white/70">
          {loadingInfo
            ? 'Loading...'
            : error
            ? error
            : dailySunHours === null
            ? '-'
            : `${dailySunHours.toFixed(2)} hours`}
        </div>
      </div>
      <button
        onClick={onShadows}
        className="block w-full text-left px-6 py-3 text-white text-[20px] font-semibold hover:bg-white/10 transition-colors"
      >
        Shadows
      </button>
      <button
        onClick={onCenterMap}
        className="block w-full text-left px-6 py-3 text-white text-[20px] font-semibold hover:bg-white/10 transition-colors"
      >
        Center map
      </button>
      <button
        onClick={onClose}
        className="block w-full text-left px-6 py-3 text-white/80 text-[18px] font-semibold hover:bg-white/10 transition-colors"
      >
        Close
      </button>
    </div>
  );
}
