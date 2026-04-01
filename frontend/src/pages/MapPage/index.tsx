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

export default function MapPage() {
  const { messages, language } = useTranslation();
  const { caseId } = useParams();
  const isTreeMode = caseId === 'trees';
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
  }, [shadow, controller, buildingsRef, dt.dateStr, isTreeMode]);

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

      {!isTreeMode && clickInfo?.predictedBestSide && clickInfo.screenX != null && clickInfo.screenY != null && (
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
    </div>
  );
}
