
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

type StaticFeature = GeoJSON.Feature & {
  __bbox?: {
    minLng: number;
    minLat: number;
    maxLng: number;
    maxLat: number;
  };
};

interface StaticRegionBBox {
  s: number;
  w: number;
  n: number;
  e: number;
}

const DEFAULT_STATIC_REGION: StaticRegionBBox = {
  // Approximate "initial Astana area" fallback around default map center.
  s: MAP_CONFIG.center[0] - 0.12,
  w: MAP_CONFIG.center[1] - 0.2,
  n: MAP_CONFIG.center[0] + 0.12,
  e: MAP_CONFIG.center[1] + 0.2,
};

function collectCoords(geometry: GeoJSON.Geometry): [number, number][] {
  if (geometry.type === 'Polygon') {
    return geometry.coordinates.flat() as [number, number][];
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.flat(2) as [number, number][];
  }
  return [];
}

function buildFeatureBBox(feature: GeoJSON.Feature): StaticFeature['__bbox'] {
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

function featureIntersectsBounds(feature: StaticFeature, bounds: L.LatLngBounds): boolean {
  const bbox = feature.__bbox;
  if (!bbox) return false;
  return !(
    bbox.maxLng < bounds.getWest() ||
    bbox.minLng > bounds.getEast() ||
    bbox.maxLat < bounds.getSouth() ||
    bbox.minLat > bounds.getNorth()
  );
}

function isWithinStaticRegion(map: L.Map, region: StaticRegionBBox): boolean {
  const center = map.getCenter();
  // Expand static region by ~1km around configured bbox.
  const marginLat = 1 / 111.32;
  const marginLng = 1 / (111.32 * Math.max(0.01, Math.cos((center.lat * Math.PI) / 180)));
  return (
    center.lat >= region.s - marginLat &&
    center.lat <= region.n + marginLat &&
    center.lng >= region.w - marginLng &&
    center.lng <= region.e + marginLng
  );
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
  const staticFeaturesRef = useRef<StaticFeature[]>([]);
  const staticFeaturesLoadedRef = useRef(false);
  const staticFeaturesPromiseRef = useRef<Promise<StaticFeature[]> | null>(null);
  const staticRegionRef = useRef<StaticRegionBBox>(DEFAULT_STATIC_REGION);
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

      async function ensureStaticFeaturesLoaded(): Promise<StaticFeature[]> {
        if (staticFeaturesLoadedRef.current) return staticFeaturesRef.current;
        if (staticFeaturesPromiseRef.current) return staticFeaturesPromiseRef.current;

        onLoadingChangeRef.current(true);
        const request = (async () => {
          const [geoRes, summaryRes] = await Promise.all([
            fetch('/dataset/block-buildings.geojson'),
            fetch('/dataset/block-summary.json'),
          ]);
          if (!geoRes.ok) {
            throw new Error('Static buildings dataset not found');
          }
          if (!summaryRes.ok) {
            throw new Error('Static buildings summary not found');
          }

          const geo = await geoRes.json() as GeoJSON.FeatureCollection;
          const summary = await summaryRes.json() as {
            meta?: {
              bbox?: {
                s?: number;
                w?: number;
                n?: number;
                e?: number;
              };
            };
            buildings?: Array<{ id?: string; height?: number }>;
          };

          const metaBBox = summary.meta?.bbox;
          if (
            typeof metaBBox?.s === 'number' &&
            typeof metaBBox?.w === 'number' &&
            typeof metaBBox?.n === 'number' &&
            typeof metaBBox?.e === 'number'
          ) {
            staticRegionRef.current = {
              s: metaBBox.s,
              w: metaBBox.w,
              n: metaBBox.n,
              e: metaBBox.e,
            };
          }

          const heightById = new Map<string, number>();
          for (const b of summary.buildings ?? []) {
            if (!b.id) continue;
            if (typeof b.height === 'number' && Number.isFinite(b.height)) {
              heightById.set(b.id, b.height);
            }
          }

          const normalized = geo.features
            .filter((feature) => feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon')
            .map((feature) => {
              const f = feature as StaticFeature;
              if (!f.properties) f.properties = {};
              const id = typeof f.properties.id === 'string' ? f.properties.id : undefined;
              const h = (id && heightById.get(id)) ?? Number(f.properties.height ?? f.properties.render_height ?? 3);
              f.properties.height = h;
              f.properties.render_height = h;
              f.__bbox = buildFeatureBBox(f);
              return f;
            });

          staticFeaturesRef.current = normalized;
          staticFeaturesLoadedRef.current = true;
          return normalized;
        })();

        staticFeaturesPromiseRef.current = request;
        try {
          return await request;
        } finally {
          staticFeaturesPromiseRef.current = null;
          if (!isDisposedRef.current) {
            onLoadingChangeRef.current(false);
          }
        }
      }

      const shadeMap = new ShadeMap({
        date: initialDate,
        color: SHADE_CONFIG.color,
        opacity: SHADE_CONFIG.opacity,
        apiKey: import.meta.env.VITE_SHADEMAP_API_KEY as string,
        terrainSource: TERRAIN_SOURCE,
        getFeatures: async () => {
          const m = mapRef.current;
          const mapPane = (m as unknown as { _mapPane?: HTMLElement })._mapPane;
          if (isDisposedRef.current || !m || !mapPane) return [];
          const bounds = m.getBounds();
          const zoom = m.getZoom();

          // Use precomputed static dataset above zoom 14.
          if (zoom > 14 && isWithinStaticRegion(m, staticRegionRef.current)) {
            try {
              const features = await ensureStaticFeaturesLoaded();
              if (isDisposedRef.current) return [];
              return features.filter((feature) => featureIntersectsBounds(feature, bounds));
            } catch (err) {
              console.warn('Failed to load static buildings dataset:', err);
              return [];
            }
          }

          // Below that, keep previous behavior.
          if (zoom < MAP_CONFIG.buildingsMinZoom) return [];

          const zoomBucket = Math.floor(zoom);
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
