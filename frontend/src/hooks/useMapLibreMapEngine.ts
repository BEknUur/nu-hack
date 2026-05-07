import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import ShadeMap from 'mapbox-gl-shadow-simulator';
import { MAP_CONFIG, SHADE_CONFIG, TERRAIN_SOURCE } from '@/config/map';
import { loadBuildings } from '@/services/buildingSource';
import type {
  MapEngineController,
  MapEngineState,
  MapInteractionHandler,
  MapPoint,
} from '@/types/map-engine';
import type { ShadowEngineController } from '@/types/shadow-engine';

interface UseMapLibreMapEngineOptions {
  initialDate: Date;
  onLoadingChange: (loading: boolean) => void;
}

const BUILDING_SOURCE_ID = 'osm-buildings';

const EMPTY_FEATURE_COLLECTION: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

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
  s: MAP_CONFIG.center[0] - 0.12,
  w: MAP_CONFIG.center[1] - 0.2,
  n: MAP_CONFIG.center[0] + 0.12,
  e: MAP_CONFIG.center[1] + 0.2,
};

const MAPLIBRE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: MAP_CONFIG.tileAttribution,
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
    },
  ],
};

function toLngLat(point: MapPoint): [number, number] {
  return [point.lng, point.lat];
}

function toFeatureCollection(features: GeoJSON.Feature[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features,
  };
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

function featureIntersectsBounds(feature: StaticFeature, bounds: maplibregl.LngLatBounds): boolean {
  const bbox = feature.__bbox;
  if (!bbox) return false;
  return !(
    bbox.maxLng < bounds.getWest() ||
    bbox.minLng > bounds.getEast() ||
    bbox.maxLat < bounds.getSouth() ||
    bbox.minLat > bounds.getNorth()
  );
}

function isWithinStaticRegion(map: maplibregl.Map, region: StaticRegionBBox): boolean {
  const center = map.getCenter();
  const marginLat = 1 / 111.32;
  const marginLng = 1 / (111.32 * Math.max(0.01, Math.cos((center.lat * Math.PI) / 180)));
  return (
    center.lat >= region.s - marginLat &&
    center.lat <= region.n + marginLat &&
    center.lng >= region.w - marginLng &&
    center.lng <= region.e + marginLng
  );
}

export function useMapLibreMapEngine({
  onLoadingChange,
}: UseMapLibreMapEngineOptions): MapEngineState {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const shadeMapRef = useRef<ShadeMap | null>(null);
  const buildingsRef = useRef<GeoJSON.Feature[]>([]);
  const [zoom, setZoom] = useState<number>(MAP_CONFIG.zoom);
  const onLoadingChangeRef = useRef(onLoadingChange);
  onLoadingChangeRef.current = onLoadingChange;
  const featuresCacheRef = useRef<{ key: string; data: GeoJSON.Feature[]; ts: number } | null>(null);
  const inflightRequestRef = useRef<Promise<GeoJSON.Feature[]> | null>(null);
  const staticFeaturesRef = useRef<StaticFeature[]>([]);
  const staticFeaturesLoadedRef = useRef(false);
  const staticFeaturesPromiseRef = useRef<Promise<StaticFeature[]> | null>(null);
  const staticRegionRef = useRef<StaticRegionBBox>(DEFAULT_STATIC_REGION);
  const isDisposedRef = useRef(false);
  const currentDateRef = useRef(new Date());
  const currentSunExposureRef = useRef<{ enabled: boolean; options?: { startDate: Date; endDate: Date; iterations: number } }>({
    enabled: false,
  });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    isDisposedRef.current = false;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAPLIBRE_STYLE,
      center: [MAP_CONFIG.center[1], MAP_CONFIG.center[0]],
      zoom: MAP_CONFIG.zoom,
      pitch: 0,
      bearing: 0,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');
    mapRef.current = map;

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
          throw new Error('Static summary dataset not found');
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

    const syncBuildings = async () => {
      const currentMap = mapRef.current;
      if (!currentMap || !currentMap.isStyleLoaded()) return;

      const source = currentMap.getSource(BUILDING_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (!source) return;

      setZoom(currentMap.getZoom());

      if (currentMap.getZoom() < MAP_CONFIG.buildingsMinZoom) {
        buildingsRef.current = [];
        source.setData(EMPTY_FEATURE_COLLECTION);
        return;
      }

      if (isWithinStaticRegion(currentMap, staticRegionRef.current)) {
        try {
          const staticFeatures = await ensureStaticFeaturesLoaded();
          if (isDisposedRef.current) return;
          const bounds = currentMap.getBounds();
          const visible = staticFeatures.filter((feature) => featureIntersectsBounds(feature, bounds));
          buildingsRef.current = visible;
          source.setData(toFeatureCollection(visible));
          return;
        } catch (err) {
          console.warn('Failed to load static buildings for MapLibre:', err);
        }
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
        source.setData(toFeatureCollection(cache.data));
        return;
      }

      if (inflightRequestRef.current) {
        const features = await inflightRequestRef.current;
        if (isDisposedRef.current) return;
        buildingsRef.current = features;
        source.setData(toFeatureCollection(features));
        return;
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
        if (isDisposedRef.current) return;
        featuresCacheRef.current = { key, data: features, ts: Date.now() };
        buildingsRef.current = features;
        source.setData(toFeatureCollection(features));
      } catch (err) {
        console.warn('Failed to load buildings for MapLibre:', err);
        buildingsRef.current = [];
        source.setData(EMPTY_FEATURE_COLLECTION);
      } finally {
        inflightRequestRef.current = null;
        if (!isDisposedRef.current) {
          onLoadingChangeRef.current(false);
        }
      }
    };

    const handleLoad = () => {
      map.addSource(BUILDING_SOURCE_ID, {
        type: 'geojson',
        data: EMPTY_FEATURE_COLLECTION,
      });

      map.addLayer({
        id: 'osm-buildings-3d',
        type: 'fill-extrusion',
        source: BUILDING_SOURCE_ID,
        minzoom: MAP_CONFIG.buildingsMinZoom,
        paint: {
          'fill-extrusion-color': '#d98f86',
          'fill-extrusion-opacity': 0.92,
          'fill-extrusion-height': ['coalesce', ['to-number', ['get', 'render_height']], 3],
          'fill-extrusion-base': 0,
        },
      });

      map.addLayer({
        id: 'osm-buildings-outline',
        type: 'line',
        source: BUILDING_SOURCE_ID,
        minzoom: MAP_CONFIG.buildingsMinZoom,
        paint: {
          'line-color': '#22314d',
          'line-width': 1.2,
          'line-opacity': 0.9,
        },
      });

      const shadeMap = new ShadeMap({
        apiKey: import.meta.env.VITE_SHADEMAP_API_KEY as string,
        date: currentDateRef.current,
        color: SHADE_CONFIG.color,
        opacity: SHADE_CONFIG.opacity,
        terrainSource: TERRAIN_SOURCE,
        getFeatures: async () => {
          const currentMap = mapRef.current;
          if (!currentMap || currentMap.getZoom() < MAP_CONFIG.buildingsMinZoom) {
            return [];
          }

          return [...buildingsRef.current]
            .filter((feature) => feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon')
            .sort((a, b) => {
              const aHeight = Number((a.properties ?? {}).render_height ?? (a.properties ?? {}).height ?? 0);
              const bHeight = Number((b.properties ?? {}).render_height ?? (b.properties ?? {}).height ?? 0);
              return aHeight - bHeight;
            }) as never[];
        },
      }).addTo(map as never);

      shadeMapRef.current = shadeMap;

      void syncBuildings();
    };

    map.on('load', handleLoad);
    map.on('moveend', () => {
      void syncBuildings();
    });
    map.on('zoom', () => {
      setZoom(map.getZoom());
    });

    return () => {
      isDisposedRef.current = true;
      shadeMapRef.current?.removeAllListeners();
      shadeMapRef.current?.remove();
      shadeMapRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const controller: MapEngineController = {
    isReady: () => Boolean(mapRef.current && mapRef.current.loaded()),
    getContainerPoint: (point) => {
      const map = mapRef.current;
      if (!map) return null;
      const projected = map.project(toLngLat(point));
      return { x: projected.x, y: projected.y };
    },
    flyToBounds: (bounds, options) => {
      mapRef.current?.fitBounds(
        [[bounds.west, bounds.south], [bounds.east, bounds.north]],
        {
          padding: options?.padding?.[0] ?? 40,
          duration: options?.duration ? options.duration * 1000 : undefined,
        },
      );
    },
    panTo: (point, options) => {
      mapRef.current?.easeTo({
        center: toLngLat(point),
        duration: options?.duration ? options.duration * 1000 : undefined,
      });
    },
    onClick: (handler: MapInteractionHandler) => {
      const map = mapRef.current;
      if (!map) return () => {};
      const listener = (event: maplibregl.MapMouseEvent) => {
        void handler({ lat: event.lngLat.lat, lng: event.lngLat.lng });
      };
      map.on('click', listener);
      return () => {
        map.off('click', listener);
      };
    },
    onContextMenu: (handler: MapInteractionHandler) => {
      const map = mapRef.current;
      if (!map) return () => {};
      const listener = (event: maplibregl.MapMouseEvent) => {
        void handler({ lat: event.lngLat.lat, lng: event.lngLat.lng });
      };
      map.on('contextmenu', listener);
      return () => {
        map.off('contextmenu', listener);
      };
    },
  };

  const shadow: ShadowEngineController = {
    setDate: (date: Date) => {
      currentDateRef.current = date;
      shadeMapRef.current?.setDate(date);
    },
    setSunExposure: async (enabled, options) => {
      currentSunExposureRef.current = { enabled, options };
      await shadeMapRef.current?.setSunExposure(enabled, options);
    },
    isPositionInSun: (point) => (
      shadeMapRef.current?.isPositionInSun(point.x, point.y) ?? Promise.resolve(false)
    ),
    getHoursOfSun: async (point) => (
      Promise.resolve(shadeMapRef.current?.getHoursOfSun(point.x, point.y) ?? 0)
    ),
  };

  return {
    engine: 'maplibre',
    containerRef,
    rawMapRef: mapRef as React.RefObject<unknown>,
    buildingsRef,
    controller,
    shadow,
    zoom,
  };
}
