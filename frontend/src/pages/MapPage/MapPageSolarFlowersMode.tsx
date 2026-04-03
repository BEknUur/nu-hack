import SolarFlowersWizard from '@/components/SolarFlowersWizard';
import type { UseSolarFlowersStateResult } from '@/pages/MapPage/useSolarFlowersState';
import type { Language } from '@/i18n';

interface MapPageSolarFlowersModeProps {
  visible: boolean;
  solar: UseSolarFlowersStateResult;
  language: Language;
}

export function MapPageSolarFlowersMode({
  visible,
  solar,
  language,
}: MapPageSolarFlowersModeProps) {
  if (!visible) return null;

  return (
    <SolarFlowersWizard
      step={solar.solarWizardStep}
      drawMode={solar.solarDrawMode}
      drawingInProgress={solar.solarDrawing}
      hasArea={Boolean(solar.solarAreaGeometry)}
      areaKm2={solar.solarAreaKm2}
      panelType={solar.solarPanelType}
      target={solar.solarTarget}
      topK={solar.solarTopK}
      loading={solar.solarLoading}
      error={solar.solarError}
      candidates={solar.solarCandidates}
      selectedCandidate={solar.selectedSolarCandidate}
      language={language}
      onDrawModeChange={solar.handleSolarDrawModeChange}
      onStartDrawing={solar.startSolarDrawing}
      onCancelDrawing={solar.cancelSolarDrawing}
      onContinueToSettings={solar.continueToSettings}
      onClearArea={solar.clearSolarArea}
      onPanelTypeChange={solar.setSolarPanelType}
      onTargetChange={solar.setSolarTarget}
      onTopKChange={solar.setSolarTopK}
      onRunRanking={solar.handleRunSolarRanking}
      onBackToShape={solar.goBackToShape}
      onCloseCandidate={() => solar.setSelectedSolarCandidate(null)}
    />
  );
}
