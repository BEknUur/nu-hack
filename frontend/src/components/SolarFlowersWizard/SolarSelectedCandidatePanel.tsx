import type { SolarCandidate } from '@/types/solar-flowers';
import type { SolarWizardCopy } from '@/components/SolarFlowersWizard/copy';
import {
  ACCENT_BORDER,
  DARK_CARD,
  ORANGE,
} from '@/components/SolarFlowersWizard/styles';

function FactorBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] text-white/40">{label}</span>
        <span className="text-[11px] text-white/55 tabular-nums">{value}</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, background: `linear-gradient(90deg, #c2620a, ${ORANGE})` }}
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
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: DARK_CARD, border: `1px solid ${ACCENT_BORDER}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-mono text-[10px] text-white/30">Candidate #{candidate.rank}</span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl font-bold text-white">{candidate.score}</span>
            <span className="text-xs text-white/35">{copy.scoreLabel.toLowerCase()}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-white/30">{copy.kwhLabel}</div>
          <div className="font-mono text-sm" style={{ color: ORANGE }}>
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
        className="w-full text-center text-[11px] text-white/25 hover:text-white/45 transition-colors py-1"
      >
        ✕ close
      </button>
    </div>
  );
}
