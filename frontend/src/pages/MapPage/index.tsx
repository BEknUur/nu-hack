import { useCallback, useRef, useState } from 'react';
import L from 'leaflet';
import maplibregl from 'maplibre-gl';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDateTime } from '@/hooks/useDateTime';
import { useMapEngine } from '@/hooks/useMapEngine';
import MapView from '@/components/MapView';
import ControlPanel from '@/components/ControlPanel';
import TimeSliderBar from '@/components/TimeSliderBar';
import SunInfoPopup from '@/components/SunInfoPopup';
import SearchBar from '@/components/SearchBar';
import { ScenarioModeNavBar, type ScenarioNavCase } from '@/components/ScenarioModeNavBar';
import TreeCandidateCard from '@/components/TreeCandidateCard';
import ChatSidebar from '@/components/ChatSidebar';
import { useChat } from '@/hooks/useChat';
import {
  useLeafletStaticSunLayer,
  useMapClickSunInfo,
  useMapLibreAoiOverlay,
  useMapLibreBasemapTiles,
  useMapLibreObliqueView,
  useMapLibreSunWallsWorkerVisibility,
  useMapLibreTreeAreaDrawing,
  useMapLibreTreeRankLayer,
  useMapLibreWorkerAreaDrawing,
  useMapLibreWorkerCrew,
  useScenarioRouteResets,
  useSelectedBuildingBestSideHighlight,
  useShadeMapDateAndExposure,
  useTreeCandidateExplanation,
  useTreeCandidateMapAnchor,
  useWorkerShadowSimulation,
} from '@/pages/MapPage/hooks';
import { sideToLabel } from '@/pages/MapPage/mapPageHelpers';
import type {
  ClickInfo,
  GeocodingResult,
  MapBounds,
  RankAreaGeometry,
  SelectedBuilding,
  TreeDrawMode,
  TreeExplainResponse,
  TreeRankCandidate,
  SelectedWorkerInfo,
  TreeWizardStep,
  WorkerExposureStat,
} from '@/pages/MapPage/mapPageTypes';
import { getTreeUiMessages } from '@/pages/MapPage/treeUiMessages';
import { TreeScenarioPanel } from '@/pages/MapPage/TreeScenarioPanel';
import { WorkerScenarioPanel } from '@/pages/MapPage/WorkerScenarioPanel';
import { rankTreeCandidates } from '@/services/treeOptimizer';
import {
  estimateGeometryAreaKm2,
  geometryToBounds,
} from '@/utils/treeArea';
import { useTranslation } from '@/i18n';
export default function MapPage() {
  const { messages, language } = useTranslation();
  const { caseId } = useParams();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = useCallback(async () => {
    await signOut();
    navigate('/auth', { replace: true });
  }, [signOut, navigate]);

  const isTreeMode = caseId === 'trees';
  const isWorkerMode = caseId === 'workers';
  const showScenarioNav =
    caseId === 'apartments' || caseId === 'trees' || caseId === 'workers';
  const scenarioNavActive: ScenarioNavCase =
    caseId === 'trees' || caseId === 'workers' ? caseId : 'apartments';
  const treeUi = getTreeUiMessages(language);
  const dt = useDateTime();
  const [sunExposure, setSunExposure] = useState(false);
  const [is3D, setIs3D] = useState(false);
  const [isSatellite, setIsSatellite] = useState(false);
  const [clickInfo, setClickInfo] = useState<ClickInfo | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<SelectedBuilding | null>(null);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const menuRequestIdRef = useRef(0);
  const staticDatasetLayerRef = useRef<L.GeoJSON | null>(null);
  const sunEdgesLayerRef = useRef<L.LayerGroup | null>(null);
  const selectedBuildingLayerRef = useRef<L.LayerGroup | null>(null);
  const suppressNextMapClickRef = useRef(false);
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
  const [treeExplanation, setTreeExplanation] = useState<TreeExplainResponse | null>(null);
  const [treeExplainLoading, setTreeExplainLoading] = useState(false);
  const [treeExplainError, setTreeExplainError] = useState<string | null>(null);
  const [workerDrawMode, setWorkerDrawMode] = useState<TreeDrawMode>('rectangle');
  const [workerDrawArmed, setWorkerDrawArmed] = useState(false);
  const [workerDrawing, setWorkerDrawing] = useState(false);
  const [workerAreaStep, setWorkerAreaStep] = useState<'shape' | 'drawing'>('shape');
  const [workerAreaGeometry, setWorkerAreaGeometry] = useState<RankAreaGeometry | null>(null);
  const [workerDraftGeometry, setWorkerDraftGeometry] = useState<RankAreaGeometry | null>(null);
  const [workerAreaKm2, setWorkerAreaKm2] = useState<number | null>(null);
  const [workerTaskType, setWorkerTaskType] = useState<'facade_maintenance' | 'road_repair'>('facade_maintenance');
  const [workerSimTick, setWorkerSimTick] = useState(0);
  const [workerSimRunning, setWorkerSimRunning] = useState(false);
  const [workerSimMinute, setWorkerSimMinute] = useState<number>(9 * 60);
  const [workerStats, setWorkerStats] = useState<Record<number, WorkerExposureStat>>({});
  const [workerSimSpeedMs, setWorkerSimSpeedMs] = useState<number>(1400);
  const [selectedWorker, setSelectedWorker] = useState<SelectedWorkerInfo | null>(null);

  const [chatOpen, setChatOpen] = useState(false);
  const chat = useChat({ language });

  const {
    engine,
    containerRef,
    rawMapRef,
    buildingsRef,
    controller,
    shadow,
    zoom,
  } = useMapEngine({
    initialDate: dt.date,
    onLoadingChange: setLoadingBuildings,
  });
  const shadowRef = useRef(shadow);
  const controllerRef = useRef(controller);
  const setSliderRef = useRef(dt.setSlider);
  const dateStrRef = useRef(dt.dateStr);
  shadowRef.current = shadow;
  controllerRef.current = controller;
  setSliderRef.current = dt.setSlider;
  dateStrRef.current = dt.dateStr;

  const { startWorkerSimulation, stopWorkerSimulationTimers } = useWorkerShadowSimulation({
    isWorkerMode,
    workerAreaGeometry,
    workerTaskType,
    workerSimRunning,
    workerSimSpeedMs,
    setWorkerSimRunning,
    setWorkerSimTick,
    setWorkerSimMinute,
    setWorkerStats,
    setSelectedWorker,
    setSunExposure,
    setSlider: dt.setSlider,
    shadowRef,
    controllerRef,
    setSliderRef,
    dateStrRef,
    buildingsRef,
  });

  const handleRunTreeRanking = useCallback(async () => {
    if (!isTreeMode) return;
    if (!treeAreaGeometry) {
      setTreeError(treeUi.areaMissing);
      setTreeWizardStep('shape');
      return;
    }

    const bounds = geometryToBounds(treeAreaGeometry);

    setTreeLoading(true);
    setTreeError(null);
    try {
      const ranked = await rankTreeCandidates({
        areaGeometry: treeAreaGeometry,
        areaBounds: bounds,
        topK: treeTopK,
        summerWeight: treeSummerWeight,
        minWinterLight: treeMinWinterLight,
      });
      setTreeCandidates(ranked.candidates);
      setSelectedTreeCandidate((prev) => {
        if (!prev) return null;
        return ranked.candidates.find((item) => item.id === prev.id) ?? null;
      });
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
  }, [isTreeMode, treeAreaGeometry, treeMinWinterLight, treeSummerWeight, treeTopK, treeUi.areaMissing, treeUi.noCandidates, treeUi.rankFailed]);

  const applyTreeAreaGeometry = useCallback((geometry: RankAreaGeometry | null) => {
    setTreeAreaGeometry(geometry);
    setTreeAreaKm2(geometry ? estimateGeometryAreaKm2(geometry) : null);
    setTreeCandidates([]);
    setSelectedTreeCandidate(null);
    setTreeExplanation(null);
    setTreeExplainError(null);
    setTreeError(null);
  }, []);

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

  const startWorkerDrawing = useCallback(() => {
    if (engine !== 'maplibre') return;
    const map = rawMapRef.current as maplibregl.Map | null;
    if (!map || !map.loaded()) return;

    setWorkerDrawArmed(true);
    setWorkerDrawing(false);
    setWorkerDraftGeometry(null);
    setWorkerAreaStep('drawing');
  }, [engine, rawMapRef]);

  const cancelWorkerDrawing = useCallback(() => {
    setWorkerDrawArmed(false);
    setWorkerDrawing(false);
    setWorkerDraftGeometry(null);
    setWorkerAreaStep('shape');
  }, []);

  const clearWorkerArea = useCallback(() => {
    setWorkerDrawArmed(false);
    setWorkerDrawing(false);
    setWorkerDraftGeometry(null);
    setWorkerAreaGeometry(null);
    setWorkerAreaKm2(null);
    setWorkerAreaStep('shape');
  }, []);

  const locateTreeCandidate = useCallback((candidate: TreeRankCandidate) => {
    setSelectedTreeCandidate(null);
    setTreeExplanation(null);
    setTreeExplainError(null);
    setTreeCardAnchorPoint(null);

    if (engine === 'maplibre') {
      const map = rawMapRef.current as maplibregl.Map | null;
      if (!map) return;
      const targetZoom = Math.max(map.getZoom(), 17);
      map.easeTo({
        center: [candidate.lng, candidate.lat],
        zoom: targetZoom,
        duration: 900,
      });
      return;
    }

    controller.panTo(
      { lat: candidate.lat, lng: candidate.lng },
      { duration: 1.0 },
    );
  }, [controller, engine, rawMapRef]);

  useTreeCandidateMapAnchor({
    engine,
    rawMapRef,
    isTreeMode,
    selectedTreeCandidate,
    controller,
    setTreeCardAnchorPoint,
  });

  useScenarioRouteResets({
    isTreeMode,
    isWorkerMode,
    stopWorkerSimulationTimers,
    setTreeDrawArmed,
    setTreeDrawing,
    setTreeDraftGeometry,
    setTreeAreaGeometry,
    setTreeAreaKm2,
    setTreeCandidates,
    setSelectedTreeCandidate,
    setTreeExplanation,
    setTreeExplainError,
    setTreeError,
    setTreeWizardStep,
    setWorkerSimRunning,
    setWorkerSimMinute,
    setWorkerStats,
    setSelectedWorker,
    setWorkerDrawMode,
    setWorkerDrawArmed,
    setWorkerDrawing,
    setWorkerAreaStep,
    setWorkerDraftGeometry,
    setWorkerAreaGeometry,
    setWorkerAreaKm2,
    setWorkerTaskType,
  });

  useMapLibreAoiOverlay({
    engine,
    rawMapRef,
    isTreeMode,
    isWorkerMode,
    treeAreaGeometry,
    treeDraftGeometry,
    treeDrawMode,
    workerAreaGeometry,
    workerDraftGeometry,
    workerDrawMode,
  });

  useMapLibreTreeAreaDrawing({
    engine,
    enabled: isTreeMode && treeDrawArmed,
    rawMapRef,
    drawMode: treeDrawMode,
    applyTreeAreaGeometry,
    areaMissingMessage: treeUi.areaMissing,
    setTreeDrawing,
    setTreeDraftGeometry,
    setTreeExplainError,
    setTreeError,
    setTreeDrawArmed,
    setTreeWizardStep,
  });

  useMapLibreWorkerAreaDrawing({
    engine,
    enabled: isWorkerMode && workerDrawArmed,
    rawMapRef,
    drawMode: workerDrawMode,
    setWorkerDrawing,
    setWorkerDraftGeometry,
    setWorkerAreaGeometry,
    setWorkerAreaKm2,
    setWorkerDrawArmed,
    setWorkerAreaStep,
  });

  useMapLibreTreeRankLayer({
    engine,
    rawMapRef,
    isTreeMode,
    treeCandidates,
    selectedTreeCandidate,
    treeDrawArmed,
    treeDrawing,
    setSelectedTreeCandidate,
    setClickInfo,
    setSelectedBuilding,
  });

  useMapLibreWorkerCrew({
    engine,
    rawMapRef,
    buildingsRef,
    isWorkerMode,
    loadingBuildings,
    workerAreaGeometry,
    workerTaskType,
    workerSimTick,
    zoom,
    selectedWorker,
    workerStats,
    setSelectedWorker,
  });

  useMapLibreSunWallsWorkerVisibility({ engine, rawMapRef, isWorkerMode });

  useTreeCandidateExplanation({
    isTreeMode,
    selectedTreeCandidate,
    language,
    treeSummerWeight,
    explainFailed: treeUi.explainFailed,
    setTreeExplanation,
    setTreeExplainError,
    setTreeExplainLoading,
  });

  useMapLibreObliqueView({ engine, rawMapRef, is3D, setIs3D });

  useMapLibreBasemapTiles({ engine, rawMapRef, isSatellite });

  useShadeMapDateAndExposure({
    date: dt.date,
    dateStr: dt.dateStr,
    sunExposure,
    shadow,
    controller,
    isTreeMode,
    isWorkerMode,
  });

  useMapClickSunInfo({
    shadow,
    controller,
    buildingsRef,
    menuRequestIdRef,
    suppressNextMapClickRef,
    isTreeMode,
    isWorkerMode,
    workerDrawArmed,
    workerDrawing,
    dateStr: dt.dateStr,
    setSelectedBuilding,
    setClickInfo,
  });

  useSelectedBuildingBestSideHighlight({
    engine,
    rawMapRef,
    selectedBuilding,
    predictedBestSide: clickInfo?.predictedBestSide,
    selectedBuildingLayerRef,
  });

  useLeafletStaticSunLayer({
    engine,
    rawMapRef,
    staticDatasetLayerRef,
    sunEdgesLayerRef,
    suppressNextMapClickRef,
    setClickInfo,
  });

  // Search result → fly to location
  function handleSearchSelect(result: GeocodingResult) {
    const [south, north, west, east] = result.boundingBox;
    const bounds: MapBounds = { south, north, west, east };
    controller.flyToBounds(bounds, { duration: 1.2, padding: [40, 40] });
  }

  function handleTimeSliderChange(value: number) {
    if (sunExposure) {
      setSunExposure(false);
    }
    dt.setSlider(value);
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <MapView containerRef={containerRef} />

      {showScenarioNav && (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-[1000] flex justify-end px-4 md:justify-center">
          <ScenarioModeNavBar active={scenarioNavActive} className="pointer-events-auto" />
        </div>
      )}

      <SearchBar onSelect={handleSearchSelect} />

      {/* User badge + logout — hidden on apartments / trees / workers (nav bar covers top area) */}
      {!showScenarioNav && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
          {user && (
            <span className="text-xs text-white/40 hidden sm:block">{user.email}</span>
          )}
          <button
            onClick={handleSignOut}
            className="text-xs text-white/50 hover:text-white/80 transition px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Выйти
          </button>
        </div>
      )}

      {!isTreeMode && !isWorkerMode && clickInfo?.predictedBestSide && clickInfo.screenX != null && clickInfo.screenY != null && (
        <div
          className="pointer-events-none absolute z-[990] -translate-x-1/2 -translate-y-full rounded-lg border border-[color:rgba(198,138,17,0.24)] bg-[rgba(251,248,241,0.96)] px-3 py-2 text-[11px] font-medium text-[var(--yellow-strong)] shadow-[0_10px_20px_rgba(23,32,51,0.12)] backdrop-blur-md"
          style={{
            left: `${clickInfo.screenX}px`,
            top: `${clickInfo.screenY - 12}px`,
          }}
        >
          {sideToLabel(clickInfo.predictedBestSide, {
            north: messages.map.north,
            east: messages.map.east,
            south: messages.map.south,
            west: messages.map.west,
          }) ?? clickInfo.predictedBestSide}
          {clickInfo.predictedConfidence !== null && clickInfo.predictedConfidence !== undefined && (
            <span className="ml-2 ui-mono text-[var(--ink-soft)]">
              {Math.round(clickInfo.predictedConfidence * 100)}%
            </span>
          )}
        </div>
      )}

      {!isTreeMode && !isWorkerMode && (
        <ControlPanel
          dateStr={dt.dateStr}
          onDateChange={dt.setDateStr}
          sunExposure={sunExposure}
          onModeChange={setSunExposure}
          is3D={is3D}
          onViewModeChange={setIs3D}
          isSatellite={isSatellite}
          onBasemapChange={engine === 'maplibre' ? setIsSatellite : undefined}
        />
      )}

      {isTreeMode && (
        <TreeScenarioPanel
          step={treeWizardStep}
          drawMode={treeDrawMode}
          drawingInProgress={treeDrawing}
          hasArea={Boolean(treeAreaGeometry)}
          areaKm2={treeAreaKm2}
          summerWeight={treeSummerWeight}
          topK={treeTopK}
          minWinterLight={treeMinWinterLight}
          loading={treeLoading}
          error={treeError}
          resultCount={treeCandidates.length}
          topCandidates={treeCandidates}
          onLocateCandidate={locateTreeCandidate}
          onDrawModeChange={(mode) => {
            setTreeDrawMode(mode);
            setTreeError(null);
            setTreeDrawArmed(false);
            setTreeDrawing(false);
            setTreeDraftGeometry(null);
          }}
          onStartDrawing={startTreeDrawing}
          onCancelDrawing={cancelTreeDrawing}
          onContinueToSettings={() => {
            if (!treeAreaGeometry) {
              setTreeError(treeUi.areaMissing);
              return;
            }
            setTreeError(null);
            setTreeWizardStep('settings');
          }}
          onClearArea={clearTreeArea}
          onSummerWeightChange={setTreeSummerWeight}
          onTopKChange={setTreeTopK}
          onMinWinterLightChange={setTreeMinWinterLight}
          onRunRanking={() => {
            void handleRunTreeRanking();
          }}
          onBackToShape={() => {
            setTreeError(null);
            setTreeWizardStep('shape');
            setTreeDrawArmed(false);
            setTreeDrawing(false);
            setTreeDraftGeometry(null);
            setSelectedTreeCandidate(null);
            setTreeCardAnchorPoint(null);
            setTreeExplanation(null);
            setTreeExplainError(null);
          }}
          onBackToSettings={() => {
            setTreeError(null);
            setTreeWizardStep('settings');
          }}
        />
      )}

      {isWorkerMode && (
        <WorkerScenarioPanel
          language={language}
          workerDrawMode={workerDrawMode}
          onWorkerDrawModeChange={(mode) => {
            setWorkerDrawMode(mode);
            setWorkerDrawArmed(false);
            setWorkerDrawing(false);
            setWorkerDraftGeometry(null);
          }}
          workerAreaStep={workerAreaStep}
          workerDrawing={workerDrawing}
          workerAreaGeometry={workerAreaGeometry}
          workerAreaKm2={workerAreaKm2}
          workerTaskType={workerTaskType}
          onWorkerTaskTypeChange={setWorkerTaskType}
          workerSimRunning={workerSimRunning}
          workerSimMinute={workerSimMinute}
          workerSimSpeedMs={workerSimSpeedMs}
          onWorkerSimSpeedMsChange={setWorkerSimSpeedMs}
          onStartAreaDrawing={startWorkerDrawing}
          onCancelAreaDrawing={cancelWorkerDrawing}
          onClearWorkerArea={clearWorkerArea}
          onStartSimulation={startWorkerSimulation}
        />
      )}

      {!isTreeMode && (
        <TimeSliderBar
          sliderValue={dt.sliderValue}
          sliderPct={dt.sliderPct}
          timeLabel={dt.timeLabel}
          onSliderChange={handleTimeSliderChange}
        />
      )}

      {!isTreeMode && !isWorkerMode && clickInfo && (
        <SunInfoPopup
          info={clickInfo}
          onClose={() => {
            setClickInfo(null);
            setSelectedBuilding(null);
          }}
        />
      )}

      {isTreeMode && selectedTreeCandidate && (
        <TreeCandidateCard
          candidate={selectedTreeCandidate}
          explanation={treeExplanation}
          explanationLoading={treeExplainLoading}
          explanationError={treeExplainError}
          anchorPoint={treeCardAnchorPoint}
          onClose={() => {
            setSelectedTreeCandidate(null);
            setTreeCardAnchorPoint(null);
            setTreeExplanation(null);
            setTreeExplainError(null);
          }}
        />
      )}

      <ChatSidebar
        isOpen={chatOpen}
        onToggle={() => setChatOpen((v) => !v)}
        messages={chat.messages}
        suggestions={chat.suggestions}
        isLoading={chat.isLoading}
        isRecording={chat.isRecording}
        isTranscribing={chat.isTranscribing}
        onSendMessage={(text) => void chat.sendMessage(text)}
        onStartRecording={chat.startRecording}
        onStopRecording={() => void chat.stopRecording()}
        onSuggestionClick={(text) => void chat.sendMessage(text)}
        language={language}
      />
    </div>
  );
}
