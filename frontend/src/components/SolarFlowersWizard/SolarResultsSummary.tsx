import { Sparkles } from 'lucide-react';
import type { SolarCandidate } from '@/types/solar-flowers';
import type { SolarWizardCopy } from '@/components/SolarFlowersWizard/copy';
import {
  ACCENT_BG,
  ACCENT_BORDER,
  DARK_CARD,
  DARK_CARD_BORDER,
  ORANGE,
} from '@/components/SolarFlowersWizard/styles';

interface SolarResultsSummaryProps {
  candidates: SolarCandidate[];
  copy: SolarWizardCopy;
  showPoints: boolean;
  onTogglePoints: () => void;
  onRunRanking: () => void;
  onBackToShape: () => void;
}

export function SolarResultsSummary({
  candidates,
  copy,
  showPoints,
  onTogglePoints,
  onRunRanking,
  onBackToShape,
}: SolarResultsSummaryProps) {
  return (
    <div
      className="rounded-xl p-4 space-y-2"
      style={{ background: DARK_CARD, border: `1px solid ${DARK_CARD_BORDER}` }}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 flex-shrink-0" style={{ color: ORANGE }} />
        <span className="text-sm font-semibold text-white">{copy.resultsTitle}</span>
      </div>

      {candidates.length > 0 ? (
        <>
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-1.5"
            style={{ background: ACCENT_BG, border: `1px solid ${ACCENT_BORDER}` }}
          >
            <span className="font-mono text-[11px]" style={{ color: ORANGE }}>
              {copy.foundLabel(candidates.length)}
            </span>
          </div>
          <p className="text-[11px] text-white/35 leading-snug">{copy.resultsHint}</p>

          <div className="space-y-1.5 pt-1">
            {candidates.slice(0, 3).map((candidate) => (
              <div
                key={candidate.id}
                className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="font-mono text-[10px] flex-shrink-0"
                    style={{ color: ORANGE }}
                  >
                    #{candidate.rank}
                  </span>
                  <div>
                    <div className="text-[11px] text-white/70 font-medium">
                      {copy.scoreLabel} {candidate.score}
                    </div>
                    <div className="text-[10px] text-white/30">{candidate.kwhPerYearEst} {copy.kwhLabel}</div>
                  </div>
                </div>
                <div
                  className="h-6 w-6 rounded-full"
                  style={{ background: `conic-gradient(${ORANGE} ${candidate.score}%, rgba(255,255,255,0.05) 0)` }}
                />
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-[12px] text-white/40 leading-snug">{copy.noResults}</p>
      )}

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={onRunRanking}
          className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-all duration-150"
          style={{ background: ORANGE }}
        >
          {copy.rerunBtn}
        </button>
        <button
          type="button"
          onClick={onBackToShape}
          className="flex items-center justify-center rounded-lg px-3 py-2 text-xs font-medium text-white/40 transition-all duration-150"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {copy.newAreaBtn}
        </button>
      </div>

      <button
        type="button"
        onClick={onTogglePoints}
        className="w-full rounded-lg px-3 py-2 text-xs font-medium text-white/80 transition-all duration-150"
        style={{
          border: '1px solid rgba(255,255,255,0.14)',
          background: showPoints ? 'rgba(251,146,60,0.18)' : 'rgba(255,255,255,0.04)',
        }}
      >
        {showPoints ? copy.hidePointsBtn : copy.showPointsBtn}
      </button>
    </div>
  );
}
