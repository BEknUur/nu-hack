import { useCallback, useEffect, useRef, useState } from 'react';
import { Sun, X } from 'lucide-react';
import { useTranslation } from '@/i18n';
import type { SolarCandidate } from '@/types/solar-flowers';

type CardPlacement = 'top' | 'bottom' | 'left' | 'right';

interface AnchorPoint {
  x: number;
  y: number;
}

interface CardPosition {
  left: number;
  top: number;
  placement: CardPlacement;
  pointerOffset: number;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function overlapArea(a: DOMRect, b: DOMRect) {
  const l = Math.max(a.left, b.left);
  const r = Math.min(a.right, b.right);
  const t = Math.max(a.top, b.top);
  const bo = Math.min(a.bottom, b.bottom);
  if (r <= l || bo <= t) return 0;
  return (r - l) * (bo - t);
}

function computeCardPosition(
  anchor: AnchorPoint,
  width: number,
  height: number,
  obstacleRect: DOMRect | null,
): CardPosition {
  const margin = 12;
  const gap = 16;
  const vr = window.innerWidth - margin;
  const vb = window.innerHeight - margin;

  let best: CardPosition | null = null;
  let bestScore = Infinity;

  for (const placement of ['top', 'bottom', 'right', 'left'] as CardPlacement[]) {
    let pl = 0, pt = 0;
    if (placement === 'top') { pl = anchor.x - width / 2; pt = anchor.y - height - gap; }
    if (placement === 'bottom') { pl = anchor.x - width / 2; pt = anchor.y + gap; }
    if (placement === 'right') { pl = anchor.x + gap; pt = anchor.y - height / 2; }
    if (placement === 'left') { pl = anchor.x - width - gap; pt = anchor.y - height / 2; }

    const left = clamp(pl, margin, vr - width);
    const top = clamp(pt, margin, vb - height);
    const rect = new DOMRect(left, top, width, height);
    const score = Math.abs(pl - left) + Math.abs(pt - top) + (obstacleRect ? overlapArea(rect, obstacleRect) * 5 : 0);

    const pointerOffset = (placement === 'top' || placement === 'bottom')
      ? clamp(anchor.x - left, 18, width - 18)
      : clamp(anchor.y - top, 18, height - 18);

    if (score < bestScore) { bestScore = score; best = { left, top, placement, pointerOffset }; }
  }

  return best ?? { left: margin, top: margin, placement: 'top', pointerOffset: width / 2 };
}

function pointerStyle(pos: CardPosition) {
  const half = 6;
  if (pos.placement === 'top') return { left: `${pos.pointerOffset - half}px`, bottom: '-6px' };
  if (pos.placement === 'bottom') return { left: `${pos.pointerOffset - half}px`, top: '-6px' };
  if (pos.placement === 'left') return { right: '-6px', top: `${pos.pointerOffset - half}px` };
  return { left: '-6px', top: `${pos.pointerOffset - half}px` };
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] text-[var(--ink-soft)]">{label}</span>
        <span className="text-[11px] text-[var(--ink-soft)] tabular-nums">{value.toFixed(0)}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden bg-orange-100">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, background: 'linear-gradient(90deg, #c2620a, #fb923c)' }}
        />
      </div>
    </div>
  );
}

interface SolarCandidateCardProps {
  candidate: SolarCandidate;
  anchorPoint: AnchorPoint | null;
  obstacleSelector?: string;
  onClose: () => void;
}

const COPY = {
  ru: {
    tag: 'Точка установки',
    rank: (r: number) => `Ранг #${r}`,
    score: 'Балл',
    kwh: 'кВт·ч/год (оц.)',
    annual: 'Год. инсоляция',
    winter: 'Зим. инсоляция',
    shading: 'Риск затенения',
    slope: 'Рельеф',
    access: 'Доступность',
    close: 'Закрыть',
  },
  kk: {
    tag: 'Орнату нүктесі',
    rank: (r: number) => `Рейтинг #${r}`,
    score: 'Балл',
    kwh: 'кВт·сағ/жыл (бол.)',
    annual: 'Жылд. инсоляция',
    winter: 'Қысқы инсоляция',
    shading: 'Көлеңке қаупі',
    slope: 'Бедер',
    access: 'Қолжетімділік',
    close: 'Жабу',
  },
  en: {
    tag: 'Installation point',
    rank: (r: number) => `Rank #${r}`,
    score: 'Score',
    kwh: 'Est. kWh/yr',
    annual: 'Annual irradiance',
    winter: 'Winter irradiance',
    shading: 'Shading risk',
    slope: 'Slope',
    access: 'Access',
    close: 'Close',
  },
} as const;

export default function SolarCandidateCard({
  candidate,
  anchorPoint,
  obstacleSelector = '[data-solar-wizard-panel="true"]',
  onClose,
}: SolarCandidateCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<CardPosition | null>(null);
  const { language } = useTranslation();
  const copy = COPY[language] ?? COPY.en;

  const recalc = useCallback(() => {
    if (!anchorPoint) { setPosition(null); return; }
    const w = cardRef.current?.offsetWidth ?? Math.min(360, window.innerWidth - 24);
    const h = cardRef.current?.offsetHeight ?? 340;
    const obstacle = obstacleSelector ? document.querySelector(obstacleSelector) : null;
    setPosition(computeCardPosition(anchorPoint, w, h, obstacle ? obstacle.getBoundingClientRect() : null));
  }, [anchorPoint, obstacleSelector]);

  useEffect(() => {
    const id = requestAnimationFrame(recalc);
    return () => cancelAnimationFrame(id);
  }, [recalc, candidate.id]);

  useEffect(() => {
    if (!anchorPoint) return;
    const obs = new ResizeObserver(recalc);
    if (cardRef.current) obs.observe(cardRef.current);
    const obstacle = obstacleSelector ? document.querySelector(obstacleSelector) : null;
    if (obstacle) obs.observe(obstacle);
    window.addEventListener('resize', recalc);
    return () => { obs.disconnect(); window.removeEventListener('resize', recalc); };
  }, [anchorPoint, obstacleSelector, recalc]);

  if (!anchorPoint) return null;

  const obstacle = obstacleSelector ? document.querySelector(obstacleSelector) : null;
  const pos = position ?? computeCardPosition(
    anchorPoint,
    Math.min(360, window.innerWidth - 24),
    340,
    obstacle ? obstacle.getBoundingClientRect() : null,
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-[1080]">
      <div
        ref={cardRef}
        className="pointer-events-auto absolute w-[min(360px,calc(100vw-2rem))]"
        style={{ left: `${pos.left}px`, top: `${pos.top}px` }}
      >
        <span
          className="absolute h-3 w-3 rotate-45 border border-orange-200 bg-[rgba(255,247,237,0.96)]"
          style={pointerStyle(pos)}
        />

        <div className="map-panel relative rounded-xl p-4 text-[var(--ink)]">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="ui-mono text-[11px] text-[var(--ink-soft)]">{copy.tag}</div>
              <div className="mt-1 flex items-center gap-2 text-lg font-semibold tracking-[-0.04em]">
                <Sun className="h-4 w-4 text-orange-500" />
                <span>{copy.rank(candidate.rank)}</span>
                <span className="ui-mono text-[13px] text-orange-600">
                  {copy.score}: {candidate.score.toFixed(1)}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label={copy.close}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--line)] bg-white/80 text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* kWh estimate */}
          <div className="mt-3 rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 flex items-center justify-between">
            <span className="text-[11px] text-orange-700/70">{copy.kwh}</span>
            <span className="font-mono text-sm font-semibold text-orange-700">
              {candidate.kwhPerYearEst.toLocaleString()} kWh
            </span>
          </div>

          {/* Factor bars */}
          <div className="mt-3 space-y-2.5">
            <ScoreBar label={copy.annual} value={candidate.factors.annual_irradiance} />
            <ScoreBar label={copy.winter} value={candidate.factors.winter_irradiance} />
            <ScoreBar label={copy.shading} value={candidate.factors.shading_risk} />
            <ScoreBar label={copy.slope} value={candidate.factors.slope_suitability} />
            <ScoreBar label={copy.access} value={candidate.factors.access_score} />
          </div>
        </div>
      </div>
    </div>
  );
}
