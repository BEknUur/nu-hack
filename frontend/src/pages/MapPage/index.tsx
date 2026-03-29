import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MAP_CONFIG, SUN_EXPOSURE_CONFIG } from '@/config/map';
import { useDateTime } from '@/hooks/useDateTime';
import { useMapEngine } from '@/hooks/useMapEngine';
import { astanaLocalToDate } from '@/utils/astanaTime';
import type { ClickInfo } from '@/types/map';
import type { GeocodingResult } from '@/services/geocoding';
import MapView from '@/components/MapView';
import ControlPanel from '@/components/ControlPanel';
import TimeSliderBar from '@/components/TimeSliderBar';
import MapContextMenu from '@/components/MapContextMenu';
import SunInfoPopup from '@/components/SunInfoPopup';
import SearchBar from '@/components/SearchBar';
import BuildingDetailsPanel from '@/components/BuildingDetailsPanel';
import type { SelectedBuilding } from '@/types/building';
import { findBuildingAtPoint, toSelectedBuilding } from '@/utils/buildings';
import type { MapBounds, MapPoint } from '@/types/map-engine';

interface ContextMenuState {
  x: number;
  y: number;
  lat: number;
  lng: number;
  annualSunHours: number | null;
  dailySunHours: number | null;
  loadingInfo: boolean;
  error: string | null;
}

type OverlayFeature = GeoJSON.Feature & {
  __bbox?: {
    minLng: number;
    minLat: number;
    maxLng: number;
    maxLat: number;
  };
};

const MAX_VISIBLE_STATIC_FEATURES = 4500;

const SIDE_BEARINGS: Record<'N' | 'E' | 'S' | 'W', number> = {
  N: 0,
  E: 90,
  S: 180,
  W: 270,
};

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number) {
  return (rad * 180) / Math.PI;
}

function norm360(deg: number) {
  return ((deg % 360) + 360) % 360;
}

function angleDiff(a: number, b: number) {
  const d = Math.abs(norm360(a) - norm360(b));
  return d > 180 ? 360 - d : d;
}

function bearingFromAtoB(a: [number, number], b: [number, number]) {
  const latMeters = 111_320;
  const lngMeters = 111_320 * Math.cos(toRad((a[1] + b[1]) / 2));
  const dx = (b[0] - a[0]) * lngMeters;
  const dy = (b[1] - a[1]) * latMeters;
  return norm360(toDeg(Math.atan2(dx, dy)));
}

function polygonOuterRing(feature: GeoJSON.Feature): [number, number][] | null {
  const geometry = feature.geometry;
  if (!geometry) return null;
  if (geometry.type === 'Polygon') {
    return (geometry.coordinates[0] ?? []) as [number, number][];
  }
  if (geometry.type === 'MultiPolygon') {
    const firstPolygon = geometry.coordinates[0];
    return (firstPolygon?.[0] ?? []) as [number, number][];
  }
  return null;
}

function collectCoords(geometry: GeoJSON.Geometry): [number, number][] {
  if (geometry.type === 'Polygon') {
    return geometry.coordinates.flat() as [number, number][];
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.flat(2) as [number, number][];
  }
  return [];
}

function buildFeatureBBox(feature: GeoJSON.Feature): OverlayFeature['__bbox'] {
  const geometry = feature.geometry;
  if (!geometry) return undefined;
  const coords = collectCoords(geometry);
  if (!coords.length) return undefined;

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }

  return { minLng, minLat, maxLng, maxLat };
}

function featureIntersectsBounds(feature: OverlayFeature, bounds: L.LatLngBounds): boolean {
  const bbox = feature.__bbox;
  if (!bbox) return false;
  return !(
    bbox.maxLng < bounds.getWest() ||
    bbox.minLng > bounds.getEast() ||
    bbox.maxLat < bounds.getSouth() ||
    bbox.minLat > bounds.getNorth()
  );
}

function centroidOfRing(ring: [number, number][]) {
  if (!ring.length) return null;
  const sum = ring.reduce(
    (acc, [lng, lat]) => ({ lng: acc.lng + lng, lat: acc.lat + lat }),
    { lng: 0, lat: 0 },
  );
  return { lng: sum.lng / ring.length, lat: sum.lat / ring.length };
}

function isMapReadyForShadeOps(engineController: { isReady: () => boolean }) {
  return engineController.isReady();
}

export default function MapPage() {
  const dt = useDateTime();
  const [sunExposure, setSunExposure] = useState(false);
  const [clickInfo, setClickInfo] = useState<ClickInfo | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<SelectedBuilding | null>(null);
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

      menuRequestIdRef.current += 1;
      setContextMenu(null);
      const building = findBuildingAtPoint(buildingsRef.current, point);
      setSelectedBuilding(building);
      if (!shadow) return;
      const screenPoint = controller.getContainerPoint(point);
      if (!screenPoint) return;
      setClickInfo({ lat: point.lat, lng: point.lng, inSun: null });

      shadow.isPositionInSun(screenPoint)
        .then((inSun) => setClickInfo({ lat: point.lat, lng: point.lng, inSun }))
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

  useEffect(() => {
    if (engine !== 'leaflet') return;
    const map = rawMapRef.current as L.Map | null;
    selectedBuildingLayerRef.current?.remove();
    selectedBuildingLayerRef.current = null;

    if (!map || !selectedBuilding) return;

    const layerGroup = L.layerGroup();

    selectedBuilding.polygons.forEach((polygon) => {
      const latLngRings = [
        polygon.outer.map(([lng, lat]) => [lat, lng] as [number, number]),
        ...polygon.holes.map((hole) => hole.map(([lng, lat]) => [lat, lng] as [number, number])),
      ];

      L.polygon(latLngRings, {
        color: '#38bdf8',
        weight: 3,
        fillColor: '#38bdf8',
        fillOpacity: 0.18,
        opacity: 0.95,
      }).addTo(layerGroup);
    });

    layerGroup.addTo(map);
    selectedBuildingLayerRef.current = layerGroup;

    return () => {
      layerGroup.remove();
      if (selectedBuildingLayerRef.current === layerGroup) {
        selectedBuildingLayerRef.current = null;
      }
    };
  }, [engine, rawMapRef, selectedBuilding]);

  // Search result → fly to location
  function handleSearchSelect(result: GeocodingResult) {
    const [south, north, west, east] = result.boundingBox;
    const bounds: MapBounds = { south, north, west, east };
    controller.flyToBounds(bounds, { duration: 1.2, padding: [40, 40] });
  }

  // Load precomputed static dataset (best building side to receive sunlight)
  useEffect(() => {
    if (engine !== 'leaflet') return;
    let disposed = false;
    let rafId = 0;
    let mapEventHandlerAttached = false;
    let mapWithHandlers: L.Map | null = null;
    let onViewportChange: (() => void) | null = null;
    let allStaticFeatures: OverlayFeature[] = [];

    function renderVisibleStaticLayers() {
      const map = mapRef.current;
      if (!map || disposed || !allStaticFeatures.length) return;

      const visibleBounds = map.getBounds().pad(0.18);
      let visible = allStaticFeatures.filter((feature) => featureIntersectsBounds(feature, visibleBounds));
      if (visible.length > MAX_VISIBLE_STATIC_FEATURES) {
        visible = visible.slice(0, MAX_VISIBLE_STATIC_FEATURES);
      }

      staticDatasetLayerRef.current?.remove();
      sunEdgesLayerRef.current?.remove();
      const sunEdgesLayer = L.layerGroup();

      staticDatasetLayerRef.current = L.geoJSON(visible as GeoJSON.Feature[], {
        style: (feature) => {
          const props = (feature?.properties ?? {}) as {
            color?: string;
          };

          return {
            color: '#1f2937',
            weight: 1,
            fillColor: props.color ?? '#f59e0b',
            fillOpacity: 0.45,
          };
        },
        onEachFeature: (feature, layer) => {
          const props = (feature.properties ?? {}) as {
            id?: string;
            bestSide?: string;
            sidePct?: Partial<Record<'N' | 'E' | 'S' | 'W', number>>;
          };
          const pct = props.sidePct ?? {};
          const popup = [
            `<b>${props.id ?? 'Building'}</b>`,
            `Best side: <b>${props.bestSide ?? '-'}</b>`,
            `N: ${pct.N ?? 0}% | E: ${pct.E ?? 0}%`,
            `S: ${pct.S ?? 0}% | W: ${pct.W ?? 0}%`,
          ].join('<br/>');
          layer.bindPopup(popup);

          const bestSide = props.bestSide as 'N' | 'E' | 'S' | 'W' | undefined;
          if (!bestSide) return;

          const ring = polygonOuterRing(feature as GeoJSON.Feature);
          if (!ring || ring.length < 4) return;
          const center = centroidOfRing(ring);
          if (!center) return;
          const targetBearing = SIDE_BEARINGS[bestSide];
          const maxDeviation = 45;

          for (let i = 0; i < ring.length - 1; i += 1) {
            const a = ring[i];
            const b = ring[i + 1];
            const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
            const outwardBearing = bearingFromAtoB([center.lng, center.lat], mid);

            if (angleDiff(outwardBearing, targetBearing) > maxDeviation) continue;
            const latLngs: [number, number][] = [
              [a[1], a[0]],
              [b[1], b[0]],
            ];

            L.polyline(latLngs, {
              color: '#ffd54f',
              weight: 8,
              opacity: 0.18,
              lineCap: 'round',
            }).addTo(sunEdgesLayer);

            L.polyline(latLngs, {
              color: '#ffeb3b',
              weight: 3,
              opacity: 0.95,
              lineCap: 'round',
            }).addTo(sunEdgesLayer);
          }
        },
      }).addTo(map);

      sunEdgesLayerRef.current = sunEdgesLayer;
      if (map.getZoom() >= MAP_CONFIG.buildingsMinZoom) {
        sunEdgesLayer.addTo(map);
      }
    }

    async function loadStaticDatasetLayer() {
      const map = rawMapRef.current as L.Map | null;
      if (!map) return;
      try {
        const res = await fetch('/dataset/block-buildings.geojson');
        if (!res.ok) {
          console.warn('Static dataset not found at /dataset/block-buildings.geojson');
          return;
        }

        const geojson = await res.json() as GeoJSON.FeatureCollection;
        if (disposed) return;

        allStaticFeatures = geojson.features
          .filter((feature) => feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon')
          .map((feature) => {
            const f = feature as OverlayFeature;
            f.__bbox = buildFeatureBBox(f);
            return f;
          });

        staticDatasetLayerRef.current = L.geoJSON(geojson, {
          style: (feature) => {
            const props = (feature?.properties ?? {}) as {
              color?: string;
            };

            return {
              color: '#1f2937',
              weight: 1,
              fillColor: props.color ?? '#f59e0b',
              fillOpacity: 0.45,
            };
          },
          onEachFeature: (feature, layer) => {
            const props = (feature.properties ?? {}) as {
              id?: string;
              bestSide?: string;
              sidePct?: Partial<Record<'N' | 'E' | 'S' | 'W', number>>;
            };
            const pct = props.sidePct ?? {};
            const popup = [
              `<b>${props.id ?? 'Building'}</b>`,
              `Best side: <b>${props.bestSide ?? '-'}</b>`,
              `N: ${pct.N ?? 0}% | E: ${pct.E ?? 0}%`,
              `S: ${pct.S ?? 0}% | W: ${pct.W ?? 0}%`,
            ].join('<br/>');
            layer.bindPopup(popup);
            layer.on('click', () => {
              suppressNextMapClickRef.current = true;
              setContextMenu(null);
              setClickInfo(null);
              setSelectedBuilding(toSelectedBuilding(feature as GeoJSON.Feature));
            });

            const bestSide = props.bestSide as 'N' | 'E' | 'S' | 'W' | undefined;
            if (!bestSide) return;

            const ring = polygonOuterRing(feature as GeoJSON.Feature);
            if (!ring || ring.length < 4) return;
            const center = centroidOfRing(ring);
            if (!center) return;
            const targetBearing = SIDE_BEARINGS[bestSide];
            const maxDeviation = 45;

            for (let i = 0; i < ring.length - 1; i += 1) {
              const a = ring[i];
              const b = ring[i + 1];
              const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
              const outwardBearing = bearingFromAtoB([center.lng, center.lat], mid);

              if (angleDiff(outwardBearing, targetBearing) > maxDeviation) continue;
              const latLngs: [number, number][] = [
                [a[1], a[0]],
                [b[1], b[0]],
              ];

              L.polyline(latLngs, {
                color: '#ffd54f',
                weight: 8,
                opacity: 0.18,
                lineCap: 'round',
              }).addTo(sunEdgesLayer);

              L.polyline(latLngs, {
                color: '#ffeb3b',
                weight: 3,
                opacity: 0.95,
                lineCap: 'round',
              }).addTo(sunEdgesLayer);
            }
          },
        }).addTo(map);

        function updateSunEdgesVisibility() {
          const currentMap = rawMapRef.current as L.Map | null;
          if (!sunEdgesLayerRef.current || !currentMap) return;
          const shouldShow = currentMap.getZoom() >= MAP_CONFIG.buildingsMinZoom;
          if (shouldShow) {
            if (!currentMap.hasLayer(sunEdgesLayerRef.current)) {
              sunEdgesLayerRef.current.addTo(currentMap);
            }
          } else if (currentMap.hasLayer(sunEdgesLayerRef.current)) {
            currentMap.removeLayer(sunEdgesLayerRef.current);
          }
        }

        zoomHandler = updateSunEdgesVisibility;
        zoomHandlerMap = map;
        zoomHandlerAttached = true;
        map.on('zoomend', updateSunEdgesVisibility);

        sunEdgesLayerRef.current = sunEdgesLayer;
        updateSunEdgesVisibility();
        onViewportChange = renderVisibleStaticLayers;
        mapWithHandlers = map;
        mapEventHandlerAttached = true;
        map.on('moveend', onViewportChange);
        map.on('zoomend', onViewportChange);
        renderVisibleStaticLayers();
      } catch (err) {
        console.error('Failed to load static dataset layer:', err);
      }
    }

    function waitForMapAndLoad() {
      if (disposed) return;
      if (!rawMapRef.current) {
        rafId = window.requestAnimationFrame(waitForMapAndLoad);
        return;
      }
      void loadStaticDatasetLayer();
    }

    waitForMapAndLoad();
    return () => {
      disposed = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      if (mapEventHandlerAttached && mapWithHandlers && onViewportChange) {
        mapWithHandlers.off('moveend', onViewportChange);
        mapWithHandlers.off('zoomend', onViewportChange);
      }
      staticDatasetLayerRef.current?.remove();
      sunEdgesLayerRef.current?.remove();
      staticDatasetLayerRef.current = null;
      sunEdgesLayerRef.current = null;
    };
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
        zoom={zoom}
        loadingBuildings={loadingBuildings}
      />

      {selectedBuilding && (
        <BuildingDetailsPanel
          building={selectedBuilding}
          onClose={() => setSelectedBuilding(null)}
        />
      )}

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
