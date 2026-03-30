import { MapPin, SunMedium, X } from 'lucide-react';
import type { ClickInfo } from '@/types/map';

interface SunInfoPopupProps {
  info: ClickInfo;
  onClose: () => void;
}

function formatDirection(side: ClickInfo['predictedBestSide']) {
  if (side === 'N') return 'North';
  if (side === 'E') return 'East';
  if (side === 'S') return 'South';
  if (side === 'W') return 'West';
  return '—';
}

export default function SunInfoPopup({ info, onClose }: SunInfoPopupProps) {
  return (
    <div className="absolute bottom-24 left-1/2 z-[1000] w-[min(380px,calc(100vw-2rem))] -translate-x-1/2">
      <div className="map-panel rounded-xl p-4 text-[var(--ink)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="ui-mono text-[11px] text-[var(--ink-soft)]">Location sample</div>
            <div className="mt-1 flex items-center gap-2 text-lg font-semibold tracking-[-0.04em]">
              {info.inSun === null ? (
                <span>Checking light</span>
              ) : info.inSun ? (
                <span className="text-[var(--yellow-strong)]">In sunlight</span>
              ) : (
                <span className="text-[var(--blue-strong)]">In shadow</span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close light details"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--line)] bg-white/80 text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-[color:var(--line)] bg-white/80 p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--ink)]">
              <MapPin className="h-4 w-4 text-[var(--blue-strong)]" />
              Coordinates
            </div>
            <div className="mt-2 ui-mono text-[12px] text-[var(--ink-soft)]">
              {info.lat.toFixed(5)}, {info.lng.toFixed(5)}
            </div>
          </div>

          <div className="rounded-lg border border-[color:var(--line)] bg-white/80 p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--ink)]">
              <SunMedium className="h-4 w-4 text-[var(--yellow-strong)]" />
              Best side
            </div>
            <div className="mt-2 text-sm text-[var(--ink-soft)]">
              {info.predictionLoading ? 'Predicting orientation...' : formatDirection(info.predictedBestSide)}
            </div>
            {info.predictedConfidence !== null && info.predictedConfidence !== undefined && !info.predictionLoading && (
              <div className="mt-1 ui-mono text-[11px] text-[var(--ink-soft)]">
                confidence {Math.round(info.predictedConfidence * 100)}%
              </div>
            )}
          </div>
        </div>

        {(info.complexName || info.address || info.photoUrl || info.buildingInfoLoading) && (
          <div className="mt-4 rounded-lg border border-[color:var(--line)] bg-white/80 p-3">
            <div className="text-sm font-medium text-[var(--ink)]">Building context</div>

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
                Source: {info.photoPlaceName}
              </div>
            )}

            {info.complexName && (
              <div className="mt-3 text-sm text-[var(--ink)]">ЖК: {info.complexName}</div>
            )}

            {info.address && (
              <div className="mt-2 text-sm text-[var(--ink-soft)]">Адрес: {info.address}</div>
            )}

            {info.buildingInfoLoading && (
              <div className="mt-2 text-sm text-[var(--ink-soft)]">Loading address and building details...</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
