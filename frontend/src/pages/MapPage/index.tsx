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
  SUN_WALLS_LAYER_ID,
  TREE_AOI_FILL_LAYER_ID,
  TREE_AOI_LINE_LAYER_ID,
  TREE_AOI_SOURCE_ID,
  TREE_RANK_LABEL_LAYER_ID,
  TREE_RANK_LAYER_ID,
  TREE_RANK_SOURCE_ID,
} from '@/hooks/maplibre/constants';
import { explainTreeCandidate, rankTreeCandidates } from '@/services/treeOptimizer';
import type {
  RankAreaGeometry,
  TreeDrawMode,
  TreeExplainResponse,
  TreeRankCandidate,
} from '@/types/tree-optimizer';
import {
  circleToPolygon,
  estimateGeometryAreaKm2,
  freehandToPolygon,
  geometryToBounds,
  polygonFromVertices,
  rectangleToPolygon,
} from '@/utils/treeArea';
import { useTranslation } from '@/i18n';
import {
  buildWorkerFeatureCollection,
  getWorkerActivity,
  getWorkerRandomName,
  minuteToClockLabel,
  type SelectedWorkerInfo,
  type WorkerExposureStat,
  type WorkerFeatureProps,
} from '@/pages/MapPage/workerSimulation';
import type { ShadowEngineController } from '@/types/shadow-engine';

function isMapReadyForShadeOps(engineController: { isReady: () => boolean }) {
  return engineController.isReady();
}

function applyShadowDateForSimMinute(
  shadow: ShadowEngineController | null,
  controller: { isReady: () => boolean },
  dateStr: string,
  simMinute: number,
) {
  if (!shadow || !isMapReadyForShadeOps(controller)) return;
  try {
    shadow.setDate(astanaLocalToDate(dateStr, Math.floor(simMinute / 60), simMinute % 60));
  } catch {
    // transient WebGL / shade map races
  }
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

export default function MapPage() {
  const { messages, language } = useTranslation();
  const { caseId } = useParams();
  const isTreeMode = caseId === 'trees';
  const isWorkerMode = caseId === 'workers';
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
  const [workerDrawMode, setWorkerDrawMode] = useState<TreeDrawMode | null>(null);
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
  const workerSimTimerRef = useRef<number | null>(null);
  const workerSimStartTimeoutRef = useRef<number | null>(null);
  const workerSimBusyRef = useRef(false);

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
    if (isTreeMode || isWorkerMode) return;
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
  }, [isTreeMode, isWorkerMode]);

  useEffect(() => {
    if (isWorkerMode) return;
    if (workerSimStartTimeoutRef.current != null) {
      window.clearTimeout(workerSimStartTimeoutRef.current);
      workerSimStartTimeoutRef.current = null;
    }
    if (workerSimTimerRef.current != null) {
      window.clearInterval(workerSimTimerRef.current);
      workerSimTimerRef.current = null;
    }
    workerSimBusyRef.current = false;
    setWorkerSimRunning(false);
    setWorkerSimMinute(9 * 60);
    setWorkerStats({});
    setSelectedWorker(null);
    setWorkerDrawMode(null);
    setWorkerDraftGeometry(null);
    setWorkerAreaGeometry(null);
    setWorkerAreaKm2(null);
    setWorkerTaskType('facade_maintenance');
  }, [isWorkerMode]);

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

      const geometry = isTreeMode
        ? (treeDraftGeometry ?? treeAreaGeometry)
        : (isWorkerMode ? (workerDraftGeometry ?? workerAreaGeometry) : null);
      if ((!isTreeMode && !isWorkerMode) || !geometry) {
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
              mode: isTreeMode ? treeDrawMode : 'worker-zone',
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
  }, [
    engine,
    isTreeMode,
    isWorkerMode,
    rawMapRef,
    treeAreaGeometry,
    treeDraftGeometry,
    treeDrawMode,
    workerAreaGeometry,
    workerDraftGeometry,
  ]);

  useEffect(() => {
    if (engine !== 'maplibre' || !isTreeMode || !treeDrawArmed) return;
    const map = rawMapRef.current as maplibregl.Map | null;
    if (!map) return;

    let isMouseDown = false;
    let startPoint: [number, number] | null = null;
    let polygonPoints: [number, number][] = [];
    let freehandPoints: [number, number][] = [];

    map.getCanvas().style.cursor = 'crosshair';

    const beginDrawing = () => {
      setTreeDrawing(true);
      setTreeDraftGeometry(null);
      setTreeExplainError(null);
      map.dragPan.disable();
      map.doubleClickZoom.disable();
    };

    const finishDrawing = (geometry: RankAreaGeometry | null, cancelled = false) => {
      if (geometry) {
        applyTreeAreaGeometry(geometry);
        setTreeWizardStep('settings');
      } else if (!cancelled) {
        setTreeError(treeUi.areaMissing);
        setTreeWizardStep('shape');
      }
      setTreeDraftGeometry(null);
      setTreeDrawArmed(false);
      setTreeDrawing(false);
      map.dragPan.enable();
      map.doubleClickZoom.enable();
      map.getCanvas().style.cursor = '';
    };

    const onMouseDown = (event: maplibregl.MapMouseEvent) => {
      if (treeDrawMode !== 'rectangle' && treeDrawMode !== 'circle' && treeDrawMode !== 'freehand') return;

      if (treeDrawMode === 'freehand') {
        beginDrawing();
        isMouseDown = true;
        const p: [number, number] = [event.lngLat.lng, event.lngLat.lat];
        freehandPoints = [p];
        return;
      }

      beginDrawing();
      isMouseDown = true;
      startPoint = [event.lngLat.lng, event.lngLat.lat];
      setTreeDraftGeometry(null);
    };

    const onMouseMove = (event: maplibregl.MapMouseEvent) => {
      if (!isMouseDown) {
        if (treeDrawMode === 'polygon' && polygonPoints.length >= 2) {
          const preview = polygonFromVertices([
            ...polygonPoints,
            [event.lngLat.lng, event.lngLat.lat],
          ]);
          if (preview) setTreeDraftGeometry(preview);
        }
        return;
      }

      if (treeDrawMode === 'rectangle' && startPoint) {
        const geometry = rectangleToPolygon(startPoint, [event.lngLat.lng, event.lngLat.lat]);
        setTreeDraftGeometry(geometry);
      }

      if (treeDrawMode === 'circle' && startPoint) {
        const current: [number, number] = [event.lngLat.lng, event.lngLat.lat];
        const radiusMeters = maplibregl.LngLat.convert(startPoint).distanceTo(maplibregl.LngLat.convert(current));
        const geometry = circleToPolygon(startPoint, Math.max(4, radiusMeters));
        setTreeDraftGeometry(geometry);
      }

      if (treeDrawMode === 'freehand') {
        const point: [number, number] = [event.lngLat.lng, event.lngLat.lat];
        const last = freehandPoints[freehandPoints.length - 1];
        if (!last || maplibregl.LngLat.convert(last).distanceTo(maplibregl.LngLat.convert(point)) > 4) {
          freehandPoints.push(point);
          const geometry = freehandToPolygon(freehandPoints);
          if (geometry) setTreeDraftGeometry(geometry);
        }
      }
    };

    const onMouseUp = (event: maplibregl.MapMouseEvent) => {
      if (!isMouseDown) return;
      isMouseDown = false;

      if (treeDrawMode === 'rectangle' && startPoint) {
        const geometry = rectangleToPolygon(startPoint, [event.lngLat.lng, event.lngLat.lat]);
        finishDrawing(geometry);
        startPoint = null;
        return;
      }

      if (treeDrawMode === 'circle' && startPoint) {
        const current: [number, number] = [event.lngLat.lng, event.lngLat.lat];
        const radiusMeters = maplibregl.LngLat.convert(startPoint).distanceTo(maplibregl.LngLat.convert(current));
        const geometry = circleToPolygon(startPoint, Math.max(4, radiusMeters));
        finishDrawing(geometry);
        startPoint = null;
        return;
      }

      if (treeDrawMode === 'freehand') {
        const geometry = freehandToPolygon(freehandPoints);
        finishDrawing(geometry);
        freehandPoints = [];
      }
    };

    const onClick = (event: maplibregl.MapMouseEvent) => {
      if (treeDrawMode !== 'polygon') return;
      if (polygonPoints.length === 0) {
        beginDrawing();
      }
      polygonPoints = [...polygonPoints, [event.lngLat.lng, event.lngLat.lat]];
      const geometry = polygonFromVertices(polygonPoints);
      if (geometry) setTreeDraftGeometry(geometry);
    };

    const onDoubleClick = (event: maplibregl.MapMouseEvent & { originalEvent?: Event }) => {
      if (treeDrawMode !== 'polygon') return;
      event.originalEvent?.preventDefault();
      const geometry = polygonFromVertices(polygonPoints);
      finishDrawing(geometry);
      polygonPoints = [];
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      polygonPoints = [];
      freehandPoints = [];
      startPoint = null;
      finishDrawing(null, true);
      setTreeWizardStep('shape');
    };

    map.on('mousedown', onMouseDown);
    map.on('mousemove', onMouseMove);
    map.on('mouseup', onMouseUp);
    map.on('click', onClick);
    map.on('dblclick', onDoubleClick);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      map.off('mousedown', onMouseDown);
      map.off('mousemove', onMouseMove);
      map.off('mouseup', onMouseUp);
      map.off('click', onClick);
      map.off('dblclick', onDoubleClick);
      window.removeEventListener('keydown', onKeyDown);
      map.dragPan.enable();
      map.doubleClickZoom.enable();
      map.getCanvas().style.cursor = '';
      setTreeDrawing(false);
      setTreeDraftGeometry(null);
    };
  }, [engine, isTreeMode, rawMapRef, treeDrawArmed, treeDrawMode, applyTreeAreaGeometry, treeUi.areaMissing]);

  useEffect(() => {
    if (engine !== 'maplibre' || !isWorkerMode || !workerDrawMode) return;
    const map = rawMapRef.current as maplibregl.Map | null;
    if (!map) return;

    let isMouseDown = false;
    let startPoint: [number, number] | null = null;
    let polygonPoints: [number, number][] = [];
    let freehandPoints: [number, number][] = [];

    map.getCanvas().style.cursor = 'crosshair';

    const beginDrawing = () => {
      setWorkerDraftGeometry(null);
      map.dragPan.disable();
      map.doubleClickZoom.disable();
    };

    const finishDrawing = (geometry: RankAreaGeometry | null, cancelled = false) => {
      if (geometry) {
        setWorkerAreaGeometry(geometry);
        setWorkerAreaKm2(estimateGeometryAreaKm2(geometry));
      } else if (!cancelled) {
        setWorkerAreaGeometry(null);
        setWorkerAreaKm2(null);
      }
      setWorkerDraftGeometry(null);
      map.dragPan.enable();
      map.doubleClickZoom.enable();
      map.getCanvas().style.cursor = '';
    };

    const onMouseDown = (event: maplibregl.MapMouseEvent) => {
      if (workerDrawMode !== 'rectangle' && workerDrawMode !== 'circle' && workerDrawMode !== 'freehand') return;
      beginDrawing();
      isMouseDown = true;
      const p: [number, number] = [event.lngLat.lng, event.lngLat.lat];
      if (workerDrawMode === 'freehand') {
        freehandPoints = [p];
      } else {
        startPoint = p;
      }
    };

    const onMouseMove = (event: maplibregl.MapMouseEvent) => {
      if (!isMouseDown) {
        if (workerDrawMode === 'polygon' && polygonPoints.length >= 2) {
          const preview = polygonFromVertices([
            ...polygonPoints,
            [event.lngLat.lng, event.lngLat.lat],
          ]);
          if (preview) setWorkerDraftGeometry(preview);
        }
        return;
      }

      if (workerDrawMode === 'rectangle' && startPoint) {
        const geometry = rectangleToPolygon(startPoint, [event.lngLat.lng, event.lngLat.lat]);
        setWorkerDraftGeometry(geometry);
      }

      if (workerDrawMode === 'circle' && startPoint) {
        const current: [number, number] = [event.lngLat.lng, event.lngLat.lat];
        const radiusMeters = maplibregl.LngLat.convert(startPoint).distanceTo(maplibregl.LngLat.convert(current));
        const geometry = circleToPolygon(startPoint, Math.max(4, radiusMeters));
        setWorkerDraftGeometry(geometry);
      }

      if (workerDrawMode === 'freehand') {
        const point: [number, number] = [event.lngLat.lng, event.lngLat.lat];
        const last = freehandPoints[freehandPoints.length - 1];
        if (!last || maplibregl.LngLat.convert(last).distanceTo(maplibregl.LngLat.convert(point)) > 4) {
          freehandPoints.push(point);
          const geometry = freehandToPolygon(freehandPoints);
          if (geometry) setWorkerDraftGeometry(geometry);
        }
      }
    };

    const onMouseUp = (event: maplibregl.MapMouseEvent) => {
      if (!isMouseDown) return;
      isMouseDown = false;

      if (workerDrawMode === 'rectangle' && startPoint) {
        const geometry = rectangleToPolygon(startPoint, [event.lngLat.lng, event.lngLat.lat]);
        finishDrawing(geometry);
        startPoint = null;
        return;
      }

      if (workerDrawMode === 'circle' && startPoint) {
        const current: [number, number] = [event.lngLat.lng, event.lngLat.lat];
        const radiusMeters = maplibregl.LngLat.convert(startPoint).distanceTo(maplibregl.LngLat.convert(current));
        const geometry = circleToPolygon(startPoint, Math.max(4, radiusMeters));
        finishDrawing(geometry);
        startPoint = null;
        return;
      }

      if (workerDrawMode === 'freehand') {
        const geometry = freehandToPolygon(freehandPoints);
        finishDrawing(geometry);
        freehandPoints = [];
      }
    };

    const onClick = (event: maplibregl.MapMouseEvent) => {
      if (workerDrawMode !== 'polygon') return;
      if (polygonPoints.length === 0) {
        beginDrawing();
      }
      polygonPoints = [...polygonPoints, [event.lngLat.lng, event.lngLat.lat]];
      const geometry = polygonFromVertices(polygonPoints);
      if (geometry) setWorkerDraftGeometry(geometry);
    };

    const onDoubleClick = (event: maplibregl.MapMouseEvent & { originalEvent?: Event }) => {
      if (workerDrawMode !== 'polygon') return;
      event.originalEvent?.preventDefault();
      const geometry = polygonFromVertices(polygonPoints);
      finishDrawing(geometry);
      polygonPoints = [];
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      isMouseDown = false;
      polygonPoints = [];
      freehandPoints = [];
      startPoint = null;
      finishDrawing(null, true);
    };

    map.on('mousedown', onMouseDown);
    map.on('mousemove', onMouseMove);
    map.on('mouseup', onMouseUp);
    map.on('click', onClick);
    map.on('dblclick', onDoubleClick);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      map.off('mousedown', onMouseDown);
      map.off('mousemove', onMouseMove);
      map.off('mouseup', onMouseUp);
      map.off('click', onClick);
      map.off('dblclick', onDoubleClick);
      window.removeEventListener('keydown', onKeyDown);
      map.dragPan.enable();
      map.doubleClickZoom.enable();
      map.getCanvas().style.cursor = '';
      setWorkerDraftGeometry(null);
    };
  }, [engine, isWorkerMode, rawMapRef, workerDrawMode]);

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

    const sourceId = 'worker-crew-source';
    const layerId = 'worker-crew-layer';

    const upsertWorkers = () => {
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: EMPTY_FEATURE_COLLECTION,
        });
      }
      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: 'symbol',
          source: sourceId,
          layout: {
            'text-field': ['get', 'emoji'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 10, 12, 14, 16, 18, 22],
            'text-allow-overlap': true,
            'text-ignore-placement': true,
          },
          paint: {
            'text-color': '#111827',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.2,
          },
        });
      }

      const source = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
      if (!source) return;

      if (!isWorkerMode) {
        source.setData(EMPTY_FEATURE_COLLECTION);
        return;
      }

      source.setData(
        buildWorkerFeatureCollection(
          workerAreaGeometry,
          workerTaskType,
          buildingsRef.current,
          workerSimTick,
        ),
      );

      if (map.getLayer(layerId)) {
        try {
          map.moveLayer(layerId);
        } catch {
          // style not fully ready
        }
      }
    };

    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    const onIdle = () => {
      if (!isWorkerMode || !workerAreaGeometry) return;
      if (idleTimer != null) window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        idleTimer = null;
        upsertWorkers();
      }, 150);
    };

    const onStyleLoad = () => {
      upsertWorkers();
    };

    map.on('idle', onIdle);

    if (map.isStyleLoaded()) {
      upsertWorkers();
    } else {
      map.once('load', onStyleLoad);
    }

    return () => {
      map.off('idle', onIdle);
      if (idleTimer != null) window.clearTimeout(idleTimer);
      map.off('load', onStyleLoad);
    };
  }, [
    engine,
    isWorkerMode,
    loadingBuildings,
    rawMapRef,
    workerAreaGeometry,
    workerTaskType,
    workerSimTick,
    zoom,
  ]);

  useEffect(() => {
    if (engine !== 'maplibre') return;
    const map = rawMapRef.current as maplibregl.Map | null;
    if (!map) return;
    const layerId = 'worker-crew-layer';

    const onClickWorker = (event: maplibregl.MapLayerMouseEvent) => {
      if (!isWorkerMode) return;
      const feature = event.features?.[0];
      if (!feature) return;
      const props = (feature.properties ?? {}) as Partial<WorkerFeatureProps>;
      const id = Number(props.worker_id ?? 0);
      if (!id) return;
      const geometry = feature.geometry;
      const coords = geometry?.type === 'Point' ? geometry.coordinates : null;
      const parsedLng = Array.isArray(coords) ? Number(coords[0]) : null;
      const parsedLat = Array.isArray(coords) ? Number(coords[1]) : null;
      if (parsedLat == null || parsedLng == null || !Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return;
      setSelectedWorker({
        emoji: String(props.emoji ?? '👷'),
        worker_id: id,
        worker_name: String(props.worker_name ?? getWorkerRandomName(id, workerTaskType)),
        activity: String(props.activity ?? getWorkerActivity(workerTaskType)),
        lat: parsedLat,
        lng: parsedLng,
      });
    };

    const onMouseEnter = () => {
      if (!isWorkerMode) return;
      map.getCanvas().style.cursor = 'pointer';
    };
    const onMouseLeave = () => {
      map.getCanvas().style.cursor = '';
    };

    map.on('click', layerId, onClickWorker);
    map.on('mouseenter', layerId, onMouseEnter);
    map.on('mouseleave', layerId, onMouseLeave);
    return () => {
      map.off('click', layerId, onClickWorker);
      map.off('mouseenter', layerId, onMouseEnter);
      map.off('mouseleave', layerId, onMouseLeave);
      map.getCanvas().style.cursor = '';
    };
  }, [engine, rawMapRef, isWorkerMode, workerTaskType]);

  useEffect(() => {
    if (engine !== 'maplibre') return;
    if (!isWorkerMode || !selectedWorker) return;
    const map = rawMapRef.current as maplibregl.Map | null;
    if (!map) return;

    const stat = workerStats[selectedWorker.worker_id];
    const popupHtml = `
      <div style="min-width:230px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;color:#172033;">
        <div style="font-size:11px;color:#5b6b84;margin-bottom:4px;">Worker details</div>
        <div style="font-size:15px;font-weight:700;line-height:1.3;">
          ${selectedWorker.emoji} ${selectedWorker.worker_name}
        </div>
        <div style="margin-top:4px;font-size:12px;color:#3d4f6a;">
          ID: ${selectedWorker.worker_id} · ${selectedWorker.activity}
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px;">
          <div style="border:1px solid #d6deea;border-radius:8px;padding:6px 7px;background:#fff;">
            <div style="font-size:10px;color:#5b6b84;">Sun</div>
            <div style="font-size:12px;font-weight:600;color:#172033;">${stat?.sunMinutes ?? 0} min</div>
          </div>
          <div style="border:1px solid #d6deea;border-radius:8px;padding:6px 7px;background:#fff;">
            <div style="font-size:10px;color:#5b6b84;">Shade</div>
            <div style="font-size:12px;font-weight:600;color:#172033;">${stat?.shadeMinutes ?? 0} min</div>
          </div>
          <div style="border:1px solid #d6deea;border-radius:8px;padding:6px 7px;background:#fff;">
            <div style="font-size:10px;color:#5b6b84;">Focus</div>
            <div style="font-size:12px;font-weight:600;color:#172033;">${(stat?.focusScore ?? 0).toFixed(1)}</div>
          </div>
        </div>
      </div>
    `;

    const popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: '280px',
      offset: 20,
    })
      .setLngLat([selectedWorker.lng, selectedWorker.lat])
      .setHTML(popupHtml)
      .addTo(map);

    popup.on('close', () => {
      setSelectedWorker((prev) => (prev?.worker_id === selectedWorker.worker_id ? null : prev));
    });

    return () => {
      popup.remove();
    };
  }, [engine, isWorkerMode, rawMapRef, selectedWorker, workerStats]);

  useEffect(() => {
    if (!workerSimRunning || !isWorkerMode || !workerAreaGeometry) return;
    const stepMinutes = 60;
    const startMinute = 9 * 60;
    const endMinute = 17 * 60;
    const shadowWarmupMs = Math.min(1200, Math.max(450, Math.floor(workerSimSpeedMs * 0.6)));
    let minute = startMinute;
    let tick = 0;

    const runSamplingStep = async () => {
      if (workerSimBusyRef.current) return;
      const activeShadow = shadowRef.current;
      if (!activeShadow) return;
      workerSimBusyRef.current = true;
      try {
        setSliderRef.current(minute);
        setWorkerSimMinute(minute);
        applyShadowDateForSimMinute(shadowRef.current, controllerRef.current, dateStrRef.current, minute);
        tick += 1;
        setWorkerSimTick(tick);
        await new Promise((resolve) => window.setTimeout(resolve, shadowWarmupMs));

        const featureCollection = buildWorkerFeatureCollection(
          workerAreaGeometry,
          workerTaskType,
          buildingsRef.current,
          tick,
        );
        const workerPoints = featureCollection.features
          .filter((f) => f.geometry?.type === 'Point')
          .map((f) => {
            const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates;
            const props = (f.properties ?? {}) as Partial<WorkerFeatureProps>;
            return {
              lat,
              lng,
              id: Number(props.worker_id ?? 0),
            };
          });
        const exposureResults = await Promise.all(workerPoints.map(async (point) => {
          try {
            const screenPoint = controllerRef.current.getContainerPoint({ lat: point.lat, lng: point.lng });
            if (!screenPoint) return false;
            return await activeShadow.isPositionInSun(screenPoint);
          } catch {
            return false;
          }
        }));
        setWorkerStats((prev) => {
          const next = { ...prev };
          for (let i = 0; i < exposureResults.length; i += 1) {
            const worker = workerPoints[i];
            const inSun = exposureResults[i];
            const noonPenalty = minute >= 12 * 60 && minute < 15 * 60 ? 0.2 : 0;
            const focusGain = inSun ? Math.max(0.35, 0.75 - noonPenalty) : 1.0;
            const curr = next[worker.id] ?? { sunMinutes: 0, shadeMinutes: 0, focusScore: 0 };
            next[worker.id] = {
              sunMinutes: curr.sunMinutes + (inSun ? stepMinutes : 0),
              shadeMinutes: curr.shadeMinutes + (!inSun ? stepMinutes : 0),
              focusScore: curr.focusScore + focusGain * stepMinutes,
            };
          }
          return next;
        });
        if (minute >= endMinute) {
          setWorkerSimRunning(false);
          return;
        }
        minute = Math.min(endMinute, minute + stepMinutes);
      } finally {
        workerSimBusyRef.current = false;
      }
    };

    setSliderRef.current(startMinute);
    setWorkerSimMinute(startMinute);
    applyShadowDateForSimMinute(shadowRef.current, controllerRef.current, dateStrRef.current, startMinute);
    workerSimStartTimeoutRef.current = window.setTimeout(() => {
      void runSamplingStep();
      workerSimTimerRef.current = window.setInterval(() => {
        void runSamplingStep();
      }, workerSimSpeedMs);
    }, shadowWarmupMs);

    return () => {
      if (workerSimStartTimeoutRef.current != null) {
        window.clearTimeout(workerSimStartTimeoutRef.current);
        workerSimStartTimeoutRef.current = null;
      }
      if (workerSimTimerRef.current != null) {
        window.clearInterval(workerSimTimerRef.current);
        workerSimTimerRef.current = null;
      }
      workerSimBusyRef.current = false;
    };
  }, [
    workerSimRunning,
    isWorkerMode,
    workerAreaGeometry,
    workerTaskType,
    workerSimSpeedMs,
    buildingsRef,
  ]);

  useEffect(() => {
    if (engine !== 'maplibre') return;
    const map = rawMapRef.current as maplibregl.Map | null;
    if (!map) return;

    const applySunWallsVisibility = () => {
      if (!map.getLayer(SUN_WALLS_LAYER_ID)) return;
      map.setLayoutProperty(
        SUN_WALLS_LAYER_ID,
        'visibility',
        isWorkerMode ? 'none' : 'visible',
      );
    };

    if (map.isStyleLoaded()) {
      applySunWallsVisibility();
      return;
    }
    map.once('load', applySunWallsVisibility);
  }, [engine, rawMapRef, isWorkerMode]);

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
    // In sun-exposure mode, frequent setDate can race WebGL buffers — skip unless
    // worker sim is driving the clock (then we need live shadows each hour).
    if (sunExposure && !(isWorkerMode && workerSimRunning)) return;
    if (!shadow || !isMapReadyForShadeOps(controller)) return;
    try {
      shadow.setDate(dt.date);
    } catch {
      return;
    }
  }, [dt.date, sunExposure, shadow, controller, isWorkerMode, workerSimRunning]);

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
  }, [shadow, controller, buildingsRef, dt.dateStr, isTreeMode, isWorkerMode]);

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

  function startWorkerSimulation() {
    if (!workerAreaGeometry) return;
    if (workerSimTimerRef.current != null) {
      window.clearInterval(workerSimTimerRef.current);
      workerSimTimerRef.current = null;
    }
    workerSimBusyRef.current = false;
    setWorkerStats({});
    setSelectedWorker(null);
    setWorkerSimTick(0);
    setWorkerSimMinute(9 * 60);
    setWorkerSimRunning(true);
    setSunExposure(false);
    dt.setSlider(9 * 60);
  }

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

      {!isTreeMode && !isWorkerMode && clickInfo?.predictedBestSide && clickInfo.screenX != null && clickInfo.screenY != null && (
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

      {isWorkerMode && (
        <div className="map-panel absolute right-4 top-[8.5rem] z-[1000] w-[320px] max-w-[calc(100vw-2rem)] rounded-xl p-4 text-[var(--ink)] md:top-4">
          <div className="ui-mono text-[11px] text-[var(--ink-soft)]">Worker rotation monitor</div>
          <h3 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[var(--blue-strong)]">Plan safer field shifts</h3>

          <div className="mt-3 rounded-xl border border-[color:var(--line)] bg-white/80 p-3">
            <div className="ui-mono text-[10px] text-[var(--ink-soft)]">Analysis mode</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                onClick={() => setSunExposure(false)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium ${!sunExposure
                  ? 'border-[color:var(--blue-strong)] bg-[var(--blue-strong)] text-white'
                  : 'border-[color:var(--line)] bg-[var(--surface)] text-[var(--ink-soft)]'}`}
              >
                Shadows
              </button>
              <button
                onClick={() => setSunExposure(true)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium ${sunExposure
                  ? 'border-[color:var(--blue-strong)] bg-[var(--blue-strong)] text-white'
                  : 'border-[color:var(--line)] bg-[var(--surface)] text-[var(--ink-soft)]'}`}
              >
                Exposure
              </button>
            </div>

            {engine === 'maplibre' && (
              <>
                <div className="mt-3 ui-mono text-[10px] text-[var(--ink-soft)]">View</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setIs3D(false)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${!is3D
                      ? 'border-[color:var(--blue-strong)] bg-[var(--blue-strong)] text-white'
                      : 'border-[color:var(--line)] bg-[var(--surface)] text-[var(--ink-soft)]'}`}
                  >
                    2D
                  </button>
                  <button
                    onClick={() => setIs3D(true)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${is3D
                      ? 'border-[color:var(--blue-strong)] bg-[var(--blue-strong)] text-white'
                      : 'border-[color:var(--line)] bg-[var(--surface)] text-[var(--ink-soft)]'}`}
                  >
                    3D
                  </button>
                </div>

                <div className="mt-3 ui-mono text-[10px] text-[var(--ink-soft)]">Base map</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setIsSatellite(false)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${!isSatellite
                      ? 'border-[color:var(--blue-strong)] bg-[var(--blue-strong)] text-white'
                      : 'border-[color:var(--line)] bg-[var(--surface)] text-[var(--ink-soft)]'}`}
                  >
                    Standard
                  </button>
                  <button
                    onClick={() => setIsSatellite(true)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${isSatellite
                      ? 'border-[color:var(--blue-strong)] bg-[var(--blue-strong)] text-white'
                      : 'border-[color:var(--line)] bg-[var(--surface)] text-[var(--ink-soft)]'}`}
                  >
                    Satellite
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="mt-3 rounded-xl border border-[color:var(--line)] bg-white/80 p-3">
            <div className="ui-mono text-[10px] text-[var(--ink-soft)]">Step 1</div>
            <div className="mt-1 text-sm text-[var(--ink)]">Task type</div>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setWorkerTaskType('facade_maintenance')}
                className={`rounded-full border px-2.5 py-1 text-[11px] ${workerTaskType === 'facade_maintenance'
                  ? 'border-[color:var(--blue-strong)] bg-[var(--blue-strong)] text-white'
                  : 'border-[color:var(--line)] bg-[var(--surface)] text-[var(--ink)]'}`}
              >
                Facade maintenance
              </button>
              <button
                onClick={() => setWorkerTaskType('road_repair')}
                className={`rounded-full border px-2.5 py-1 text-[11px] ${workerTaskType === 'road_repair'
                  ? 'border-[color:var(--blue-strong)] bg-[var(--blue-strong)] text-white'
                  : 'border-[color:var(--line)] bg-[var(--surface)] text-[var(--ink)]'}`}
              >
                Road repair
              </button>
            </div>
            <div className="mt-2 ui-mono text-[10px] text-[var(--ink-soft)]">
              Workday exposure window: 09:00 - 17:00
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-[color:var(--line)] bg-white/80 p-3">
            <div className="ui-mono text-[10px] text-[var(--ink-soft)]">Step 2</div>
            <div className="mt-1 text-sm text-[var(--ink)]">Select work zone on map</div>
            <div className="mt-2 flex flex-wrap gap-1">
              {(['rectangle', 'circle', 'polygon', 'freehand'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setWorkerDrawMode((prev) => (prev === mode ? null : mode));
                    setWorkerDraftGeometry(null);
                  }}
                  className={`rounded-md border px-2 py-1 text-[11px] capitalize ${workerDrawMode === mode
                    ? 'border-[color:var(--blue-strong)] bg-[var(--blue-strong)] text-white'
                    : 'border-[color:var(--line)] bg-[var(--surface)] text-[var(--ink)]'}`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="ui-mono text-[11px] text-[var(--ink-soft)]">
                {workerDrawMode ? `Draw mode: ${workerDrawMode}` : 'Choose draw mode to start'}
              </span>
              {workerAreaKm2 != null && (
                <span className="ui-mono text-[11px] text-[var(--ink-soft)]">
                  {workerAreaKm2.toFixed(2)} km2
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-[color:var(--line)] bg-white/80 p-3">
            <div className="ui-mono text-[10px] text-[var(--ink-soft)]">Step 3</div>
            <div className="mt-1 text-sm text-[var(--ink)]">Run simulation (09:00 - 17:00)</div>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={startWorkerSimulation}
                disabled={!workerAreaGeometry || workerSimRunning}
                className="rounded-lg border border-[color:var(--blue-strong)] bg-[var(--blue-strong)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--blue)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Start
              </button>
              <span className="ui-mono text-[11px] text-[var(--ink-soft)]">
                {minuteToClockLabel(workerSimMinute)}
              </span>
            </div>

            <div className="mt-2">
              <div className="ui-mono text-[10px] text-[var(--ink-soft)]">Speed</div>
              <input
                type="range"
                min={600}
                max={2600}
                step={100}
                value={workerSimSpeedMs}
                className="time-slider mt-1"
                style={{ '--pct': `${((workerSimSpeedMs - 600) / 2000) * 100}%` } as React.CSSProperties}
                onChange={(event) => setWorkerSimSpeedMs(Number(event.target.value))}
                disabled={workerSimRunning}
              />
              <div className="mt-1 ui-mono text-[10px] text-[var(--ink-soft)]">
                {workerSimSpeedMs} ms per step ({workerSimRunning ? 'running' : 'ready'})
              </div>
            </div>
          </div>

          {selectedWorker && (
            <div className="mt-3 rounded-xl border border-[color:var(--line)] bg-white/80 p-3">
              <div className="ui-mono text-[10px] text-[var(--ink-soft)]">Worker details</div>
              <div className="mt-1 text-sm font-medium text-[var(--ink)]">
                {selectedWorker.emoji} {selectedWorker.worker_name}
              </div>
              <div className="mt-1 text-[11px] text-[var(--ink-soft)]">
                ID: {selectedWorker.worker_id} · {selectedWorker.activity}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                <div className="rounded-lg border border-[color:var(--line)] bg-white px-2 py-1.5">
                  <div className="ui-mono text-[10px] text-[var(--ink-soft)]">Sun</div>
                  <div className="font-medium text-[var(--ink)]">{workerStats[selectedWorker.worker_id]?.sunMinutes ?? 0} min</div>
                </div>
                <div className="rounded-lg border border-[color:var(--line)] bg-white px-2 py-1.5">
                  <div className="ui-mono text-[10px] text-[var(--ink-soft)]">Shade</div>
                  <div className="font-medium text-[var(--ink)]">{workerStats[selectedWorker.worker_id]?.shadeMinutes ?? 0} min</div>
                </div>
                <div className="rounded-lg border border-[color:var(--line)] bg-white px-2 py-1.5">
                  <div className="ui-mono text-[10px] text-[var(--ink-soft)]">Focus</div>
                  <div className="font-medium text-[var(--ink)]">{(workerStats[selectedWorker.worker_id]?.focusScore ?? 0).toFixed(1)}</div>
                </div>
              </div>
            </div>
          )}

          {!selectedWorker && (
            <div className="mt-3 rounded-xl border border-[color:var(--line)] bg-white/80 p-3 text-[11px] text-[var(--ink-soft)]">
              Click any worker on map to see personal stats and activity.
            </div>
          )}

        </div>
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
    </div>
  );
}
