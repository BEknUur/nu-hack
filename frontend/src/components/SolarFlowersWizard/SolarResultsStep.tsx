import type { SolarCandidate } from '@/types/solar-flowers';
import type { SolarWizardCopy } from '@/components/SolarFlowersWizard/copy';
import { SolarResultsSummary } from '@/components/SolarFlowersWizard/SolarResultsSummary';
import { SolarSelectedCandidatePanel } from '@/components/SolarFlowersWizard/SolarSelectedCandidatePanel';

interface SolarResultsStepProps {
  candidates: SolarCandidate[];
  selectedCandidate: SolarCandidate | null;
  copy: SolarWizardCopy;
  showPoints: boolean;
  onTogglePoints: () => void;
  onRunRanking: () => void;
  onBackToShape: () => void;
  onCloseCandidate: () => void;
}

export function SolarResultsStep({
  candidates,
  selectedCandidate,
  copy,
  showPoints,
  onTogglePoints,
  onRunRanking,
  onBackToShape,
  onCloseCandidate,
}: SolarResultsStepProps) {
  return (
    <div className="space-y-3">
      <SolarResultsSummary
        candidates={candidates}
        copy={copy}
        showPoints={showPoints}
        onTogglePoints={onTogglePoints}
        onRunRanking={onRunRanking}
        onBackToShape={onBackToShape}
      />

      {selectedCandidate && (
        <SolarSelectedCandidatePanel
          candidate={selectedCandidate}
          copy={copy}
          onClose={onCloseCandidate}
        />
      )}
    </div>
  );
}
