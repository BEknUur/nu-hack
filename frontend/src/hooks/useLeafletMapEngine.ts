import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ShadeMap from 'leaflet-shadow-simulator';
import { MAP_CONFIG, SHADE_CONFIG, TERRAIN_SOURCE } from '@/config/map';
import { loadBuildings } from '@/services/buildingSource';
import type {
  MapEngineController,
  MapEngineState,
  MapPoint,
  MapInteractionHandler,
} from '@/types/map-engine';
import type { ShadowEngineController, ScreenPoint, SunExposureOptions } from '@/types/shadow-engine';

interface UseLeafletMapEngineOptions {
  initialDate: Date;
  onLoadingChange: (loading: boolean) => void;
}

export interface LeafletMapRefs {
  mapRef: React.RefObject<L.Map | null>;
  shadeMapRef: React.RefObject<ShadeMap | null>;
}

function pointToLatLng(point: MapPoint): [number, number] {
  return [point.lat, point.lng];
}

export function useLeafletMapEngine({
  initialDate,
  onLoadingChange,
}: UseLeafletMapEngineOptions): MapEngineState & LeafletMapRefs {
  const initialDateRef = useRef(initialDate);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const shadeMapRef = useRef<ShadeMap | null>(null);
  const buildingsRef = useRef<GeoJSON.Feature[]>([]);
  const [zoom, setZoom] = useState<number>(MAP_CONFIG.zoom);
  const onLoadingChangeRef = useRef(onLoadingChange);
  onLoadingChangeRef.current = onLoadingChange;
  const featuresCacheRef = useRef<{ key: string; data: GeoJSON.Feature[]; ts: number } | null>(null);
  const inflightRequestRef = useRef<Promise<GeoJSON.Feature[]> | null>(null);
  const isDisposedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let disposed = false;
    let initRafId = 0;

    function initMapLayer() {
      if (disposed || !containerRef.current || mapRef.current) return;
      isDisposedRef.current = false;

      const map = L.map(containerRef.current, {
        center: MAP_CONFIG.center,
        zoom: MAP_CONFIG.zoom,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      L.tileLayer(MAP_CONFIG.tileUrl, {
        attribution: MAP_CONFIG.tileAttribution,
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
      map.on('zoom', () => setZoom(map.getZoom()));

      const shadeMap = new ShadeMap({
        date: initialDateRef.current,
        color: SHADE_CONFIG.color,
        opacity: SHADE_CONFIG.opacity,
        apiKey: import.meta.env.VITE_SHADEMAP_API_KEY as string,
        terrainSource: TERRAIN_SOURCE,
        getFeatures: async () => {
          const currentMap = mapRef.current;
          const mapPane = (currentMap as unknown as { _mapPane?: HTMLElement })._mapPane;
          if (isDisposedRef.current || !currentMap || !mapPane || currentMap.getZoom() < MAP_CONFIG.buildingsMinZoom) {
            buildingsRef.current = [];
            return [];
          }

          const bounds = currentMap.getBounds();
          const zoomBucket = Math.floor(currentMap.getZoom());
          const key = [
            zoomBucket,
            bounds.getSouth().toFixed(3),
            bounds.getWest().toFixed(3),
            bounds.getNorth().toFixed(3),
            bounds.getEast().toFixed(3),
          ].join(':');

          const cache = featuresCacheRef.current;
          if (cache && cache.key === key && Date.now() - cache.ts < 15_000) {
            buildingsRef.current = cache.data;
            return cache.data;
          }

          if (inflightRequestRef.current) {
            return inflightRequestRef.current;
          }

          onLoadingChangeRef.current(true);
          const request = loadBuildings({
            south: bounds.getSouth(),
            west: bounds.getWest(),
            north: bounds.getNorth(),
            east: bounds.getEast(),
          });
          inflightRequestRef.current = request;

          try {
            const features = await request;
            if (isDisposedRef.current) return [];
            featuresCacheRef.current = { key, data: features, ts: Date.now() };
            buildingsRef.current = features;
            return features;
          } catch (err) {
            console.warn('Failed to load buildings from Overpass:', err);
            buildingsRef.current = [];
            return [];
          } finally {
            inflightRequestRef.current = null;
            if (!isDisposedRef.current) {
              onLoadingChangeRef.current(false);
            }
          }
        },
      }).addTo(map);

      shadeMapRef.current = shadeMap;
    }

    initRafId = window.requestAnimationFrame(initMapLayer);

    return () => {
      disposed = true;
      if (initRafId) {
        window.cancelAnimationFrame(initRafId);
      }
      isDisposedRef.current = true;
      const currentMap = mapRef.current;
      const currentShadeMap = shadeMapRef.current;
      shadeMapRef.current = null;
      mapRef.current = null;

      if (currentShadeMap) {
        try {
          currentShadeMap.removeAllListeners();
        } catch {
          return;
        }
        try {
          currentShadeMap.onRemove();
        } catch {
          return;
        }
      }
      if (currentMap) {
        window.setTimeout(() => {
          try {
            currentMap.remove();
          } catch {
            return;
          }
        }, 0);
      }
    };
  }, []);

  const controller: MapEngineController = {
    isReady: () => {
      const map = mapRef.current as (L.Map & { _mapPane?: HTMLElement }) | null;
      return Boolean(map && map._mapPane);
    },
    getContainerPoint: (point) => {
      const map = mapRef.current;
      if (!map) return null;
      const containerPoint = map.latLngToContainerPoint(pointToLatLng(point));
      return { x: containerPoint.x, y: containerPoint.y };
    },
    flyToBounds: (bounds, options) => {
      mapRef.current?.flyToBounds(
        [[bounds.south, bounds.west], [bounds.north, bounds.east]],
        { duration: options?.duration, padding: options?.padding },
      );
    },
    panTo: (point, options) => {
      mapRef.current?.panTo(pointToLatLng(point), options);
    },
    onClick: (handler: MapInteractionHandler) => {
      const map = mapRef.current;
      if (!map) return () => {};
      const listener = (event: L.LeafletMouseEvent) => {
        void handler({ lat: event.latlng.lat, lng: event.latlng.lng });
      };
      map.on('click', listener);
      return () => {
        map.off('click', listener);
      };
    },
    onContextMenu: (handler: MapInteractionHandler) => {
      const map = mapRef.current;
      if (!map) return () => {};
      const listener = (event: L.LeafletMouseEvent) => {
        void handler({ lat: event.latlng.lat, lng: event.latlng.lng });
      };
      map.on('contextmenu', listener);
      return () => {
        map.off('contextmenu', listener);
      };
    },
    onMouseMove: (handler: MapInteractionHandler) => {
      const map = mapRef.current;
      if (!map) return () => {};
      const listener = (event: L.LeafletMouseEvent) => {
        void handler({ lat: event.latlng.lat, lng: event.latlng.lng });
      };
      map.on('mousemove', listener);
      return () => {
        map.off('mousemove', listener);
      };
    },
    onMouseLeave: (handler: () => void) => {
      const map = mapRef.current;
      if (!map) return () => {};
      map.on('mouseout', handler);
      return () => {
        map.off('mouseout', handler);
      };
    },
  };

  const shadow: ShadowEngineController = {
    setDate: (date: Date) => {
      shadeMapRef.current?.setDate(date);
    },
    setSunExposure: async (enabled: boolean, options: SunExposureOptions) => {
      await shadeMapRef.current?.setSunExposure(enabled, options);
    },
    isPositionInSun: (point: ScreenPoint) => (
      shadeMapRef.current?.isPositionInSun(point.x, point.y) ?? Promise.resolve(false)
    ),
    getHoursOfSun: (point: ScreenPoint) => (
      shadeMapRef.current?.getHoursOfSun(point.x, point.y) ?? Promise.resolve(0)
    ),
  };

  return {
    engine: 'leaflet',
    containerRef,
    rawMapRef: mapRef as React.RefObject<unknown>,
    mapRef,
    shadeMapRef,
    buildingsRef,
    controller,
    shadow,
    zoom,
  };
}
