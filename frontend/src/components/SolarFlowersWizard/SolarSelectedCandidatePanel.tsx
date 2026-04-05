import type { SolarCandidate } from '@/types/solar-flowers';
import type { SolarWizardCopy } from '@/components/SolarFlowersWizard/copy';

function FactorBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] text-[var(--ink-soft)]">{label}</span>
        <span className="text-[11px] text-[var(--ink)] tabular-nums">{value}</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden bg-[var(--line)]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, background: 'linear-gradient(90deg, var(--yellow-strong), var(--yellow))' }}
        />
      </div>
    </div>
  );
}

interface SolarSelectedCandidatePanelProps {
  candidate: SolarCandidate;
  copy: SolarWizardCopy;
  onClose: () => void;
}

export function SolarSelectedCandidatePanel({
  candidate,
  copy,
  onClose,
}: SolarSelectedCandidatePanelProps) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-mono text-[10px] text-[var(--ink-soft)]">Candidate #{candidate.rank}</span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl font-bold text-[var(--ink)]">{candidate.score}</span>
            <span className="text-xs text-[var(--ink-soft)]">{copy.scoreLabel.toLowerCase()}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-[var(--ink-soft)]">{copy.kwhLabel}</div>
          <div className="font-mono text-sm text-[var(--yellow-strong)]">
            {candidate.kwhPerYearEst.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <FactorBar label={copy.annualFactor} value={candidate.factors.annual_irradiance} />
        <FactorBar label={copy.winterFactor} value={candidate.factors.winter_irradiance} />
        <FactorBar label={copy.shadingFactor} value={candidate.factors.shading_risk} />
        <FactorBar label={copy.slopeLabel} value={candidate.factors.slope_suitability} />
        <FactorBar label={copy.accessLabel} value={candidate.factors.access_score} />
      </div>

      <button
        type="button"
        onClick={onClose}
        className="w-full text-center text-[11px] text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors py-1"
      >
        ✕ close
      </button>
    </div>
  );
}
