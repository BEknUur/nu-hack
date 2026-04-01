import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import maplibregl from 'maplibre-gl';
import { useParams } from 'react-router-dom';
import { SUN_EXPOSURE_CONFIG } from '@/config/map';
import { useDateTime } from '@/hooks/useDateTime';
import { useMapEngine } from '@/hooks/useMapEngine';
import { astanaLocalToDate } from '@/utils/astanaTime';
import type { ClickInfo } from '@/types/map';
import type { GeocodingResult } from '@/services/geocoding';
import { getBuildingMetadata } from '@/services/buildingDetails';
import { predictBestSide } from '@/services/bestSidePrediction';
import MapView from '@/components/MapView';
import ControlPanel from '@/components/ControlPanel';
import TimeSliderBar from '@/components/TimeSliderBar';
import SunInfoPopup from '@/components/SunInfoPopup';
import SearchBar from '@/components/SearchBar';
import TreeCandidateCard from '@/components/TreeCandidateCard';
import TreeOptimizerWizard, { type TreeWizardStep } from '@/components/TreeOptimizerWizard';
import SolarFlowersWizard, { type SolarWizardStep } from '@/components/SolarFlowersWizard';
import SolarFlowersCandidateCard from '@/components/SolarFlowersCandidateCard';
import { findBuildingAtPoint } from '@/utils/buildings';
import type { SelectedBuilding } from '@/types/building';
import type { MapBounds, MapPoint } from '@/types/map-engine';
import { setupLeafletStaticLayer } from '@/pages/MapPage/leafletStaticLayer';
import { renderLeafletSelectedBuildingLayer } from '@/pages/MapPage/leafletSelectionLayer';
import { buildBestSideHighlightFeatureCollection } from '@/utils/bestSideHighlight';
import {
  EMPTY_FEATURE_COLLECTION,
  OSM_TILE_URLS,
  SATELLITE_TILE_URLS,
  SOLAR_3D_GLOW_LAYER_ID,
  SOLAR_3D_LAYER_ID,
  SOLAR_AOI_FILL_LAYER_ID,
  SOLAR_AOI_LINE_LAYER_ID,
  SOLAR_AOI_SOURCE_ID,
  SOLAR_CANDIDATE_SOURCE_ID,
  SOLAR_HEAT_LAYER_ID,
  SOLAR_POINT_LABEL_LAYER_ID,
  SOLAR_POINT_LAYER_ID,
  TREE_AOI_FILL_LAYER_ID,
  TREE_AOI_LINE_LAYER_ID,
  TREE_AOI_SOURCE_ID,
  TREE_RANK_LABEL_LAYER_ID,
  TREE_RANK_LAYER_ID,
  TREE_RANK_SOURCE_ID,
} from '@/hooks/maplibre/constants';
import { explainTreeCandidate, rankTreeCandidates } from '@/services/treeOptimizer';
import {
  explainSolarFlowersCandidate,
  rankSolarFlowersCandidates,
} from '@/services/solarFlowers';
import type {
  RankAreaGeometry,
  TreeDrawMode,
  TreeExplainResponse,
  TreeRankCandidate,
} from '@/types/tree-optimizer';
import {
  estimateGeometryAreaKm2,
  geometryToBounds,
} from '@/utils/treeArea';
import { useTranslation } from '@/i18n';
import { useMapAreaDrawing } from '@/hooks/useMapAreaDrawing';
import type {
  MissionPick,
  SolarExplainResponse,
  SolarProfile,
  SolarRankCandidate,
} from '@/types/solar-flowers';

function isMapReadyForShadeOps(engineController: { isReady: () => boolean }) {
  return engineController.isReady();
}

function sideToLabel(
  side: 'N' | 'E' | 'S' | 'W' | null | undefined,
  labels: { north: string; east: string; south: string; west: string },
) {
  if (side === 'N') return labels.north;
  if (side === 'E') return labels.east;
  if (side === 'S') return labels.south;
  if (side === 'W') return labels.west;
  return null;
}

function metersBetweenPoints(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const latMeters = 111_320;
  const lngMeters = 111_320 * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180));
  const dx = (b.lng - a.lng) * lngMeters;
  const dy = (b.lat - a.lat) * latMeters;
  return Math.hypot(dx, dy);
}

function pointSquarePolygon(lng: number, lat: number, halfSizeM: number): number[][] {
  const dLat = halfSizeM / 111_320;
  const dLng = halfSizeM / (111_320 * Math.max(0.01, Math.cos(lat * (Math.PI / 180))));
  return [
    [lng - dLng, lat - dLat],
    [lng + dLng, lat - dLat],
    [lng + dLng, lat + dLat],
    [lng - dLng, lat + dLat],
    [lng - dLng, lat - dLat],
  ];
}

function buildSolarCandidatesFeatureCollection(
  candidates: SolarRankCandidate[],
  profile: SolarProfile,
  selectedId: string | null,
  missionPickIds: Set<string>,
): GeoJSON.FeatureCollection {
  const profileKind = profile === 'solar_panel' ? 'solar' : 'flower';
  const features: GeoJSON.Feature[] = [];

  for (const candidate of candidates) {
    const selected = candidate.id === selectedId ? 1 : 0;
    const picked = missionPickIds.has(candidate.id) ? 1 : 0;
    const halfSizeM = profileKind === 'solar' ? 5.2 : 3.6;
    const extrusionHeight = profileKind === 'solar'
      ? Math.max(6, 3 + candidate.score * 0.11)
      : Math.max(4, 2.2 + candidate.score * 0.085);
    const glowWeight = profileKind === 'solar' ? 2.3 : 1.6;

    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [candidate.lng, candidate.lat],
      },
      properties: {
        kind: 'point',
        id: candidate.id,
        score: candidate.score,
        rank_label: `#${candidate.rank}`,
        selected,
        picked,
        profile_kind: profileKind,
      },
    });

    features.push({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [pointSquarePolygon(candidate.lng, candidate.lat, halfSizeM)],
      },
      properties: {
        kind: 'solid',
        id: candidate.id,
        score: candidate.score,
        selected,
        picked,
        profile_kind: profileKind,
        extrusion_height: Number(extrusionHeight.toFixed(2)),
        glow_weight: glowWeight,
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

export default function MapPage() {
  const { messages, language } = useTranslation();
  const { caseId } = useParams();
  const scenarioMode: 'default' | 'trees' | 'solarFlowers' = caseId === 'trees'
    ? 'trees'
    : caseId === 'solar-flowers'
      ? 'solarFlowers'
      : 'default';
  const isTreeMode = scenarioMode === 'trees';
  const isSolarFlowersMode = scenarioMode === 'solarFlowers';
  const isDefaultMode = scenarioMode === 'default';
  const treeUi = {
    ru: {
      mapNotReady: 'Карта еще загружается. Попробуйте через секунду.',
      areaMissing: 'Сначала выделите область на карте, затем запускайте подбор.',
      noCandidates: 'В текущей области не найдено точек по выбранным фильтрам.',
      rankFailed: 'Не удалось подобрать точки. Попробуйте еще раз.',
      explainFailed: 'Не удалось получить объяснение для этой точки.',
    },
    kk: {
      mapNotReady: 'Карта әлі жүктелуде. Сәлден кейін қайталап көріңіз.',
      areaMissing: 'Алдымен картадан аймақты таңдаңыз, содан кейін есептеуді іске қосыңыз.',
      noCandidates: 'Таңдалған сүзгілер бойынша бұл аумақта нүкте табылмады.',
      rankFailed: 'Нүктелерді таңдау сәтсіз аяқталды. Қайта байқап көріңіз.',
      explainFailed: 'Бұл нүкте үшін түсіндірме алу мүмкін болмады.',
    },
    en: {
      mapNotReady: 'Map is still loading. Try again in a moment.',
      areaMissing: 'Select an area on the map first, then run ranking.',
      noCandidates: 'No points matched current filters in this map area.',
      rankFailed: 'Could not rank points right now. Please try again.',
      explainFailed: 'Could not generate explanation for this point.',
    },
  }[language];
  const solarUi = {
    ru: {
      mapNotReady: 'Карта еще загружается. Попробуйте через секунду.',
      areaMissing: 'Сначала выделите область на карте.',
      noCandidates: 'В выбранной области подходящие точки не найдены.',
      rankFailed: 'Не удалось выполнить расчет точек. Попробуйте еще раз.',
      explainFailed: 'Не удалось получить объяснение для выбранной точки.',
      missionTooClose: 'Точки миссии должны быть дальше друг от друга.',
    },
    kk: {
      mapNotReady: 'Карта әлі жүктелуде. Сәлден кейін қайталап көріңіз.',
      areaMissing: 'Алдымен картадан аймақты таңдаңыз.',
      noCandidates: 'Таңдалған аймақта лайық нүктелер табылмады.',
      rankFailed: 'Нүктелерді есептеу сәтсіз аяқталды. Қайта байқап көріңіз.',
      explainFailed: 'Таңдалған нүкте үшін түсіндірме алу мүмкін болмады.',
      missionTooClose: 'Миссия нүктелері бір-бірінен алыс болуы керек.',
    },
    en: {
      mapNotReady: 'Map is still loading. Try again in a moment.',
      areaMissing: 'Select an area on the map first.',
      noCandidates: 'No matching points found in this selected area.',
      rankFailed: 'Could not calculate points right now. Please try again.',
      explainFailed: 'Could not generate explanation for selected point.',
      missionTooClose: 'Mission picks must be spaced farther apart.',
    },
  }[language];
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
  const [solarWizardStep, setSolarWizardStep] = useState<SolarWizardStep>('shape');
  const [solarProfile, setSolarProfile] = useState<SolarProfile>('flower_full_sun');
  const [solarTopK, setSolarTopK] = useState(25);
  const [solarDrawMode, setSolarDrawMode] = useState<TreeDrawMode>('rectangle');
  const [solarDrawArmed, setSolarDrawArmed] = useState(false);
  const [solarDrawing, setSolarDrawing] = useState(false);
  const [solarAreaGeometry, setSolarAreaGeometry] = useState<RankAreaGeometry | null>(null);
  const [solarDraftGeometry, setSolarDraftGeometry] = useState<RankAreaGeometry | null>(null);
  const [solarAreaKm2, setSolarAreaKm2] = useState<number | null>(null);
  const [solarLoading, setSolarLoading] = useState(false);
  const [solarError, setSolarError] = useState<string | null>(null);
  const [solarCandidates, setSolarCandidates] = useState<SolarRankCandidate[]>([]);
  const [selectedSolarCandidate, setSelectedSolarCandidate] = useState<SolarRankCandidate | null>(null);
  const [solarCardAnchorPoint, setSolarCardAnchorPoint] = useState<{ x: number; y: number } | null>(null);
  const [solarExplanation, setSolarExplanation] = useState<SolarExplainResponse | null>(null);
  const [solarExplainLoading, setSolarExplainLoading] = useState(false);
  const [solarExplainError, setSolarExplainError] = useState<string | null>(null);
  const [solarMissionPicks, setSolarMissionPicks] = useState<MissionPick[]>([]);
  const [solarMissionScore, setSolarMissionScore] = useState(0);
  const [solarMissionCombo, setSolarMissionCombo] = useState(1);
  const solarMissionTarget = 3;

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

  const applySolarAreaGeometry = useCallback((geometry: RankAreaGeometry | null) => {
    setSolarAreaGeometry(geometry);
    setSolarAreaKm2(geometry ? estimateGeometryAreaKm2(geometry) : null);
    setSolarCandidates([]);
    setSelectedSolarCandidate(null);
    setSolarExplanation(null);
    setSolarExplainError(null);
    setSolarMissionPicks([]);
    setSolarMissionScore(0);
    setSolarMissionCombo(1);
    setSolarError(null);
  }, []);

  const startSolarDrawing = useCallback(() => {
    if (engine !== 'maplibre') {
      setSolarError(solarUi.mapNotReady);
      return;
    }

    const map = rawMapRef.current as maplibregl.Map | null;
    if (!map || !map.loaded()) {
      setSolarError(solarUi.mapNotReady);
      return;
    }

    setSolarError(null);
    setSolarDrawArmed(true);
    setSolarDrawing(false);
    setSolarDraftGeometry(null);
    setSolarWizardStep('drawing');
    setSelectedSolarCandidate(null);
    setSolarExplanation(null);
    setSolarExplainError(null);
  }, [engine, rawMapRef, solarUi.mapNotReady]);

  const cancelSolarDrawing = useCallback(() => {
    setSolarDrawArmed(false);
    setSolarDrawing(false);
    setSolarDraftGeometry(null);
    setSelectedSolarCandidate(null);
    setSolarExplanation(null);
    setSolarExplainError(null);
    setSolarWizardStep('shape');
  }, []);

  const clearSolarArea = useCallback(() => {
    setSolarDrawArmed(false);
    setSolarDrawing(false);
    setSolarDraftGeometry(null);
    applySolarAreaGeometry(null);
    setSolarWizardStep('shape');
  }, [applySolarAreaGeometry]);

  const handleRunSolarRanking = useCallback(async () => {
    if (!isSolarFlowersMode) return;
    if (!solarAreaGeometry) {
      setSolarError(solarUi.areaMissing);
      setSolarWizardStep('shape');
      return;
    }

    const bounds = geometryToBounds(solarAreaGeometry);

    setSolarLoading(true);
    setSolarError(null);
    try {
      const ranked = await rankSolarFlowersCandidates({
        areaGeometry: solarAreaGeometry,
        areaBounds: bounds,
        profile: solarProfile,
        date: dt.dateStr,
        topK: solarTopK,
      });
      setSolarCandidates(ranked.candidates);
      setSelectedSolarCandidate((prev) => {
        if (!prev) return null;
        return ranked.candidates.find((item) => item.id === prev.id) ?? null;
      });
      setSolarWizardStep('results');

      if (ranked.candidates.length === 0) {
        setSolarError(solarUi.noCandidates);
      }
    } catch (error) {
      console.error('Solar flowers ranking error:', error);
      setSolarError(solarUi.rankFailed);
      setSolarWizardStep('settings');
      setSolarCandidates([]);
      setSelectedSolarCandidate(null);
    } finally {
      setSolarLoading(false);
    }
  }, [isSolarFlowersMode, solarAreaGeometry, solarProfile, dt.dateStr, solarTopK, solarUi.areaMissing, solarUi.noCandidates, solarUi.rankFailed]);

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

  const mapLibreMap = engine === 'maplibre'
    ? (rawMapRef.current as maplibregl.Map | null)
    : null;

  const handleTreeDrawingComplete = useCallback((geometry: RankAreaGeometry | null, cancelled: boolean) => {
    if (geometry) {
      applyTreeAreaGeometry(geometry);
      setTreeWizardStep('settings');
      setTreeError(null);
    } else if (!cancelled) {
      setTreeError(treeUi.areaMissing);
      setTreeWizardStep('shape');
    } else {
      setTreeWizardStep('shape');
    }
    setTreeDrawArmed(false);
  }, [applyTreeAreaGeometry, treeUi.areaMissing]);

  const handleSolarDrawingComplete = useCallback((geometry: RankAreaGeometry | null, cancelled: boolean) => {
    if (geometry) {
      applySolarAreaGeometry(geometry);
      setSolarWizardStep('settings');
      setSolarError(null);
    } else if (!cancelled) {
      setSolarError(solarUi.areaMissing);
      setSolarWizardStep('shape');
    } else {
      setSolarWizardStep('shape');
    }
    setSolarDrawArmed(false);
  }, [applySolarAreaGeometry, solarUi.areaMissing]);

  useMapAreaDrawing({
    enabled: engine === 'maplibre' && isTreeMode && treeDrawArmed,
    map: mapLibreMap,
    drawMode: treeDrawMode,
    onDraftChange: setTreeDraftGeometry,
    onDrawingChange: setTreeDrawing,
    onComplete: handleTreeDrawingComplete,
  });

  useMapAreaDrawing({
    enabled: engine === 'maplibre' && isSolarFlowersMode && solarDrawArmed,
    map: mapLibreMap,
    drawMode: solarDrawMode,
    onDraftChange: setSolarDraftGeometry,
    onDrawingChange: setSolarDrawing,
    onComplete: handleSolarDrawingComplete,
  });

  useEffect(() => {
    if (!isTreeMode || !selectedTreeCandidate) {
      setTreeCardAnchorPoint(null);
      return;
    }

    const updateAnchor = () => {
      const point = controller.getContainerPoint({
        lat: selectedTreeCandidate.lat,
        lng: selectedTreeCandidate.lng,
      });

      if (!point) {
        setTreeCardAnchorPoint((prev) => (prev === null ? prev : null));
        return;
      }

      setTreeCardAnchorPoint((prev) => {
        if (prev && prev.x === point.x && prev.y === point.y) {
          return prev;
        }
        return { x: point.x, y: point.y };
      });
    };

    updateAnchor();

    if (engine !== 'maplibre') return;
    const map = rawMapRef.current as maplibregl.Map | null;
    if (!map) return;

    map.on('move', updateAnchor);
    map.on('zoom', updateAnchor);
    map.on('resize', updateAnchor);

    return () => {
      map.off('move', updateAnchor);
      map.off('zoom', updateAnchor);
      map.off('resize', updateAnchor);
    };
  }, [controller, engine, isTreeMode, rawMapRef, selectedTreeCandidate]);

  useEffect(() => {
    if (!isSolarFlowersMode || !selectedSolarCandidate) {
      setSolarCardAnchorPoint(null);
      return;
    }

    const updateAnchor = () => {
      const point = controller.getContainerPoint({
        lat: selectedSolarCandidate.lat,
        lng: selectedSolarCandidate.lng,
      });

      if (!point) {
        setSolarCardAnchorPoint((prev) => (prev === null ? prev : null));
        return;
      }

      setSolarCardAnchorPoint((prev) => {
        if (prev && prev.x === point.x && prev.y === point.y) {
          return prev;
        }
        return { x: point.x, y: point.y };
      });
    };

    updateAnchor();

    if (engine !== 'maplibre') return;
    const map = rawMapRef.current as maplibregl.Map | null;
    if (!map) return;

    map.on('move', updateAnchor);
    map.on('zoom', updateAnchor);
    map.on('resize', updateAnchor);

    return () => {
      map.off('move', updateAnchor);
      map.off('zoom', updateAnchor);
      map.off('resize', updateAnchor);
    };
  }, [controller, engine, isSolarFlowersMode, rawMapRef, selectedSolarCandidate]);

  useEffect(() => {
    if (isTreeMode) return;
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
  }, [isTreeMode]);

  useEffect(() => {
    if (isDefaultMode) return;
    setClickInfo(null);
    setSelectedBuilding(null);
  }, [isDefaultMode]);

  useEffect(() => {
    if (isSolarFlowersMode) return;
    setSolarDrawArmed(false);
    setSolarDrawing(false);
    setSolarDraftGeometry(null);
    setSolarAreaGeometry(null);
    setSolarAreaKm2(null);
    setSolarCandidates([]);
    setSelectedSolarCandidate(null);
    setSolarCardAnchorPoint(null);
    setSolarExplanation(null);
    setSolarExplainError(null);
    setSolarMissionPicks([]);
    setSolarMissionScore(0);
    setSolarMissionCombo(1);
    setSolarError(null);
    setSolarWizardStep('shape');
  }, [isSolarFlowersMode]);

  useEffect(() => {
    if (engine !== 'maplibre') return;
    const map = rawMapRef.current as maplibregl.Map | null;
    if (!map) return;

    const upsertAoiOverlay = () => {
      if (!map.getSource(TREE_AOI_SOURCE_ID)) {
        map.addSource(TREE_AOI_SOURCE_ID, {
          type: 'geojson',
          data: EMPTY_FEATURE_COLLECTION,
        });
      }
      if (!map.getLayer(TREE_AOI_FILL_LAYER_ID)) {
        map.addLayer({
          id: TREE_AOI_FILL_LAYER_ID,
          type: 'fill',
          source: TREE_AOI_SOURCE_ID,
          paint: {
            'fill-color': '#2f67bf',
            'fill-opacity': 0.14,
          },
        });
      }
      if (!map.getLayer(TREE_AOI_LINE_LAYER_ID)) {
        map.addLayer({
          id: TREE_AOI_LINE_LAYER_ID,
          type: 'line',
          source: TREE_AOI_SOURCE_ID,
          paint: {
            'line-color': '#1f4f9c',
            'line-width': 2,
            'line-opacity': 0.9,
            'line-dasharray': [2, 1],
          },
        });
      }

      const source = map.getSource(TREE_AOI_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (!source) return;

      const geometry = treeDraftGeometry ?? treeAreaGeometry;
      if (!isTreeMode || !geometry) {
        source.setData(EMPTY_FEATURE_COLLECTION);
        return;
      }

      source.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry,
            properties: {
              mode: treeDrawMode,
            },
          },
        ],
      });
    };

    if (map.isStyleLoaded()) {
      upsertAoiOverlay();
      return;
    }

    map.once('load', upsertAoiOverlay);
  }, [engine, isTreeMode, rawMapRef, treeAreaGeometry, treeDraftGeometry, treeDrawMode]);

  useEffect(() => {
    if (engine !== 'maplibre') return;
    const map = rawMapRef.current as maplibregl.Map | null;
    if (!map) return;

    const upsertAoiOverlay = () => {
      if (!map.getSource(SOLAR_AOI_SOURCE_ID)) {
        map.addSource(SOLAR_AOI_SOURCE_ID, {
          type: 'geojson',
          data: EMPTY_FEATURE_COLLECTION,
        });
      }
      if (!map.getLayer(SOLAR_AOI_FILL_LAYER_ID)) {
        map.addLayer({
          id: SOLAR_AOI_FILL_LAYER_ID,
          type: 'fill',
          source: SOLAR_AOI_SOURCE_ID,
          paint: {
            'fill-color': '#d08b1a',
            'fill-opacity': 0.12,
          },
        });
      }
      if (!map.getLayer(SOLAR_AOI_LINE_LAYER_ID)) {
        map.addLayer({
          id: SOLAR_AOI_LINE_LAYER_ID,
          type: 'line',
          source: SOLAR_AOI_SOURCE_ID,
          paint: {
            'line-color': '#a36a12',
            'line-width': 2,
            'line-opacity': 0.92,
            'line-dasharray': [1.5, 1.2],
          },
        });
      }

      const source = map.getSource(SOLAR_AOI_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (!source) return;

      const geometry = solarDraftGeometry ?? solarAreaGeometry;
      if (!isSolarFlowersMode || !geometry) {
        source.setData(EMPTY_FEATURE_COLLECTION);
        return;
      }

      source.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry,
            properties: {
              mode: solarDrawMode,
            },
          },
        ],
      });
    };

    if (map.isStyleLoaded()) {
      upsertAoiOverlay();
      return;
    }

    map.once('load', upsertAoiOverlay);
  }, [engine, isSolarFlowersMode, rawMapRef, solarAreaGeometry, solarDraftGeometry, solarDrawMode]);

  useEffect(() => {
    if (engine !== 'maplibre') return;

    const map = rawMapRef.current as maplibregl.Map | null;
    if (!map) return;

    const pickCandidateFromPoint = (point: maplibregl.Point) => {
      if (!map.getLayer(TREE_RANK_LAYER_ID)) return null;
      const features = map.queryRenderedFeatures(point, { layers: [TREE_RANK_LAYER_ID] });
      const candidateId = features[0]?.properties?.id;
      if (typeof candidateId !== 'string') return;
      const candidate = treeCandidates.find((item) => item.id === candidateId);
      return candidate ?? null;
    };

    const clickHandler = (event: maplibregl.MapMouseEvent) => {
      if (!isTreeMode || treeDrawArmed || treeDrawing) return;
      const candidate = pickCandidateFromPoint(event.point);
      if (!candidate) return;

      setSelectedTreeCandidate(candidate);
      setClickInfo(null);
      setSelectedBuilding(null);
    };

    const mouseMoveHandler = (event: maplibregl.MapMouseEvent) => {
      if (!isTreeMode || treeDrawArmed || treeDrawing) return;
      const candidate = pickCandidateFromPoint(event.point);
      map.getCanvas().style.cursor = candidate ? 'pointer' : '';
    };

    const mouseOutHandler = () => {
      map.getCanvas().style.cursor = '';
    };

    const updateTreeSource = () => {
      if (!map.getSource(TREE_RANK_SOURCE_ID)) {
        map.addSource(TREE_RANK_SOURCE_ID, {
          type: 'geojson',
          data: EMPTY_FEATURE_COLLECTION,
        });
      }

      if (!map.getLayer(TREE_RANK_LAYER_ID)) {
        map.addLayer({
          id: TREE_RANK_LAYER_ID,
          type: 'circle',
          source: TREE_RANK_SOURCE_ID,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['to-number', ['get', 'score']], 0, 5, 100, 10],
            'circle-color': [
              'interpolate',
              ['linear'],
              ['to-number', ['get', 'score']],
              0,
              '#9aa7bf',
              55,
              '#2f67bf',
              75,
              '#f0c24c',
              90,
              '#c68a11',
            ],
            'circle-opacity': ['case', ['==', ['get', 'selected'], 1], 0.95, 0.85],
            'circle-stroke-width': ['case', ['==', ['get', 'selected'], 1], 2.6, 1.2],
            'circle-stroke-color': ['case', ['==', ['get', 'selected'], 1], '#172033', '#ffffff'],
          },
        });
      }

      if (!map.getLayer(TREE_RANK_LABEL_LAYER_ID)) {
        map.addLayer({
          id: TREE_RANK_LABEL_LAYER_ID,
          type: 'symbol',
          source: TREE_RANK_SOURCE_ID,
          layout: {
            'text-field': ['get', 'rank_label'],
            'text-size': 10,
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-offset': [0, 1.2],
            'text-anchor': 'top',
          },
          paint: {
            'text-color': '#1f4f9c',
            'text-halo-color': '#ffffff',
            'text-halo-width': 0.8,
          },
        });
      }

      const source = map.getSource(TREE_RANK_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (!source) return;

      if (!isTreeMode || treeCandidates.length === 0) {
        source.setData(EMPTY_FEATURE_COLLECTION);
        return;
      }

      const selectedId = selectedTreeCandidate?.id ?? null;
      source.setData({
        type: 'FeatureCollection',
        features: treeCandidates.map((candidate) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [candidate.lng, candidate.lat],
          },
          properties: {
            id: candidate.id,
            score: candidate.score,
            rank_label: `#${candidate.rank}`,
            selected: candidate.id === selectedId ? 1 : 0,
          },
        })),
      });
    };

    if (map.isStyleLoaded()) {
      updateTreeSource();
    } else {
      map.once('load', updateTreeSource);
    }

    map.on('click', clickHandler);
    map.on('mousemove', mouseMoveHandler);
    map.on('mouseout', mouseOutHandler);

    return () => {
      map.off('click', clickHandler);
      map.off('mousemove', mouseMoveHandler);
      map.off('mouseout', mouseOutHandler);
      map.getCanvas().style.cursor = '';
    };
  }, [engine, isTreeMode, rawMapRef, selectedTreeCandidate?.id, treeCandidates, treeDrawArmed, treeDrawing]);

  useEffect(() => {
    if (engine !== 'maplibre') return;

    const map = rawMapRef.current as maplibregl.Map | null;
    if (!map) return;

    const pickCandidateFromPoint = (point: maplibregl.Point) => {
      const queriedLayers: string[] = [];
      if (map.getLayer(SOLAR_POINT_LAYER_ID)) queriedLayers.push(SOLAR_POINT_LAYER_ID);
      if (map.getLayer(SOLAR_3D_LAYER_ID)) queriedLayers.push(SOLAR_3D_LAYER_ID);
      if (queriedLayers.length === 0) return null;

      const features = map.queryRenderedFeatures(point, { layers: queriedLayers });
      const candidateId = features[0]?.properties?.id;
      if (typeof candidateId !== 'string') return null;
      return solarCandidates.find((item) => item.id === candidateId) ?? null;
    };

    const clickHandler = (event: maplibregl.MapMouseEvent) => {
      if (!isSolarFlowersMode || solarDrawArmed || solarDrawing) return;
      const candidate = pickCandidateFromPoint(event.point);
      if (!candidate) return;

      suppressNextMapClickRef.current = true;
      setSelectedSolarCandidate(candidate);
      setClickInfo(null);
      setSelectedBuilding(null);
    };

    const mouseMoveHandler = (event: maplibregl.MapMouseEvent) => {
      if (!isSolarFlowersMode || solarDrawArmed || solarDrawing) return;
      const candidate = pickCandidateFromPoint(event.point);
      map.getCanvas().style.cursor = candidate ? 'pointer' : '';
    };

    const mouseOutHandler = () => {
      map.getCanvas().style.cursor = '';
    };

    const updateSolarSource = () => {
      if (!map.getSource(SOLAR_CANDIDATE_SOURCE_ID)) {
        map.addSource(SOLAR_CANDIDATE_SOURCE_ID, {
          type: 'geojson',
          data: EMPTY_FEATURE_COLLECTION,
        });
      }

      if (!map.getLayer(SOLAR_HEAT_LAYER_ID)) {
        map.addLayer({
          id: SOLAR_HEAT_LAYER_ID,
          type: 'heatmap',
          source: SOLAR_CANDIDATE_SOURCE_ID,
          minzoom: 13,
          maxzoom: 15,
          filter: ['==', ['get', 'kind'], 'point'],
          paint: {
            'heatmap-weight': ['interpolate', ['linear'], ['to-number', ['get', 'score']], 0, 0.05, 100, 1],
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 13, 0.8, 15, 1.35],
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0,
              'rgba(255,255,178,0)',
              0.2,
              '#fff7bc',
              0.45,
              '#fec44f',
              0.72,
              '#fe9929',
              1,
              '#ec7014',
            ],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 13, 12, 15, 24],
            'heatmap-opacity': 0.68,
          },
        });
      }

      if (!map.getLayer(SOLAR_POINT_LAYER_ID)) {
        map.addLayer({
          id: SOLAR_POINT_LAYER_ID,
          type: 'circle',
          source: SOLAR_CANDIDATE_SOURCE_ID,
          minzoom: 15,
          maxzoom: 16,
          filter: ['==', ['get', 'kind'], 'point'],
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['to-number', ['get', 'score']], 0, 4, 100, 10],
            'circle-color': [
              'case',
              ['==', ['get', 'profile_kind'], 'solar'],
              ['interpolate', ['linear'], ['to-number', ['get', 'score']], 0, '#d0d7e4', 100, '#f7c948'],
              ['interpolate', ['linear'], ['to-number', ['get', 'score']], 0, '#d6e7d8', 100, '#4caf50'],
            ],
            'circle-opacity': ['case', ['==', ['get', 'selected'], 1], 0.96, 0.86],
            'circle-stroke-width': ['case', ['==', ['get', 'selected'], 1], 2.8, 1.2],
            'circle-stroke-color': [
              'case',
              ['==', ['get', 'picked'], 1],
              '#8b5cf6',
              ['==', ['get', 'selected'], 1],
              '#172033',
              '#ffffff',
            ],
          },
        });
      }

      if (!map.getLayer(SOLAR_POINT_LABEL_LAYER_ID)) {
        map.addLayer({
          id: SOLAR_POINT_LABEL_LAYER_ID,
          type: 'symbol',
          source: SOLAR_CANDIDATE_SOURCE_ID,
          minzoom: 15,
          maxzoom: 16,
          filter: ['==', ['get', 'kind'], 'point'],
          layout: {
            'text-field': ['get', 'rank_label'],
            'text-size': 10,
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-offset': [0, 1.2],
            'text-anchor': 'top',
          },
          paint: {
            'text-color': '#704400',
            'text-halo-color': '#ffffff',
            'text-halo-width': 0.85,
          },
        });
      }

      if (!map.getLayer(SOLAR_3D_LAYER_ID)) {
        map.addLayer({
          id: SOLAR_3D_LAYER_ID,
          type: 'fill-extrusion',
          source: SOLAR_CANDIDATE_SOURCE_ID,
          minzoom: 16,
          filter: ['==', ['get', 'kind'], 'solid'],
          paint: {
            'fill-extrusion-height': ['to-number', ['get', 'extrusion_height']],
            'fill-extrusion-color': [
              'case',
              ['==', ['get', 'profile_kind'], 'solar'],
              ['case', ['==', ['get', 'picked'], 1], '#f7b733', '#f3c969'],
              ['case', ['==', ['get', 'picked'], 1], '#52c36f', '#6fcf97'],
            ],
            'fill-extrusion-opacity': ['case', ['==', ['get', 'selected'], 1], 0.94, 0.86],
            'fill-extrusion-base': 0,
          },
        });
      }

      if (!map.getLayer(SOLAR_3D_GLOW_LAYER_ID)) {
        map.addLayer({
          id: SOLAR_3D_GLOW_LAYER_ID,
          type: 'line',
          source: SOLAR_CANDIDATE_SOURCE_ID,
          minzoom: 16,
          filter: ['==', ['get', 'kind'], 'solid'],
          paint: {
            'line-color': [
              'case',
              ['==', ['get', 'profile_kind'], 'solar'],
              '#c58a00',
              '#1f7a3f',
            ],
            'line-width': ['interpolate', ['linear'], ['zoom'], 16, 1.1, 19, 2.4],
            'line-opacity': ['case', ['==', ['get', 'selected'], 1], 1, 0.74],
          },
        });
      }

      const source = map.getSource(SOLAR_CANDIDATE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (!source) return;

      if (!isSolarFlowersMode || solarCandidates.length === 0 || zoom < 13) {
        source.setData(EMPTY_FEATURE_COLLECTION);
        return;
      }

      source.setData(buildSolarCandidatesFeatureCollection(
        solarCandidates,
        solarProfile,
        selectedSolarCandidate?.id ?? null,
        new Set(solarMissionPicks.map((item) => item.id)),
      ));
    };

    if (map.isStyleLoaded()) {
      updateSolarSource();
    } else {
      map.once('load', updateSolarSource);
    }

    map.on('click', clickHandler);
    map.on('mousemove', mouseMoveHandler);
    map.on('mouseout', mouseOutHandler);

    return () => {
      map.off('click', clickHandler);
      map.off('mousemove', mouseMoveHandler);
      map.off('mouseout', mouseOutHandler);
      map.getCanvas().style.cursor = '';
    };
  }, [engine, isSolarFlowersMode, rawMapRef, selectedSolarCandidate?.id, solarCandidates, solarDrawArmed, solarDrawing, solarMissionPicks, solarProfile, zoom]);

  useEffect(() => {
    if (!isTreeMode || !selectedTreeCandidate) {
      setTreeExplanation(null);
      setTreeExplainError(null);
      setTreeExplainLoading(false);
      return;
    }

    let isCancelled = false;
    setTreeExplainLoading(true);
    setTreeExplainError(null);
    setTreeExplanation(null);

    explainTreeCandidate(selectedTreeCandidate, language, treeSummerWeight)
      .then((response) => {
        if (isCancelled) return;
        setTreeExplanation(response);
      })
      .catch((error) => {
        if (isCancelled) return;
        console.error('Tree explanation error:', error);
        setTreeExplainError(treeUi.explainFailed);
      })
      .finally(() => {
        if (isCancelled) return;
        setTreeExplainLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [isTreeMode, language, selectedTreeCandidate, treeSummerWeight, treeUi.explainFailed]);

  useEffect(() => {
    if (!isSolarFlowersMode || !selectedSolarCandidate) {
      setSolarExplanation(null);
      setSolarExplainError(null);
      setSolarExplainLoading(false);
      return;
    }

    let isCancelled = false;
    setSolarExplainLoading(true);
    setSolarExplainError(null);
    setSolarExplanation(null);

    explainSolarFlowersCandidate(selectedSolarCandidate, solarProfile, dt.dateStr, language)
      .then((response) => {
        if (isCancelled) return;
        setSolarExplanation(response);
      })
      .catch((error) => {
        if (isCancelled) return;
        console.error('Solar flowers explanation error:', error);
        setSolarExplainError(solarUi.explainFailed);
      })
      .finally(() => {
        if (isCancelled) return;
        setSolarExplainLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [isSolarFlowersMode, language, selectedSolarCandidate, solarProfile, dt.dateStr, solarUi.explainFailed]);

  // 2D/3D button controls MapLibre camera (pitch/bearing).
  useEffect(() => {
    if (engine !== 'maplibre') {
      setIs3D(false);
      return;
    }

    const map = rawMapRef.current as {
      loaded?: () => boolean;
      once?: (event: string, listener: () => void) => void;
      easeTo?: (options: { pitch: number; bearing: number; duration: number }) => void;
    } | null;
    if (!map) return;

    const applyView = () => {
      map.easeTo?.({
        pitch: is3D ? 58 : 0,
        bearing: is3D ? -18 : 0,
        duration: 450,
      });
    };

    if (map.loaded?.()) {
      applyView();
      return;
    }

    map.once?.('load', applyView);
  }, [engine, is3D, rawMapRef]);

  // Toggle basemap tiles in MapLibre without re-creating the map.
  useEffect(() => {
    if (engine !== 'maplibre') return;
    const map = rawMapRef.current as {
      getSource?: (id: string) => unknown;
      isStyleLoaded?: () => boolean;
      once?: (event: 'load', listener: () => void) => void;
    } | null;
    if (!map) return;

    const applyTiles = () => {
      const source = map.getSource?.('osm') as { setTiles?: (tiles: string[]) => void } | undefined;
      source?.setTiles?.(isSatellite ? SATELLITE_TILE_URLS : OSM_TILE_URLS);
    };

    if (map.isStyleLoaded?.()) {
      applyTiles();
      return;
    }
    map.once?.('load', applyTiles);
  }, [engine, isSatellite, rawMapRef]);

  // Sync date/time → shade map
  useEffect(() => {
    // In sun-exposure mode, simulator uses interval-based rendering and
    // frequent setDate calls can race render buffers in maplibre.
    if (sunExposure) return;
    if (!shadow || !isMapReadyForShadeOps(controller)) return;
    try {
      shadow.setDate(dt.date);
    } catch {
      return;
    }
  }, [dt.date, sunExposure, shadow, controller]);

  function getDefaultSunExposureRange(dateStr: string) {
    return {
      startDate: astanaLocalToDate(dateStr, SUN_EXPOSURE_CONFIG.startHour, 0),
      endDate: astanaLocalToDate(dateStr, SUN_EXPOSURE_CONFIG.endHour, 0),
      iterations: SUN_EXPOSURE_CONFIG.iterations,
    };
  }

  // Sync sun exposure mode → shade map
  useEffect(() => {
    if (!shadow || !isMapReadyForShadeOps(controller)) return;

    shadow.setSunExposure(sunExposure, {
      ...getDefaultSunExposureRange(dt.dateStr),
    }).catch(() => {
    });
  }, [sunExposure, dt.dateStr, shadow, controller]);

  // Map click → check sun/shade at that pixel
  useEffect(() => {
    function handleClick(point: MapPoint) {
      if (isTreeMode) return;
      if (isSolarFlowersMode && (solarDrawArmed || solarDrawing)) return;
      if (suppressNextMapClickRef.current) {
        suppressNextMapClickRef.current = false;
        return;
      }

      const requestId = menuRequestIdRef.current + 1;
      menuRequestIdRef.current = requestId;
      const pickedBuilding = findBuildingAtPoint(buildingsRef.current, point);
      setSelectedBuilding(pickedBuilding);
      if (!shadow) return;
      const screenPoint = controller.getContainerPoint(point);
      if (!screenPoint) return;
      setClickInfo({
        lat: point.lat,
        lng: point.lng,
        screenX: screenPoint.x,
        screenY: screenPoint.y,
        inSun: null,
        buildingId: pickedBuilding?.id ?? null,
        buildingLabel: pickedBuilding?.label ?? null,
        complexName: null,
        address: null,
        buildingInfoLoading: Boolean(pickedBuilding?.id),
        photoUrl: null,
        photoPlaceName: null,
        predictedBestSide: null,
        predictedConfidence: null,
        predictionLoading: Boolean(pickedBuilding?.id),
      });

      if (pickedBuilding?.id) {
        getBuildingMetadata(pickedBuilding.id, point.lat, point.lng)
          .then((meta) => {
            if (menuRequestIdRef.current !== requestId) return;
            setClickInfo((prev) => (prev
              ? {
                  ...prev,
                  complexName: meta.complexName,
                  address: meta.address,
                  photoUrl: meta.photoUrl,
                  photoPlaceName: meta.photoPlaceName,
                  buildingInfoLoading: false,
                }
              : null));
          })
          .catch(() => {
            if (menuRequestIdRef.current !== requestId) return;
            setClickInfo((prev) => (prev
              ? {
                  ...prev,
                  buildingInfoLoading: false,
                }
              : null));
          });

        predictBestSide(pickedBuilding, dt.dateStr)
          .then((prediction) => {
            if (menuRequestIdRef.current !== requestId) return;
            setClickInfo((prev) => (prev
              ? {
                  ...prev,
                  predictedBestSide: prediction.best_side,
                  predictedConfidence: prediction.confidence,
                  predictionLoading: false,
                }
              : null));
          })
          .catch(() => {
            if (menuRequestIdRef.current !== requestId) return;
            setClickInfo((prev) => (prev
              ? {
                  ...prev,
                  predictionLoading: false,
                }
              : null));
          });
      }

      shadow.isPositionInSun(screenPoint)
        .then((inSun: boolean) => {
          if (menuRequestIdRef.current !== requestId) return;
          setClickInfo((prev) => (prev
            ? {
                ...prev,
                inSun,
              }
            : null));
        })
        .catch(() => setClickInfo(null));
    }

    const unsubscribeClick = controller.onClick(handleClick);
    return () => {
      unsubscribeClick();
    };
  }, [shadow, controller, buildingsRef, dt.dateStr, isTreeMode, isSolarFlowersMode, solarDrawArmed, solarDrawing]);

  // Selected building highlight with prediction-driven yellow edges.
  useEffect(() => {
    const bestSide = clickInfo?.predictedBestSide ?? null;
    const map = rawMapRef.current as L.Map | maplibregl.Map | null;
    if (!map || !selectedBuilding || !bestSide) {
      selectedBuildingLayerRef.current?.remove();
      selectedBuildingLayerRef.current = null;
      if (engine === 'maplibre') {
        const mapLibreMap = rawMapRef.current as {
          getSource?: (id: string) => { setData?: (data: GeoJSON.FeatureCollection) => void } | undefined;
          getLayer?: (id: string) => unknown;
          removeLayer?: (id: string) => void;
          removeSource?: (id: string) => void;
          isStyleLoaded?: () => boolean;
          once?: (event: 'load', listener: () => void) => void;
        } | null;
        const source = mapLibreMap?.getSource?.('selected-building-highlight');
        source?.setData?.({ type: 'FeatureCollection', features: [] });
      }
      return;
    }

    if (engine === 'leaflet') {
      selectedBuildingLayerRef.current?.remove();
      selectedBuildingLayerRef.current = renderLeafletSelectedBuildingLayer(
        map as L.Map,
        selectedBuilding,
        bestSide,
      );
      return;
    }

    const mapLibreMap = map as {
      addSource?: (id: string, source: { type: 'geojson'; data: GeoJSON.FeatureCollection }) => void;
      addLayer?: (layer: {
        id: string;
        type: 'line';
        source: string;
        layout?: Record<string, unknown>;
        paint: Record<string, unknown>;
      }) => void;
      getSource?: (id: string) => { setData?: (data: GeoJSON.FeatureCollection) => void } | undefined;
      getLayer?: (id: string) => unknown;
      isStyleLoaded?: () => boolean;
      once?: (event: 'load', listener: () => void) => void;
    };
    const sourceId = 'selected-building-highlight';
    const glowLayerId = 'selected-building-highlight-glow';
    const lineLayerId = 'selected-building-highlight-line';
    const updateMapLibreOverlay = () => {
      if (!mapLibreMap.getSource?.(sourceId)) {
        mapLibreMap.addSource?.(sourceId, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }
      if (!mapLibreMap.getLayer?.(glowLayerId)) {
        mapLibreMap.addLayer?.({
          id: glowLayerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': '#ffd54f',
            'line-width': 8,
            'line-opacity': 0.18,
          },
        });
      }
      if (!mapLibreMap.getLayer?.(lineLayerId)) {
        mapLibreMap.addLayer?.({
          id: lineLayerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': '#ffeb3b',
            'line-width': 3,
            'line-opacity': 0.95,
          },
        });
      }
      const source = mapLibreMap.getSource?.(sourceId);
      source?.setData?.(buildBestSideHighlightFeatureCollection(selectedBuilding, bestSide));
    };

    if (mapLibreMap.isStyleLoaded?.()) {
      updateMapLibreOverlay();
      return;
    }

    mapLibreMap.once?.('load', updateMapLibreOverlay);
  }, [engine, rawMapRef, selectedBuilding, clickInfo?.predictedBestSide]);

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

  const handleSolarMissionPick = useCallback((candidate: SolarRankCandidate) => {
    setSolarError(null);
    setSolarMissionPicks((prev) => {
      if (prev.some((item) => item.id === candidate.id)) {
        return prev;
      }
      if (prev.length >= solarMissionTarget) {
        return prev;
      }

      const tooClose = prev.some((item) => (
        metersBetweenPoints(
          { lat: item.lat, lng: item.lng },
          { lat: candidate.lat, lng: candidate.lng },
        ) < 40
      ));
      if (tooClose) {
        setSolarError(solarUi.missionTooClose);
        return prev;
      }

      const nextCombo = candidate.score >= 80
        ? Math.min(solarMissionCombo + 1, 5)
        : 1;
      setSolarMissionCombo(nextCombo);
      setSolarMissionScore((prevScore) => prevScore + Math.round(candidate.score * nextCombo));

      return [
        ...prev,
        {
          id: candidate.id,
          lat: candidate.lat,
          lng: candidate.lng,
          score: candidate.score,
        },
      ];
    });
  }, [solarMissionCombo, solarMissionTarget, solarUi.missionTooClose]);

  // Load precomputed static dataset (best building side to receive sunlight)
  useEffect(() => {
    if (engine !== 'leaflet') return;
    return setupLeafletStaticLayer({
      rawMapRef,
      staticDatasetLayerRef,
      sunEdgesLayerRef,
      suppressNextMapClickRef,
      setContextMenu: () => {},
      setClickInfo: () => setClickInfo(null),
    });
  }, [engine, rawMapRef]);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <MapView containerRef={containerRef} />

      <SearchBar onSelect={handleSearchSelect} />

      {isDefaultMode && clickInfo?.predictedBestSide && clickInfo.screenX != null && clickInfo.screenY != null && (
        <div
          className="pointer-events-none absolute z-[990] -translate-x-1/2 -translate-y-full rounded-lg border border-[color:var(--line)] bg-[rgba(251,248,241,0.96)] px-3 py-2 text-[11px] font-medium text-[var(--blue-strong)] shadow-[0_10px_20px_rgba(23,32,51,0.12)] backdrop-blur-md"
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

      {!isTreeMode && (
        <ControlPanel
          dateStr={dt.dateStr}
          onDateChange={dt.setDateStr}
          sunExposure={sunExposure}
          onModeChange={setSunExposure}
          is3D={is3D}
          onViewModeChange={setIs3D}
          isSatellite={isSatellite}
          onBasemapChange={engine === 'maplibre' ? setIsSatellite : undefined}
          zoom={zoom}
          loadingBuildings={loadingBuildings}
        />
      )}

      {isTreeMode && (
        <TreeOptimizerWizard
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

      {isSolarFlowersMode && (
        <SolarFlowersWizard
          step={solarWizardStep}
          drawMode={solarDrawMode}
          drawingInProgress={solarDrawing}
          hasArea={Boolean(solarAreaGeometry)}
          areaKm2={solarAreaKm2}
          profile={solarProfile}
          dateStr={dt.dateStr}
          topK={solarTopK}
          loading={solarLoading}
          error={solarError}
          resultCount={solarCandidates.length}
          missionScore={solarMissionScore}
          missionCombo={solarMissionCombo}
          missionPicksCount={solarMissionPicks.length}
          missionTarget={solarMissionTarget}
          onDrawModeChange={(mode) => {
            setSolarDrawMode(mode);
            setSolarError(null);
            setSolarDrawArmed(false);
            setSolarDrawing(false);
            setSolarDraftGeometry(null);
          }}
          onStartDrawing={startSolarDrawing}
          onCancelDrawing={cancelSolarDrawing}
          onContinueToSettings={() => {
            if (!solarAreaGeometry) {
              setSolarError(solarUi.areaMissing);
              return;
            }
            setSolarError(null);
            setSolarWizardStep('settings');
          }}
          onClearArea={clearSolarArea}
          onProfileChange={setSolarProfile}
          onDateChange={dt.setDateStr}
          onTopKChange={setSolarTopK}
          onRunRanking={() => {
            void handleRunSolarRanking();
          }}
          onStartMission={() => {
            setSolarError(null);
            setSolarWizardStep('mission');
          }}
          onBackToShape={() => {
            setSolarError(null);
            setSolarWizardStep('shape');
            setSolarDrawArmed(false);
            setSolarDrawing(false);
            setSolarDraftGeometry(null);
            setSelectedSolarCandidate(null);
            setSolarCardAnchorPoint(null);
            setSolarExplanation(null);
            setSolarExplainError(null);
            setSolarMissionPicks([]);
            setSolarMissionScore(0);
            setSolarMissionCombo(1);
          }}
          onBackToSettings={() => {
            setSolarError(null);
            setSolarWizardStep('settings');
          }}
          onResetMission={() => {
            setSolarMissionPicks([]);
            setSolarMissionScore(0);
            setSolarMissionCombo(1);
          }}
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

      {!isTreeMode && clickInfo && (
        <SunInfoPopup info={clickInfo} onClose={() => {
          setClickInfo(null);
          setSelectedBuilding(null);
        }} />
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

      {isSolarFlowersMode && selectedSolarCandidate && (
        <SolarFlowersCandidateCard
          candidate={selectedSolarCandidate}
          explanation={solarExplanation}
          explanationLoading={solarExplainLoading}
          explanationError={solarExplainError}
          anchorPoint={solarCardAnchorPoint}
          missionPicks={solarMissionPicks}
          missionTarget={solarMissionTarget}
          onPick={(candidate) => {
            handleSolarMissionPick(candidate);
            if (solarMissionPicks.length + 1 >= solarMissionTarget) {
              setSolarWizardStep('mission');
            }
          }}
          onClose={() => {
            setSelectedSolarCandidate(null);
            setSolarCardAnchorPoint(null);
            setSolarExplanation(null);
            setSolarExplainError(null);
          }}
        />
      )}
    </div>
  );
}
