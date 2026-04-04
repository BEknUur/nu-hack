import { useTranslation } from '@/i18n';
import type { ClickInfo } from '@/types/map';

interface SunInfoPopupProps {
  info: ClickInfo;
  onClose: () => void;
}

function formatDirection(side: ClickInfo['predictedBestSide'], labels: Record<'N' | 'E' | 'S' | 'W', string>) {
  if (side === 'N') return labels.N;
  if (side === 'E') return labels.E;
  if (side === 'S') return labels.S;
  if (side === 'W') return labels.W;
  return '—';
}

export default function SunInfoPopup({ info, onClose }: SunInfoPopupProps) {
  const { messages, t } = useTranslation();

  return (
    <div className="absolute bottom-24 left-1/2 z-[1000] w-[min(380px,calc(100vw-2rem))] -translate-x-1/2">
      <div className="map-panel rounded-xl p-4 text-[var(--ink)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="ui-mono text-[11px] text-[var(--ink-soft)]">{messages.map.locationSample}</div>
            <div className="mt-1 flex items-center gap-2 text-lg font-semibold tracking-[-0.04em]">
              {info.inSun === null ? (
                <span>{messages.map.checkingLight}</span>
              ) : info.inSun ? (
                <span className="text-[var(--yellow-strong)]">{messages.map.inSunlight}</span>
              ) : (
                <span className="text-[var(--blue-strong)]">{messages.map.inShadow}</span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label={messages.map.closeLightDetails}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--line)] bg-white/80 text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
          >
            ×
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-[color:var(--line)] bg-white/80 p-3">
            <div className="text-sm font-medium text-[var(--ink)]">
              {messages.map.coordinates}
            </div>
            <div className="mt-2 ui-mono text-[12px] text-[var(--ink-soft)]">
              {info.lat.toFixed(5)}, {info.lng.toFixed(5)}
            </div>
          </div>

          <div className="rounded-lg border border-[color:var(--line)] bg-white/80 p-3">
            <div className="text-sm font-medium text-[var(--ink)]">
              {messages.map.bestSide}
            </div>
            <div className="mt-2 text-sm text-[var(--ink-soft)]">
              {info.predictionLoading
                ? messages.map.predictingOrientation
                : formatDirection(info.predictedBestSide, {
                    N: messages.map.north,
                    E: messages.map.east,
                    S: messages.map.south,
                    W: messages.map.west,
                  })}
            </div>
            {info.predictedConfidence !== null && info.predictedConfidence !== undefined && !info.predictionLoading && (
              <div className="mt-1 ui-mono text-[11px] text-[var(--ink-soft)]">
                {t(messages.map.confidence, { value: Math.round(info.predictedConfidence * 100) })}
              </div>
            )}
          </div>
        </div>

        {(info.complexName || info.address || info.photoUrl || info.buildingInfoLoading) && (
          <div className="mt-4 rounded-lg border border-[color:var(--line)] bg-white/80 p-3">
            <div className="text-sm font-medium text-[var(--ink)]">{messages.map.buildingContext}</div>

            {info.photoUrl && (
              <div className="mt-3 overflow-hidden rounded-lg border border-[color:var(--line)]">
                <img
                  src={info.photoUrl}
                  alt={info.photoPlaceName ?? 'Building photo'}
                  className="h-32 w-full object-cover"
                  loading="lazy"
                />
              </div>
            )}

            {info.photoPlaceName && (
              <div className="mt-2 ui-mono text-[11px] text-[var(--ink-soft)]">
                {messages.map.source}: {info.photoPlaceName}
              </div>
            )}

            {info.complexName && (
              <div className="mt-3 text-sm text-[var(--ink)]">{messages.map.complex}: {info.complexName}</div>
            )}

            {info.address && (
              <div className="mt-2 text-sm text-[var(--ink-soft)]">{messages.map.address}: {info.address}</div>
            )}

            {info.buildingInfoLoading && (
              <div className="mt-2 text-sm text-[var(--ink-soft)]">{messages.map.loadingDetails}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
