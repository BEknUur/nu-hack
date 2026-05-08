import type { ClickInfo } from '@/types/map';

interface SunInfoPopupProps {
  info: ClickInfo;
  onClose: () => void;
}

export default function SunInfoPopup({ info, onClose }: SunInfoPopupProps) {
  return (
    <div className="absolute bottom-7 left-1/2 z-[1000] min-w-[250px] max-w-[360px] -translate-x-1/2 rounded-xl px-6 pt-3 pb-[14px] bg-[rgba(8,12,28,0.92)] backdrop-blur-[16px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.45)] font-sans animate-slide-up">
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-2 right-3 bg-transparent border-0 text-white/40 text-lg leading-none cursor-pointer transition-colors hover:text-white/80"
      >
        ×
      </button>

      <div className="text-[11px] text-white/40 mb-1.5 tabular-nums">
        {info.lat.toFixed(5)}, {info.lng.toFixed(5)}
      </div>

      <div className="text-center">
        {info.inSun === null ? (
          <div className="text-[13px] text-white/50">Checking…</div>
        ) : info.inSun ? (
          <div className="text-base font-bold text-[#ffd54f]">☀ In sunlight</div>
        ) : (
          <div className="text-base font-bold text-[#90caf9]">● In shadow</div>
        )}
      </div>

      {(info.complexName || info.address || info.photoUrl || info.buildingInfoLoading) && (
        <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left">
          <div className="text-[10px] uppercase tracking-[0.7px] text-white/40">Building</div>
          {info.photoUrl && (
            <div className="mt-1">
              <img
                src={info.photoUrl}
                alt={info.photoPlaceName ?? 'Building photo'}
                className="h-28 w-full rounded-md object-cover border border-white/10"
                loading="lazy"
              />
              {info.photoPlaceName && (
                <div className="mt-1 text-[11px] text-white/55">
                  Source: {info.photoPlaceName}
                </div>
              )}
            </div>
          )}
          {info.complexName && (
            <div className="mt-1 text-[12px] text-white/80">
              ЖК: {info.complexName}
            </div>
          )}
          {info.address && (
            <div className="mt-1 text-[12px] text-white/70">
              Адрес: {info.address}
            </div>
          )}
          {info.buildingInfoLoading && (
            <div className="mt-1 text-[11px] text-white/45">Загружаю адрес...</div>
          )}
        </div>
      )}
    </div>
  );
}
