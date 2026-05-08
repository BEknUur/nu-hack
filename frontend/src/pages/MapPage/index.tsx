import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { SUN_EXPOSURE_CONFIG } from '@/config/map';
import { useDateTime } from '@/hooks/useDateTime';
import { useMapEngine } from '@/hooks/useMapEngine';
import { astanaLocalToDate } from '@/utils/astanaTime';
import type { ClickInfo } from '@/types/map';
import type { GeocodingResult } from '@/services/geocoding';
import { getBuildingMetadata } from '@/services/buildingDetails';
import MapView from '@/components/MapView';
import ControlPanel from '@/components/ControlPanel';
import TimeSliderBar from '@/components/TimeSliderBar';
import MapContextMenu from '@/components/MapContextMenu';
import SunInfoPopup from '@/components/SunInfoPopup';
import SearchBar from '@/components/SearchBar';
import { findBuildingAtPoint } from '@/utils/buildings';
import type { MapBounds, MapPoint } from '@/types/map-engine';
import type { ContextMenuState } from '@/pages/MapPage/types';
import { setupLeafletStaticLayer } from '@/pages/MapPage/leafletStaticLayer';
import { OSM_TILE_URLS, SATELLITE_TILE_URLS } from '@/hooks/maplibre/constants';

function isMapReadyForShadeOps(engineController: { isReady: () => boolean }) {
  return engineController.isReady();
}

export default function MapPage() {
  const dt = useDateTime();
  const [sunExposure, setSunExposure] = useState(false);
  const [is3D, setIs3D] = useState(false);
  const [isSatellite, setIsSatellite] = useState(false);
  const [clickInfo, setClickInfo] = useState<ClickInfo | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const menuRequestIdRef = useRef(0);
  const staticDatasetLayerRef = useRef<L.GeoJSON | null>(null);
  const sunEdgesLayerRef = useRef<L.LayerGroup | null>(null);
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
    if (!shadow || !isMapReadyForShadeOps(controller)) return;
    try {
      shadow.setDate(dt.date);
    } catch {
      return;
    }
  }, [dt.date, shadow, controller]);

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
    let disposed = false;

    function handleClick(point: MapPoint) {
      if (suppressNextMapClickRef.current) {
        suppressNextMapClickRef.current = false;
        return;
      }

      const requestId = menuRequestIdRef.current + 1;
      menuRequestIdRef.current = requestId;
      setContextMenu(null);
      const pickedBuilding = findBuildingAtPoint(buildingsRef.current, point);
      if (!shadow) return;
      const screenPoint = controller.getContainerPoint(point);
      if (!screenPoint) return;
      setClickInfo({
        lat: point.lat,
        lng: point.lng,
        inSun: null,
        buildingId: pickedBuilding?.id ?? null,
        buildingLabel: pickedBuilding?.label ?? null,
        complexName: null,
        address: null,
        buildingInfoLoading: Boolean(pickedBuilding?.id),
        photoUrl: null,
        photoPlaceName: null,
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

    async function handleContextMenu(point: MapPoint) {
      if (disposed || !isMapReadyForShadeOps(controller)) return;
      if (!shadow) return;

      const requestId = menuRequestIdRef.current + 1;
      menuRequestIdRef.current = requestId;

      setClickInfo(null);
      const screenPoint = controller.getContainerPoint(point);
      if (!screenPoint) return;
      setContextMenu({
        x: screenPoint.x + 8,
        y: screenPoint.y - 8,
        lat: point.lat,
        lng: point.lng,
        annualSunHours: null,
        dailySunHours: null,
        loadingInfo: true,
        error: null,
      });

      const dayStart = astanaLocalToDate(dt.dateStr, 0, 0);
      const dayEnd = astanaLocalToDate(dt.dateStr, 23, 59);
      const [year] = dt.dateStr.split('-').map(Number);
      const yearStart = astanaLocalToDate(`${year}-01-01`, 0, 0);
      const yearEnd = astanaLocalToDate(`${year}-12-31`, 23, 59);

      try {
        if (disposed || !isMapReadyForShadeOps(controller)) return;
        await shadow.setSunExposure(true, { startDate: dayStart, endDate: dayEnd, iterations: 48 });
        if (disposed || !isMapReadyForShadeOps(controller)) return;
        const dailySunHours = await shadow.getHoursOfSun(screenPoint);

        if (disposed || !isMapReadyForShadeOps(controller)) return;
        await shadow.setSunExposure(true, { startDate: yearStart, endDate: yearEnd, iterations: 96 });
        if (disposed || !isMapReadyForShadeOps(controller)) return;
        const annualSunHours = await shadow.getHoursOfSun(screenPoint);

        if (menuRequestIdRef.current !== requestId) return;
        setContextMenu((prev) => (prev
          ? {
              ...prev,
              dailySunHours,
              annualSunHours,
              loadingInfo: false,
            }
          : null));
      } catch {
        if (menuRequestIdRef.current !== requestId) return;
        setContextMenu((prev) => (prev
          ? {
              ...prev,
              loadingInfo: false,
              error: 'Failed to load',
            }
          : null));
      } finally {
        if (!disposed && isMapReadyForShadeOps(controller)) {
          await shadow.setSunExposure(sunExposure, {
            ...getDefaultSunExposureRange(dt.dateStr),
          });
        }
      }
    }

    const unsubscribeClick = controller.onClick(handleClick);
    const unsubscribeContextMenu = controller.onContextMenu(handleContextMenu);
    return () => {
      disposed = true;
      unsubscribeClick();
      unsubscribeContextMenu();
    };
  }, [shadow, controller, buildingsRef, dt.dateStr, sunExposure]);

  // Search result → fly to location
  function handleSearchSelect(result: GeocodingResult) {
    const [south, north, west, east] = result.boundingBox;
    const bounds: MapBounds = { south, north, west, east };
    controller.flyToBounds(bounds, { duration: 1.2, padding: [40, 40] });
  }

  // Load precomputed static dataset (best building side to receive sunlight)
  useEffect(() => {
    if (engine !== 'leaflet') return;
    return setupLeafletStaticLayer({
      rawMapRef,
      staticDatasetLayerRef,
      sunEdgesLayerRef,
      suppressNextMapClickRef,
      setContextMenu: () => setContextMenu(null),
      setClickInfo: () => setClickInfo(null),
    });
  }, [engine, rawMapRef]);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <MapView containerRef={containerRef} />

      <SearchBar onSelect={handleSearchSelect} />

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
        onSliderChange={dt.setSlider}
      />

      {contextMenu && (
        <MapContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          lat={contextMenu.lat}
          lng={contextMenu.lng}
          annualSunHours={contextMenu.annualSunHours}
          dailySunHours={contextMenu.dailySunHours}
          loadingInfo={contextMenu.loadingInfo}
          error={contextMenu.error}
          onShadows={() => {
            setSunExposure(false);
            menuRequestIdRef.current += 1;
            setContextMenu(null);
          }}
          onCenterMap={() => {
            const point: MapPoint = { lat: contextMenu.lat, lng: contextMenu.lng };
            controller.panTo(point, { animate: true, duration: 0.5 });
            menuRequestIdRef.current += 1;
            setContextMenu(null);
          }}
          onClose={() => {
            menuRequestIdRef.current += 1;
            setContextMenu(null);
          }}
        />
      )}

      {clickInfo && (
        <SunInfoPopup info={clickInfo} onClose={() => setClickInfo(null)} />
      )}
    </div>
  );
}
