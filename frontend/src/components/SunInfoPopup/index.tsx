import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { getBackendUrl } from '@/services/backendUrl';
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

function formatSunHours(hours: number): string {
  return hours.toFixed(hours >= 10 ? 0 : 1);
}

async function fetchAnalysis(info: ClickInfo, lang: string): Promise<string> {
  const resp = await fetch(`${getBackendUrl()}/chat/analyze-building`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lat: info.lat,
      lng: info.lng,
      in_sun: info.inSun,
      best_side: info.predictedBestSide,
      confidence: info.predictedConfidence,
      sun_hours: info.sunHours,
      address: info.address,
      complex_name: info.complexName,
      language: lang,
    }),
  });
  if (!resp.ok) throw new Error('Analysis failed');
  const data = await resp.json();
  return data.analysis;
}

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\d+\.\s/gm, '<br/>• ')
    .replace(/\n/g, '<br/>');
}

export default function SunInfoPopup({ info, onClose }: SunInfoPopupProps) {
  const { messages, t, language } = useTranslation();
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (analyzing || analysis) return;
    setAnalyzing(true);
    try {
      const result = await fetchAnalysis(info, language);
      setAnalysis(result);
    } catch {
      setAnalysis('Analysis failed. Try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="absolute bottom-24 left-1/2 z-[1000] w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 max-h-[70vh] overflow-y-auto">
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
                <span className="text-[var(--yellow-strong)]">{messages.map.inShadow}</span>
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

          <div className="rounded-lg border border-[color:var(--line)] bg-white/80 p-3 sm:col-span-2">
            <div className="text-sm font-medium text-[var(--ink)]">
              {messages.map.dailySun}
            </div>
            <div className="mt-2 text-sm text-[var(--ink-soft)]">
              {info.sunHoursLoading
                ? messages.map.calculatingDailySun
                : typeof info.sunHours === 'number'
                  ? t(messages.map.dailySunHours, { value: formatSunHours(info.sunHours) })
                  : info.sunHoursAvailable
                    ? messages.map.dailySunUnavailable
                    : messages.map.dailySunExposureHint}
            </div>
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

        {/* Kolenke AI Analysis */}
        {!analysis && (
          <button
            onClick={handleAnalyze}
            disabled={analyzing || info.buildingInfoLoading || info.predictionLoading}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--yellow)] px-4 py-2.5 text-sm font-semibold text-[#06080f] transition-all hover:opacity-90 disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Kolenke...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Kolenke Analysis
              </>
            )}
          </button>
        )}

        {analysis && (
          <div className="mt-4 rounded-lg border border-[var(--yellow)]/30 bg-[var(--yellow)]/5 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-[var(--yellow-strong)]" />
              <span className="ui-mono text-[11px] font-medium text-[var(--yellow-strong)] uppercase tracking-[0.5px]">Kolenke</span>
            </div>
            <div
              className="text-[13px] leading-[1.6] text-[var(--ink)]"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(analysis) }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
