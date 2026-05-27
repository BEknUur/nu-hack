import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from '@/i18n';
import type { TreeExplainResponse, TreeRankCandidate } from '@/types/tree-optimizer';
import { ImageGenerator } from '@/components/ImageGenerator';

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

interface CandidateCardLayoutInput {
  anchor: AnchorPoint;
  width: number;
  height: number;
  obstacleRect: DOMRect | null;
}

interface TreeCandidateCardProps {
  candidate: TreeRankCandidate;
  explanation: TreeExplainResponse | null;
  explanationLoading: boolean;
  explanationError: string | null;
  anchorPoint: AnchorPoint | null;
  obstacleSelector?: string;
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
}: CandidateCardLayoutInput): CardPosition {
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
    return {
      left: `${position.pointerOffset - half}px`,
      bottom: '-6px',
    };
  }
  if (position.placement === 'bottom') {
    return {
      left: `${position.pointerOffset - half}px`,
      top: '-6px',
    };
  }
  if (position.placement === 'left') {
    return {
      right: '-6px',
      top: `${position.pointerOffset - half}px`,
    };
  }
  return {
    left: '-6px',
    top: `${position.pointerOffset - half}px`,
  };
}

export default function TreeCandidateCard({
  candidate,
  explanation,
  explanationLoading,
  explanationError,
  anchorPoint,
  obstacleSelector = '[data-tree-wizard-panel="true"]',
  onClose,
}: TreeCandidateCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<CardPosition | null>(null);

  const recalcPosition = useCallback(() => {
    if (!anchorPoint) {
      setPosition(null);
      return;
    }

    const cardEl = cardRef.current;
    const width = cardEl?.offsetWidth || Math.min(420, window.innerWidth - 24);
    const height = cardEl?.offsetHeight || 380;
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
    const frame = window.requestAnimationFrame(() => {
      recalcPosition();
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [recalcPosition, candidate.id, explanation, explanationError, explanationLoading]);

  useEffect(() => {
    if (!anchorPoint) return;

    const observer = new ResizeObserver(() => {
      recalcPosition();
    });

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    const obstacle = obstacleSelector
      ? document.querySelector(obstacleSelector)
      : null;
    if (obstacle) {
      observer.observe(obstacle);
    }

    window.addEventListener('resize', recalcPosition);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', recalcPosition);
    };
  }, [anchorPoint, obstacleSelector, recalcPosition]);

  const { language } = useTranslation();

  const copy = {
    ru: {
      tag: 'Точка для посадки',
      rank: `Ранг #${candidate.rank}`,
      score: 'Итоговый балл',
      summer: 'Летняя прохлада',
      winter: 'Зимний свет',
      nearby: 'Зданий рядом',
      nearest: 'Ближайшее здание',
      why: 'Почему эта точка хорошая',
      fallback: 'базовое объяснение',
      generating: 'Генерирую объяснение...',
      close: 'Закрыть карточку точки',
    },
    kk: {
      tag: 'Отырғызу нүктесі',
      rank: `Рейтинг #${candidate.rank}`,
      score: 'Жалпы балл',
      summer: 'Жазғы салқындық',
      winter: 'Қысқы жарық',
      nearby: 'Жақын ғимараттар',
      nearest: 'Ең жақын ғимарат',
      why: 'Бұл нүкте неге жақсы',
      fallback: 'базалық түсіндірме',
      generating: 'Түсіндірме дайындалуда...',
      close: 'Нүкте картасын жабу',
    },
    en: {
      tag: 'Planting point',
      rank: `Rank #${candidate.rank}`,
      score: 'Total score',
      summer: 'Summer cooling',
      winter: 'Winter light',
      nearby: 'Nearby buildings',
      nearest: 'Nearest building',
      why: 'Why this point is good',
      fallback: 'fallback explanation',
      generating: 'Generating explanation...',
      close: 'Close point card',
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
      height: 380,
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

        <div className="map-panel relative max-h-[calc(100vh-1.5rem)] overflow-y-auto rounded-xl p-4 text-[var(--ink)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="ui-mono text-[11px] text-[var(--ink-soft)]">{copy.tag}</div>
            <div className="mt-1 flex items-center gap-2 text-lg font-semibold tracking-[-0.04em]">
              <span>{copy.rank}</span>
              <span className="ui-mono text-[13px] text-[var(--yellow-strong)]">
                {copy.score}: {candidate.score.toFixed(1)}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label={copy.close}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--line)] bg-white/80 text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
          >
            ×
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-[color:var(--line)] bg-white/80 p-3">
            <div className="ui-mono text-[11px] text-[var(--ink-soft)]">{copy.summer}</div>
            <div className="mt-1 text-base font-semibold text-[var(--yellow-strong)]">
              {(candidate.factors.summer_cooling * 100).toFixed(0)}%
            </div>
          </div>
          <div className="rounded-lg border border-[color:var(--line)] bg-white/80 p-3">
            <div className="ui-mono text-[11px] text-[var(--ink-soft)]">{copy.winter}</div>
            <div className="mt-1 text-base font-semibold text-[var(--yellow-strong)]">
              {(candidate.factors.winter_light * 100).toFixed(0)}%
            </div>
          </div>
          <div className="rounded-lg border border-[color:var(--line)] bg-white/80 p-3">
            <div className="ui-mono text-[11px] text-[var(--ink-soft)]">{copy.nearby}</div>
            <div className="mt-1 text-base font-semibold">{candidate.factors.nearby_buildings}</div>
          </div>
          <div className="rounded-lg border border-[color:var(--line)] bg-white/80 p-3">
            <div className="ui-mono text-[11px] text-[var(--ink-soft)]">{copy.nearest}</div>
            <div className="mt-1 text-base font-semibold">{candidate.factors.nearest_building_m.toFixed(1)} m</div>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-[color:var(--line)] bg-white/80 p-3">
          <div className="flex items-center justify-between gap-2 text-sm font-medium text-[var(--ink)]">
            <span>{copy.why}</span>
            {explanation?.source === 'fallback' && (
              <span className="ui-mono text-[11px] text-[var(--ink-soft)]">{copy.fallback}</span>
            )}
          </div>

          {explanationLoading && (
            <p className="mt-3 text-sm text-[var(--ink-soft)]">{copy.generating}</p>
          )}

          {!explanationLoading && explanationError && (
            <p className="mt-3 text-sm text-[var(--ink-soft)]">{explanationError}</p>
          )}

          {!explanationLoading && !explanationError && explanation && (
            <>
              <p className="mt-3 text-sm leading-6 text-[var(--ink)]">{explanation.summary}</p>
              <ul className="mt-3 space-y-1.5 text-sm text-[var(--ink-soft)]">
                {explanation.reasons.map((reason) => (
                  <li key={reason} className="leading-6">• {reason}</li>
                ))}
              </ul>
              <p className="mt-3 rounded-lg border border-[color:var(--line)] bg-white/80 px-2.5 py-2 text-sm text-[var(--ink-soft)]">
                {explanation.caution}
              </p>
            </>
          )}
        </div>

        <ImageGenerator defaultPrompt="Visualize a tree planted at this urban location in Astana" />
      </div>
      </div>
    </div>
  );
}
