import type { SolarCandidate } from '@/types/solar-flowers';
import type { SolarWizardCopy } from '@/components/SolarFlowersWizard/copy';

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
    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 space-y-2">
      <div className="text-sm font-medium text-[var(--ink)]">{copy.resultsTitle}</div>

      {candidates.length > 0 ? (
        <>
          <div className="flex items-center gap-2 rounded-lg px-3 py-1.5 border border-[var(--line)] bg-[rgba(240,194,76,0.06)]">
            <span className="font-mono text-[11px] text-[var(--yellow-strong)]">
              {copy.foundLabel(candidates.length)}
            </span>
          </div>
          <p className="text-[11px] text-[var(--ink-soft)] leading-snug">{copy.resultsHint}</p>

          <div className="space-y-1.5 pt-1">
            {candidates.slice(0, 3).map((candidate) => (
              <div
                key={candidate.id}
                className="flex items-center justify-between rounded-lg px-3 py-2 border border-[var(--line)] bg-[var(--surface)]"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] flex-shrink-0 text-[var(--yellow-strong)]">
                    #{candidate.rank}
                  </span>
                  <div>
                    <div className="text-[11px] text-[var(--ink)] font-medium">
                      {copy.scoreLabel} {candidate.score}
                    </div>
                    <div className="text-[10px] text-[var(--ink-soft)]">{candidate.kwhPerYearEst} {copy.kwhLabel}</div>
                  </div>
                </div>
                <div
                  className="h-6 w-6 rounded-full"
                  style={{ background: `conic-gradient(var(--yellow) ${candidate.score}%, var(--line) 0)` }}
                />
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-[12px] text-[var(--ink-soft)] leading-snug">{copy.noResults}</p>
      )}

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={onRunRanking}
          className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-[#06080f] bg-[var(--yellow)] transition-all"
        >
          {copy.rerunBtn}
        </button>
        <button
          type="button"
          onClick={onBackToShape}
          className="flex items-center justify-center rounded-lg px-3 py-2 text-xs font-medium text-[var(--ink-soft)] border border-[var(--line)] transition-all hover:text-[var(--ink)]"
        >
          {copy.newAreaBtn}
        </button>
      </div>

      <button
        type="button"
        onClick={onTogglePoints}
        className="w-full rounded-lg px-3 py-2 text-xs font-medium text-[var(--ink)] transition-all border border-[var(--line)] hover:border-[var(--yellow)]"
        style={{ background: showPoints ? 'rgba(240,194,76,0.1)' : 'transparent' }}
      >
        {showPoints ? copy.hidePointsBtn : copy.showPointsBtn}
      </button>
    </div>
  );
}
