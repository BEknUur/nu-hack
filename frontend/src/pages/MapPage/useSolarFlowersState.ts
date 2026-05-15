import { useCallback, useEffect, useState } from 'react';
import { estimateGeometryAreaKm2 } from '@/utils/treeArea';
import { generateSolarCandidates } from '@/utils/solarCandidates';
import type { RankAreaGeometry } from '@/types/tree-optimizer';
import type {
  SolarCandidate,
  SolarDrawMode,
  SolarOptimizationTarget,
  SolarPanelType,
  SolarWizardStep,
} from '@/types/solar-flowers';

interface UseSolarFlowersStateArgs {
  isSolarMode: boolean;
}

export interface UseSolarFlowersStateResult {
  isSolarMode: boolean;
  solarWizardStep: SolarWizardStep;
  solarDrawMode: SolarDrawMode;
  solarDrawArmed: boolean;
  solarDrawing: boolean;
  solarAreaGeometry: RankAreaGeometry | null;
  solarDraftGeometry: RankAreaGeometry | null;
  solarAreaKm2: number | null;
  solarPanelType: SolarPanelType;
  solarTarget: SolarOptimizationTarget;
  solarTopK: number;
  solarLoading: boolean;
  solarError: string | null;
  solarCandidates: SolarCandidate[];
  selectedSolarCandidate: SolarCandidate | null;

  setSolarWizardStep: React.Dispatch<React.SetStateAction<SolarWizardStep>>;
  setSolarDrawMode: React.Dispatch<React.SetStateAction<SolarDrawMode>>;
  setSolarDrawArmed: React.Dispatch<React.SetStateAction<boolean>>;
  setSolarDrawing: React.Dispatch<React.SetStateAction<boolean>>;
  setSolarDraftGeometry: React.Dispatch<React.SetStateAction<RankAreaGeometry | null>>;
  setSolarPanelType: React.Dispatch<React.SetStateAction<SolarPanelType>>;
  setSolarTarget: React.Dispatch<React.SetStateAction<SolarOptimizationTarget>>;
  setSolarTopK: React.Dispatch<React.SetStateAction<number>>;
  setSolarError: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedSolarCandidate: React.Dispatch<React.SetStateAction<SolarCandidate | null>>;

  applySolarAreaGeometry: (geometry: RankAreaGeometry | null) => void;
  handleSolarDrawModeChange: (mode: SolarDrawMode) => void;
  startSolarDrawing: () => void;
  cancelSolarDrawing: () => void;
  clearSolarArea: () => void;
  continueToSettings: () => void;
  goBackToShape: () => void;
  handleRunSolarRanking: () => void;
}

export function useSolarFlowersState({
  isSolarMode,
}: UseSolarFlowersStateArgs): UseSolarFlowersStateResult {
  const [solarWizardStep, setSolarWizardStep] = useState<SolarWizardStep>('shape');
  const [solarDrawMode, setSolarDrawMode] = useState<SolarDrawMode>('rectangle');
  const [solarDrawArmed, setSolarDrawArmed] = useState(false);
  const [solarDrawing, setSolarDrawing] = useState(false);
  const [solarAreaGeometry, setSolarAreaGeometry] = useState<RankAreaGeometry | null>(null);
  const [solarDraftGeometry, setSolarDraftGeometry] = useState<RankAreaGeometry | null>(null);
  const [solarAreaKm2, setSolarAreaKm2] = useState<number | null>(null);
  const [solarPanelType, setSolarPanelType] = useState<SolarPanelType>('solar_flower');
  const [solarTarget, setSolarTarget] = useState<SolarOptimizationTarget>('balanced');
  const [solarTopK, setSolarTopK] = useState(20);
  const [solarLoading, setSolarLoading] = useState(false);
  const [solarError, setSolarError] = useState<string | null>(null);
  const [solarCandidates, setSolarCandidates] = useState<SolarCandidate[]>([]);
  const [selectedSolarCandidate, setSelectedSolarCandidate] = useState<SolarCandidate | null>(null);

  const applySolarAreaGeometry = useCallback((geometry: RankAreaGeometry | null) => {
    setSolarAreaGeometry(geometry);
    setSolarAreaKm2(geometry ? estimateGeometryAreaKm2(geometry) : null);
  }, []);

  const handleSolarDrawModeChange = useCallback((mode: SolarDrawMode) => {
    setSolarDrawMode(mode);
    setSolarDraftGeometry(null);
  }, []);

  const startSolarDrawing = useCallback(() => {
    setSolarDrawArmed(true);
    setSolarWizardStep('drawing');
    setSolarDraftGeometry(null);
    setSolarError(null);
  }, []);

  const cancelSolarDrawing = useCallback(() => {
    setSolarDrawArmed(false);
    setSolarDrawing(false);
    setSolarDraftGeometry(null);
    setSolarWizardStep('shape');
  }, []);

  const clearSolarArea = useCallback(() => {
    applySolarAreaGeometry(null);
    setSolarDraftGeometry(null);
    setSolarCandidates([]);
    setSelectedSolarCandidate(null);
    setSolarError(null);
    setSolarWizardStep('shape');
  }, [applySolarAreaGeometry]);

  const continueToSettings = useCallback(() => {
    if (!solarAreaGeometry) return;
    setSolarWizardStep('settings');
  }, [solarAreaGeometry]);

  const goBackToShape = useCallback(() => {
    setSolarWizardStep('shape');
    setSolarCandidates([]);
    setSelectedSolarCandidate(null);
    setSolarError(null);
  }, []);

  const handleRunSolarRanking = useCallback(() => {
    if (!solarAreaGeometry) {
      setSolarError('Select an area on the map first.');
      return;
    }
    setSolarLoading(true);
    setSolarError(null);
    setSolarCandidates([]);
    setSelectedSolarCandidate(null);

    // Run client-side generation asynchronously so the UI can show loading state
    setTimeout(() => {
      try {
        const candidates = generateSolarCandidates(
          solarAreaGeometry,
          solarTopK,
          solarTarget,
        );
        if (candidates.length === 0) {
          setSolarError('No candidates found in this area. Try a larger area or different settings.');
          setSolarWizardStep('settings');
        } else {
          setSolarCandidates(candidates);
          setSolarWizardStep('results');
        }
      } catch {
        setSolarError('Failed to generate solar candidates. Please try again.');
      } finally {
        setSolarLoading(false);
      }
    }, 600);
  }, [solarAreaGeometry, solarTopK, solarTarget]);

  // Reset when leaving solar mode
  useEffect(() => {
    if (isSolarMode) return;
    setSolarWizardStep('shape');
    setSolarDrawArmed(false);
    setSolarDrawing(false);
    setSolarAreaGeometry(null);
    setSolarDraftGeometry(null);
    setSolarAreaKm2(null);
    setSolarCandidates([]);
    setSelectedSolarCandidate(null);
    setSolarError(null);
  }, [isSolarMode]);

  return {
    isSolarMode,
    solarWizardStep,
    solarDrawMode,
    solarDrawArmed,
    solarDrawing,
    solarAreaGeometry,
    solarDraftGeometry,
    solarAreaKm2,
    solarPanelType,
    solarTarget,
    solarTopK,
    solarLoading,
    solarError,
    solarCandidates,
    selectedSolarCandidate,

    setSolarWizardStep,
    setSolarDrawMode,
    setSolarDrawArmed,
    setSolarDrawing,
    setSolarDraftGeometry,
    setSolarPanelType,
    setSolarTarget,
    setSolarTopK,
    setSolarError,
    setSelectedSolarCandidate,

    applySolarAreaGeometry,
    handleSolarDrawModeChange,
    startSolarDrawing,
    cancelSolarDrawing,
    clearSolarArea,
    continueToSettings,
    goBackToShape,
    handleRunSolarRanking,
  };
}
