import { useCallback, useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { rankTreeCandidates } from '@/services/treeOptimizer';
import type { Language } from '@/i18n';
import type { MapEngineController, MapEngineKind } from '@/types/map-engine';
import type { RankAreaGeometry, TreeDrawMode, TreeRankCandidate } from '@/types/tree-optimizer';
import type { TreeWizardStep } from '@/components/TreeOptimizerWizard';
import { estimateGeometryAreaKm2, geometryToBounds } from '@/utils/treeArea';
import { getTreeUiMessages } from '@/pages/MapPage/constants';
import type { TreeStateSnapshot } from '@/pages/MapPage/types';

interface UseTreeStateArgs {
  language: Language;
  engine: MapEngineKind;
  rawMapRef: React.RefObject<unknown>;
  controller: MapEngineController;
  isTreeMode: boolean;
  keepState: boolean;
}

export interface UseTreeStateResult extends TreeStateSnapshot {
  treeUi: ReturnType<typeof getTreeUiMessages>;
  setTreeSummerWeight: React.Dispatch<React.SetStateAction<number>>;
  setTreeTopK: React.Dispatch<React.SetStateAction<number>>;
  setTreeMinWinterLight: React.Dispatch<React.SetStateAction<number>>;
  setTreeWizardStep: React.Dispatch<React.SetStateAction<TreeWizardStep>>;
  setTreeDrawMode: React.Dispatch<React.SetStateAction<TreeDrawMode>>;
  setTreeDrawArmed: React.Dispatch<React.SetStateAction<boolean>>;
  setTreeDrawing: React.Dispatch<React.SetStateAction<boolean>>;
  setTreeDraftGeometry: React.Dispatch<React.SetStateAction<RankAreaGeometry | null>>;
  setTreeError: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedTreeCandidate: React.Dispatch<React.SetStateAction<TreeRankCandidate | null>>;
  setTreeCardAnchorPoint: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  setTreeExplanation: React.Dispatch<React.SetStateAction<UseTreeStateResult['treeExplanation']>>;
  setTreeExplainLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setTreeExplainError: React.Dispatch<React.SetStateAction<string | null>>;
  applyTreeAreaGeometry: (geometry: RankAreaGeometry | null) => void;
  handleRunTreeRanking: () => Promise<void>;
  startTreeDrawing: () => void;
  cancelTreeDrawing: () => void;
  clearTreeArea: () => void;
  locateTreeCandidate: (candidate: TreeRankCandidate) => void;
  handleTreeDrawModeChange: (mode: TreeDrawMode) => void;
  continueToSettings: () => void;
  goBackToShape: () => void;
  goBackToSettings: () => void;
}

export function useTreeState({
  language,
  engine,
  rawMapRef,
  controller,
  isTreeMode,
  keepState,
}: UseTreeStateArgs): UseTreeStateResult {
  const treeUi = getTreeUiMessages(language);
  const [treeSummerWeight, setTreeSummerWeight] = useState(0.55);
  const [treeTopK, setTreeTopK] = useState(25);
  const [treeMinWinterLight, setTreeMinWinterLight] = useState(0.3);
  const [treeWizardStep, setTreeWizardStep] = useState<TreeWizardStep>('shape');
  const [treeDrawMode, setTreeDrawMode] = useState<TreeDrawMode>('rectangle');
  const [treeDrawArmed, setTreeDrawArmed] = useState(false);
  const [treeDrawing, setTreeDrawing] = useState(false);
  const [treeAreaGeometry, setTreeAreaGeometry] = useState<RankAreaGeometry | null>(null);
  const [treeDraftGeometry, setTreeDraftGeometry] = useState<RankAreaGeometry | null>(null);
  const [treeAreaKm2, setTreeAreaKm2] = useState<number | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [treeCandidates, setTreeCandidates] = useState<TreeRankCandidate[]>([]);
  const [selectedTreeCandidate, setSelectedTreeCandidate] = useState<TreeRankCandidate | null>(null);
  const [treeCardAnchorPoint, setTreeCardAnchorPoint] = useState<{ x: number; y: number } | null>(null);
  const [treeExplanation, setTreeExplanation] = useState<UseTreeStateResult['treeExplanation']>(null);
  const [treeExplainLoading, setTreeExplainLoading] = useState(false);
  const [treeExplainError, setTreeExplainError] = useState<string | null>(null);

  const applyTreeAreaGeometry = useCallback((geometry: RankAreaGeometry | null) => {
    setTreeAreaGeometry(geometry);
    setTreeAreaKm2(geometry ? estimateGeometryAreaKm2(geometry) : null);
    setTreeCandidates([]);
    setSelectedTreeCandidate(null);
    setTreeExplanation(null);
    setTreeExplainError(null);
    setTreeError(null);
  }, []);

  const handleRunTreeRanking = useCallback(async () => {
    if (!isTreeMode) return;
    if (!treeAreaGeometry) {
      setTreeError(treeUi.areaMissing);
      setTreeWizardStep('shape');
      return;
    }

    setTreeLoading(true);
    setTreeError(null);
    try {
      const ranked = await rankTreeCandidates({
        areaGeometry: treeAreaGeometry,
        areaBounds: geometryToBounds(treeAreaGeometry),
        topK: treeTopK,
        summerWeight: treeSummerWeight,
        minWinterLight: treeMinWinterLight,
      });
      setTreeCandidates(ranked.candidates);
      setSelectedTreeCandidate((prev) => ranked.candidates.find((item) => item.id === prev?.id) ?? null);
      setTreeWizardStep('results');
      if (ranked.candidates.length === 0) {
        setTreeError(treeUi.noCandidates);
      }
    } catch (error) {
      console.error('Tree ranking error:', error);
      setTreeError(treeUi.rankFailed);
      setTreeWizardStep('settings');
      setTreeCandidates([]);
      setSelectedTreeCandidate(null);
    } finally {
      setTreeLoading(false);
    }
  }, [
    isTreeMode,
    treeAreaGeometry,
    treeTopK,
    treeSummerWeight,
    treeMinWinterLight,
    treeUi.areaMissing,
    treeUi.noCandidates,
    treeUi.rankFailed,
  ]);

  const startTreeDrawing = useCallback(() => {
    if (engine !== 'maplibre') {
      setTreeError(treeUi.mapNotReady);
      return;
    }

    const map = rawMapRef.current as maplibregl.Map | null;
    if (!map || !map.loaded()) {
      setTreeError(treeUi.mapNotReady);
      return;
    }

    setTreeError(null);
    setTreeDrawArmed(true);
    setTreeDrawing(false);
    setTreeDraftGeometry(null);
    setTreeWizardStep('drawing');
    setSelectedTreeCandidate(null);
    setTreeExplanation(null);
    setTreeExplainError(null);
  }, [engine, rawMapRef, treeUi.mapNotReady]);

  const cancelTreeDrawing = useCallback(() => {
    setTreeDrawArmed(false);
    setTreeDrawing(false);
    setTreeDraftGeometry(null);
    setSelectedTreeCandidate(null);
    setTreeExplanation(null);
    setTreeExplainError(null);
    setTreeWizardStep('shape');
  }, []);

  const clearTreeArea = useCallback(() => {
    setTreeDrawArmed(false);
    setTreeDrawing(false);
    setTreeDraftGeometry(null);
    applyTreeAreaGeometry(null);
    setTreeWizardStep('shape');
  }, [applyTreeAreaGeometry]);

  const locateTreeCandidate = useCallback((candidate: TreeRankCandidate) => {
    setSelectedTreeCandidate(null);
    setTreeExplanation(null);
    setTreeExplainError(null);
    setTreeCardAnchorPoint(null);

    if (engine === 'maplibre') {
      const map = rawMapRef.current as maplibregl.Map | null;
      if (!map) return;
      map.easeTo({
        center: [candidate.lng, candidate.lat],
        zoom: Math.max(map.getZoom(), 17),
        duration: 900,
      });
      return;
    }

    controller.panTo({ lat: candidate.lat, lng: candidate.lng }, { duration: 1.0 });
  }, [controller, engine, rawMapRef]);

  const handleTreeDrawModeChange = useCallback((mode: TreeDrawMode) => {
    setTreeDrawMode(mode);
    setTreeError(null);
    setTreeDrawArmed(false);
    setTreeDrawing(false);
    setTreeDraftGeometry(null);
  }, []);

  const continueToSettings = useCallback(() => {
    if (!treeAreaGeometry) {
      setTreeError(treeUi.areaMissing);
      return;
    }
    setTreeError(null);
    setTreeWizardStep('settings');
  }, [treeAreaGeometry, treeUi.areaMissing]);

  const goBackToShape = useCallback(() => {
    setTreeError(null);
    setTreeWizardStep('shape');
    setTreeDrawArmed(false);
    setTreeDrawing(false);
    setTreeDraftGeometry(null);
    setSelectedTreeCandidate(null);
    setTreeCardAnchorPoint(null);
    setTreeExplanation(null);
    setTreeExplainError(null);
  }, []);

  const goBackToSettings = useCallback(() => {
    setTreeError(null);
    setTreeWizardStep('settings');
  }, []);

  useEffect(() => {
    if (keepState) return;
    setTreeDrawArmed(false);
    setTreeDrawing(false);
    setTreeDraftGeometry(null);
    setTreeAreaGeometry(null);
    setTreeAreaKm2(null);
    setTreeCandidates([]);
    setSelectedTreeCandidate(null);
    setTreeExplanation(null);
    setTreeExplainError(null);
    setTreeError(null);
    setTreeWizardStep('shape');
  }, [keepState]);

  return {
    treeUi,
    isTreeMode,
    treeSummerWeight,
    treeTopK,
    treeMinWinterLight,
    treeWizardStep,
    treeDrawMode,
    treeDrawArmed,
    treeDrawing,
    treeAreaGeometry,
    treeDraftGeometry,
    treeAreaKm2,
    treeLoading,
    treeError,
    treeCandidates,
    selectedTreeCandidate,
    treeCardAnchorPoint,
    treeExplanation,
    treeExplainLoading,
    treeExplainError,
    setTreeSummerWeight,
    setTreeTopK,
    setTreeMinWinterLight,
    setTreeWizardStep,
    setTreeDrawMode,
    setTreeDrawArmed,
    setTreeDrawing,
    setTreeDraftGeometry,
    setTreeError,
    setSelectedTreeCandidate,
    setTreeCardAnchorPoint,
    setTreeExplanation,
    setTreeExplainLoading,
    setTreeExplainError,
    applyTreeAreaGeometry,
    handleRunTreeRanking,
    startTreeDrawing,
    cancelTreeDrawing,
    clearTreeArea,
    locateTreeCandidate,
    handleTreeDrawModeChange,
    continueToSettings,
    goBackToShape,
    goBackToSettings,
  };
}
