import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Sparkles, Sun, X } from 'lucide-react';
import { useTranslation } from '@/i18n';
import type { MissionPick, SolarExplainResponse, SolarRankCandidate } from '@/types/solar-flowers';

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

interface CardLayoutInput {
  anchor: AnchorPoint;
  width: number;
  height: number;
  obstacleRect: DOMRect | null;
}

interface SolarFlowersCandidateCardProps {
  candidate: SolarRankCandidate;
  explanation: SolarExplainResponse | null;
  explanationLoading: boolean;
  explanationError: string | null;
  anchorPoint: AnchorPoint | null;
  missionPicks: MissionPick[];
  missionTarget: number;
  obstacleSelector?: string;
  onPick: (candidate: SolarRankCandidate) => void;
  onClose: () => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function overlapArea(a: DOMRect, b: DOMRect): number {
  const left = Math.max(a.left, b.left);
  const right = Math.min(a.right, b.right);
  const top = Math.max(a.top, b.top);
  const bottom = Math.min(a.bottom, b.bottom);
  if (right <= left || bottom <= top) return 0;
  return (right - left) * (bottom - top);
}

function computeCardPosition({
  anchor,
  width,
  height,
  obstacleRect,
}: CardLayoutInput): CardPosition {
  const margin = 12;
  const gap = 16;

  const viewportLeft = margin;
  const viewportTop = margin;
  const viewportRight = window.innerWidth - margin;
  const viewportBottom = window.innerHeight - margin;

  const placements: CardPlacement[] = ['top', 'bottom', 'right', 'left'];

  let best: CardPosition | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const placement of placements) {
    let preferredLeft = 0;
    let preferredTop = 0;

    if (placement === 'top') {
      preferredLeft = anchor.x - width / 2;
      preferredTop = anchor.y - height - gap;
    }
    if (placement === 'bottom') {
      preferredLeft = anchor.x - width / 2;
      preferredTop = anchor.y + gap;
    }
    if (placement === 'right') {
      preferredLeft = anchor.x + gap;
      preferredTop = anchor.y - height / 2;
    }
    if (placement === 'left') {
      preferredLeft = anchor.x - width - gap;
      preferredTop = anchor.y - height / 2;
    }

    const left = clamp(preferredLeft, viewportLeft, viewportRight - width);
    const top = clamp(preferredTop, viewportTop, viewportBottom - height);
    const rect = new DOMRect(left, top, width, height);

    const displacementPenalty = Math.abs(preferredLeft - left) + Math.abs(preferredTop - top);
    const overlapPenalty = obstacleRect ? overlapArea(rect, obstacleRect) * 5 : 0;
    const score = displacementPenalty + overlapPenalty;

    let pointerOffset = 0;
    if (placement === 'top' || placement === 'bottom') {
      pointerOffset = clamp(anchor.x - left, 18, width - 18);
    } else {
      pointerOffset = clamp(anchor.y - top, 18, height - 18);
    }

    if (score < bestScore) {
      bestScore = score;
      best = {
        left,
        top,
        placement,
        pointerOffset,
      };
    }
  }

  return best ?? {
    left: viewportLeft,
    top: viewportTop,
    placement: 'top',
    pointerOffset: width / 2,
  };
}

function pointerStyle(position: CardPosition) {
  const half = 6;
  if (position.placement === 'top') {
    return { left: `${position.pointerOffset - half}px`, bottom: '-6px' };
  }
  if (position.placement === 'bottom') {
    return { left: `${position.pointerOffset - half}px`, top: '-6px' };
  }
  if (position.placement === 'left') {
    return { right: '-6px', top: `${position.pointerOffset - half}px` };
  }
  return { left: '-6px', top: `${position.pointerOffset - half}px` };
}

export default function SolarFlowersCandidateCard({
  candidate,
  explanation,
  explanationLoading,
  explanationError,
  anchorPoint,
  missionPicks,
  missionTarget,
  obstacleSelector = '[data-solar-wizard-panel="true"]',
  onPick,
  onClose,
}: SolarFlowersCandidateCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<CardPosition | null>(null);

  const recalcPosition = useCallback(() => {
    if (!anchorPoint) {
      setPosition(null);
      return;
    }

    const cardEl = cardRef.current;
    const width = cardEl?.offsetWidth || Math.min(420, window.innerWidth - 24);
    const height = cardEl?.offsetHeight || 420;
    const obstacle = obstacleSelector
      ? document.querySelector(obstacleSelector)
      : null;

    setPosition(computeCardPosition({
      anchor: anchorPoint,
      width,
      height,
      obstacleRect: obstacle ? obstacle.getBoundingClientRect() : null,
    }));
  }, [anchorPoint, obstacleSelector]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => recalcPosition());
    return () => window.cancelAnimationFrame(frame);
  }, [recalcPosition, candidate.id, explanation, explanationError, explanationLoading]);

  useEffect(() => {
    if (!anchorPoint) return;

    const observer = new ResizeObserver(() => recalcPosition());
    if (cardRef.current) observer.observe(cardRef.current);

    const obstacle = obstacleSelector
      ? document.querySelector(obstacleSelector)
      : null;
    if (obstacle) observer.observe(obstacle);

    window.addEventListener('resize', recalcPosition);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', recalcPosition);
    };
  }, [anchorPoint, obstacleSelector, recalcPosition]);

  const alreadyPicked = missionPicks.some((item) => item.id === candidate.id);
  const missionLocked = !alreadyPicked && missionPicks.length >= missionTarget;

  const { language } = useTranslation();
  const copy = {
    ru: {
      tag: 'Точка света',
      rank: `Ранг #${candidate.rank}`,
      score: 'Баллы',
      sunHours: 'Солнце в день',
      lightFit: 'Соответствие профилю',
      openness: 'Открытость',
      risk: 'Риск конфликта',
      nearby: 'Зданий рядом',
      nearest: 'Ближайшее здание',
      why: 'Почему эта точка подходит',
      generating: 'Генерирую объяснение...',
      pick: 'Выбрать в миссию',
      picked: 'Уже выбрано',
      missionFull: 'Лимит миссии заполнен',
      close: 'Закрыть карточку',
    },
    kk: {
      tag: 'Жарық нүктесі',
      rank: `Рейтинг #${candidate.rank}`,
      score: 'Ұпай',
      sunHours: 'Күн сәулесі/күн',
      lightFit: 'Профильге сәйкестік',
      openness: 'Ашықтық',
      risk: 'Қақтығыс қаупі',
      nearby: 'Жақын ғимараттар',
      nearest: 'Ең жақын ғимарат',
      why: 'Бұл нүкте неге лайық',
      generating: 'Түсіндірме дайындалуда...',
      pick: 'Миссияға таңдау',
      picked: 'Таңдалған',
      missionFull: 'Миссия лимиті толды',
      close: 'Картаны жабу',
    },
    en: {
      tag: 'Light spot',
      rank: `Rank #${candidate.rank}`,
      score: 'Score',
      sunHours: 'Sun per day',
      lightFit: 'Profile fit',
      openness: 'Openness',
      risk: 'Conflict risk',
      nearby: 'Nearby buildings',
      nearest: 'Nearest building',
      why: 'Why this spot fits',
      generating: 'Generating explanation...',
      pick: 'Pick for mission',
      picked: 'Picked',
      missionFull: 'Mission limit reached',
      close: 'Close card',
    },
  }[language];

  if (!anchorPoint) {
    return null;
  }

  const activePosition = (() => {
    if (position) return position;
    const obstacle = obstacleSelector
      ? document.querySelector(obstacleSelector)
      : null;
    return computeCardPosition({
      anchor: anchorPoint,
      width: Math.min(420, window.innerWidth - 24),
      height: 420,
      obstacleRect: obstacle ? obstacle.getBoundingClientRect() : null,
    });
  })();

  return (
    <div className="pointer-events-none absolute inset-0 z-[1080]">
      <div
        ref={cardRef}
        className="pointer-events-auto absolute w-[min(420px,calc(100vw-2rem))]"
        style={{ left: `${activePosition.left}px`, top: `${activePosition.top}px` }}
      >
        <span
          className="absolute h-3 w-3 rotate-45 border border-[color:var(--line)] bg-[rgba(251,248,241,0.94)]"
          style={pointerStyle(activePosition)}
        />

        <div className="map-panel relative rounded-xl p-4 text-[var(--ink)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="ui-mono text-[11px] text-[var(--ink-soft)]">{copy.tag}</div>
              <div className="mt-1 text-base font-semibold tracking-[-0.03em]">{copy.rank}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={copy.close}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--line)] bg-white/80 text-[var(--ink-soft)] transition-colors hover:bg-white hover:text-[var(--ink)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg border border-[color:var(--line)] bg-white/80 px-3 py-2">
              <div className="text-[var(--ink-soft)]">{copy.score}</div>
              <div className="font-semibold">{candidate.score.toFixed(1)}</div>
            </div>
            <div className="rounded-lg border border-[color:var(--line)] bg-white/80 px-3 py-2">
              <div className="text-[var(--ink-soft)]">{copy.sunHours}</div>
              <div className="font-semibold">{candidate.factors.sun_hours.toFixed(1)}h</div>
            </div>
            <div className="rounded-lg border border-[color:var(--line)] bg-white/80 px-3 py-2">
              <div className="text-[var(--ink-soft)]">{copy.lightFit}</div>
              <div className="font-semibold">{(candidate.factors.light_fit * 100).toFixed(0)}%</div>
            </div>
            <div className="rounded-lg border border-[color:var(--line)] bg-white/80 px-3 py-2">
              <div className="text-[var(--ink-soft)]">{copy.openness}</div>
              <div className="font-semibold">{(candidate.factors.openness * 100).toFixed(0)}%</div>
            </div>
            <div className="rounded-lg border border-[color:var(--line)] bg-white/80 px-3 py-2">
              <div className="text-[var(--ink-soft)]">{copy.risk}</div>
              <div className="font-semibold">{(candidate.factors.conflict_risk * 100).toFixed(0)}%</div>
            </div>
            <div className="rounded-lg border border-[color:var(--line)] bg-white/80 px-3 py-2">
              <div className="text-[var(--ink-soft)]">{copy.nearby}</div>
              <div className="font-semibold">{candidate.factors.nearby_buildings}</div>
            </div>
          </div>

          <div className="mt-2 text-xs text-[var(--ink-soft)]">
            {copy.nearest}: {candidate.factors.nearest_building_m.toFixed(1)} m
          </div>

          <div className="mt-4 rounded-lg border border-[color:var(--line)] bg-white/80 p-3">
            <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[var(--ink)]">
              <Sparkles className="h-4 w-4 text-[var(--yellow-strong)]" />
              {copy.why}
            </div>
            {explanationLoading && (
              <div className="text-sm text-[var(--ink-soft)]">{copy.generating}</div>
            )}
            {!explanationLoading && explanationError && (
              <div className="text-sm text-[#991b1b]">{explanationError}</div>
            )}
            {!explanationLoading && !explanationError && explanation && (
              <div className="space-y-2 text-sm">
                <p>{explanation.summary}</p>
                <ul className="space-y-1 text-[var(--ink-soft)]">
                  {explanation.reasons.map((reason, idx) => (
                    <li key={`${candidate.id}-reason-${idx}`}>• {reason}</li>
                  ))}
                </ul>
                <p className="text-xs text-[var(--ink-soft)]">{explanation.caution}</p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onPick(candidate)}
            disabled={missionLocked}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[color:var(--yellow-strong)] bg-[var(--yellow)] px-3 py-2 text-sm font-medium text-[#3b2a06] transition-colors enabled:hover:bg-[#f4cc60] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Sun className="h-4 w-4" />
            {alreadyPicked ? copy.picked : (missionLocked ? copy.missionFull : copy.pick)}
          </button>
        </div>
      </div>
    </div>
  );
}
