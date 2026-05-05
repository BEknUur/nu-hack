import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ShadeMap from 'leaflet-shadow-simulator';
import { MAP_CONFIG, SHADE_CONFIG, TERRAIN_SOURCE } from '@/config/map';
import { fetchBuildings } from '@/services/overpass';

interface UseShadeMapSetupOptions {
  initialDate: Date;
  /** Called when building fetch starts/ends — use a stable ref to avoid stale closures */
  onLoadingChange: (loading: boolean) => void;
}

export interface UseShadeMapSetupReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
  mapRef: React.RefObject<L.Map | null>;
  shadeMapRef: React.RefObject<ShadeMap | null>;
  zoom: number;
}

export function useShadeMapSetup({
  initialDate,
  onLoadingChange,
}: UseShadeMapSetupOptions): UseShadeMapSetupReturn {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const shadeMapRef = useRef<ShadeMap | null>(null);
  const [zoom, setZoom] = useState<number>(MAP_CONFIG.zoom);

  // Keep callback ref fresh so getFeatures never captures a stale closure
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
        date: initialDate,
        color: SHADE_CONFIG.color,
        opacity: SHADE_CONFIG.opacity,
        apiKey: import.meta.env.VITE_SHADEMAP_API_KEY as string,
        terrainSource: TERRAIN_SOURCE,
        getFeatures: async () => {
          const m = mapRef.current;
          const mapPane = (m as unknown as { _mapPane?: HTMLElement })._mapPane;
          if (isDisposedRef.current || !m || !mapPane || m.getZoom() < MAP_CONFIG.buildingsMinZoom) return [];

          const bounds = m.getBounds();
          const zoomBucket = Math.floor(m.getZoom());
          const key = [
            zoomBucket,
            bounds.getSouth().toFixed(3),
            bounds.getWest().toFixed(3),
            bounds.getNorth().toFixed(3),
            bounds.getEast().toFixed(3),
          ].join(':');

          const cache = featuresCacheRef.current;
          if (cache && cache.key === key && Date.now() - cache.ts < 15_000) {
            return cache.data;
          }

          if (inflightRequestRef.current) {
            return inflightRequestRef.current;
          }

          onLoadingChangeRef.current(true);
          const request = fetchBuildings({
            s: bounds.getSouth(),
            w: bounds.getWest(),
            n: bounds.getNorth(),
            e: bounds.getEast(),
          });
          inflightRequestRef.current = request;

          try {
            const features = await request;
            if (isDisposedRef.current) return [];
            featuresCacheRef.current = { key, data: features, ts: Date.now() };
            return features;
          } catch (err) {
            // Avoid noisy stack traces from intermittent Overpass failures.
            console.warn('Failed to load buildings from Overpass:', err);
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

    // Delay creation by one frame to skip StrictMode's throwaway mount in dev.
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

      // Keep cleanup order defensive: stop simulator first, then remove map.
      if (currentShadeMap) {
        try {
          currentShadeMap.removeAllListeners();
        } catch {
          // Ignore teardown races from third-party internals.
        }
        try {
          currentShadeMap.onRemove();
        } catch {
          // Ignore teardown races from third-party internals.
        }
      }
      if (currentMap) {
        // Delay map removal to next tick so pending simulator microtasks
        // don't hit a half-destroyed map during HMR.
        window.setTimeout(() => {
          try {
            currentMap.remove();
          } catch {
            // Ignore teardown races from third-party internals.
          }
        }, 0);
      }
    };
    // initialDate intentionally excluded — only used for construction, not updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { containerRef, mapRef, shadeMapRef, zoom };
}
