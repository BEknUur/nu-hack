import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import maplibregl from 'maplibre-gl';
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
import { findBuildingAtPoint } from '@/utils/buildings';
import type { SelectedBuilding } from '@/types/building';
import type { MapBounds, MapPoint } from '@/types/map-engine';
import { setupLeafletStaticLayer } from '@/pages/MapPage/leafletStaticLayer';
import { renderLeafletSelectedBuildingLayer } from '@/pages/MapPage/leafletSelectionLayer';
import { buildBestSideHighlightFeatureCollection } from '@/utils/bestSideHighlight';
import { OSM_TILE_URLS, SATELLITE_TILE_URLS } from '@/hooks/maplibre/constants';

function isMapReadyForShadeOps(engineController: { isReady: () => boolean }) {
  return engineController.isReady();
}

function sideToLabel(side: 'N' | 'E' | 'S' | 'W' | null | undefined) {
  if (side === 'N') return 'North';
  if (side === 'E') return 'East';
  if (side === 'S') return 'South';
  if (side === 'W') return 'West';
  return null;
}

export default function MapPage() {
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
  }, [shadow, controller, buildingsRef, dt.dateStr]);

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

      {clickInfo?.predictedBestSide && clickInfo.screenX != null && clickInfo.screenY != null && (
        <div
          className="pointer-events-none absolute z-[990] -translate-x-1/2 -translate-y-full rounded-lg border border-[color:var(--line)] bg-[rgba(251,248,241,0.96)] px-3 py-2 text-[11px] font-medium text-[var(--blue-strong)] shadow-[0_10px_20px_rgba(23,32,51,0.12)] backdrop-blur-md"
          style={{
            left: `${clickInfo.screenX}px`,
            top: `${clickInfo.screenY - 12}px`,
          }}
        >
          {sideToLabel(clickInfo.predictedBestSide) ?? clickInfo.predictedBestSide}
          {clickInfo.predictedConfidence !== null && clickInfo.predictedConfidence !== undefined && (
            <span className="ml-2 ui-mono text-[var(--ink-soft)]">
              {Math.round(clickInfo.predictedConfidence * 100)}%
            </span>
          )}
        </div>
      )}

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

      <TimeSliderBar
        sliderValue={dt.sliderValue}
        sliderPct={dt.sliderPct}
        timeLabel={dt.timeLabel}
        onSliderChange={handleTimeSliderChange}
      />

      {clickInfo && (
        <SunInfoPopup info={clickInfo} onClose={() => {
          setClickInfo(null);
          setSelectedBuilding(null);
        }} />
      )}
    </div>
  );
}
