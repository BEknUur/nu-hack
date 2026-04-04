import { useCallback, useEffect, useState } from 'react';
import { estimateGeometryAreaKm2 } from '@/utils/treeArea';
import { rankSolarCandidates } from '@/services/solarOptimizer';
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
  solarShowPoints: boolean;
  solarLoading: boolean;
  solarError: string | null;
  solarCandidates: SolarCandidate[];
  selectedSolarCandidate: SolarCandidate | null;
  solarCardAnchorPoint: { x: number; y: number } | null;

  setSolarWizardStep: React.Dispatch<React.SetStateAction<SolarWizardStep>>;
  setSolarDrawMode: React.Dispatch<React.SetStateAction<SolarDrawMode>>;
  setSolarDrawArmed: React.Dispatch<React.SetStateAction<boolean>>;
  setSolarDrawing: React.Dispatch<React.SetStateAction<boolean>>;
  setSolarDraftGeometry: React.Dispatch<React.SetStateAction<RankAreaGeometry | null>>;
  setSolarPanelType: React.Dispatch<React.SetStateAction<SolarPanelType>>;
  setSolarTarget: React.Dispatch<React.SetStateAction<SolarOptimizationTarget>>;
  setSolarTopK: React.Dispatch<React.SetStateAction<number>>;
  setSolarShowPoints: React.Dispatch<React.SetStateAction<boolean>>;
  setSolarError: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedSolarCandidate: React.Dispatch<React.SetStateAction<SolarCandidate | null>>;
  setSolarCardAnchorPoint: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;

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
  const [solarShowPoints, setSolarShowPoints] = useState(true);
  const [solarLoading, setSolarLoading] = useState(false);
  const [solarError, setSolarError] = useState<string | null>(null);
  const [solarCandidates, setSolarCandidates] = useState<SolarCandidate[]>([]);
  const [selectedSolarCandidate, setSelectedSolarCandidate] = useState<SolarCandidate | null>(null);
  const [solarCardAnchorPoint, setSolarCardAnchorPoint] = useState<{ x: number; y: number } | null>(null);

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
    setSolarShowPoints(true);
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
    setSolarShowPoints(true);
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

    rankSolarCandidates({
      areaGeometry: solarAreaGeometry,
      topK: solarTopK,
      optimizationTarget: solarTarget,
      panelType: solarPanelType,
    })
      .then((candidates) => {
        if (candidates.length === 0) {
          setSolarError('No candidates found in this area. Try a larger area or different settings.');
          setSolarWizardStep('settings');
        } else {
          setSolarCandidates(candidates);
          setSolarShowPoints(true);
          setSolarWizardStep('results');
        }
      })
      .catch(() => {
        try {
          const fallback = generateSolarCandidates(
            solarAreaGeometry,
            solarTopK,
            solarTarget,
          );
          if (fallback.length === 0) {
            setSolarError('No candidates found in this area. Try a larger area or different settings.');
            setSolarWizardStep('settings');
            return;
          }
          setSolarCandidates(fallback);
          setSolarShowPoints(true);
          setSolarWizardStep('results');
          setSolarError('Backend unavailable, showing local estimation.');
        } catch {
          setSolarError('Backend unavailable. Please start the backend server and try again.');
          setSolarWizardStep('settings');
        }
      })
      .finally(() => {
        setSolarLoading(false);
      });
  }, [solarAreaGeometry, solarTopK, solarTarget, solarPanelType]);

  // Reset when leaving solar mode
  useEffect(() => {
    if (isSolarMode) return;
    const timerId = window.setTimeout(() => {
      setSolarWizardStep('shape');
      setSolarDrawArmed(false);
      setSolarDrawing(false);
      setSolarAreaGeometry(null);
      setSolarDraftGeometry(null);
      setSolarAreaKm2(null);
      setSolarShowPoints(true);
      setSolarCandidates([]);
      setSelectedSolarCandidate(null);
      setSolarCardAnchorPoint(null);
      setSolarError(null);
    }, 0);
    return () => {
      window.clearTimeout(timerId);
    };
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
    solarShowPoints,
    solarLoading,
    solarError,
    solarCandidates,
    selectedSolarCandidate,
    solarCardAnchorPoint,

    setSolarWizardStep,
    setSolarDrawMode,
    setSolarDrawArmed,
    setSolarDrawing,
    setSolarDraftGeometry,
    setSolarPanelType,
    setSolarTarget,
    setSolarTopK,
    setSolarShowPoints,
    setSolarError,
    setSelectedSolarCandidate,
    setSolarCardAnchorPoint,

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
