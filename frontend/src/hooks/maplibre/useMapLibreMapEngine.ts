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
} from '@/types/map-engine';
import type { ShadowEngineController, SunExposureOptions } from '@/types/shadow-engine';
import {
  BUILDING_SOURCE_ID,
  DEFAULT_STATIC_REGION,
  EMPTY_FEATURE_COLLECTION,
  MAPLIBRE_STYLE,
  MAX_VISIBLE_STATIC_FEATURES,
  SUN_WALLS_LAYER_ID,
  SUN_WALLS_SOURCE_ID,
} from '@/hooks/maplibre/constants';
import {
  featureIntersectsBounds,
  isBuildingPolygonFeature,
  isWithinStaticRegion,
  toLngLat,
} from '@/hooks/maplibre/geo';
import { clearGeoJsonSource, buildBoundsCacheKey, setGeoJsonSourceData } from '@/hooks/maplibre/sources';
import { ensureStaticFeaturesLoaded } from '@/hooks/maplibre/staticDataset';
import { createSunWallFeatures } from '@/hooks/maplibre/sunWalls';
import type { BuildingsCacheEntry, StaticFeature, StaticRegionBBox } from '@/hooks/maplibre/types';

interface UseMapLibreMapEngineOptions {
  initialDate: Date;
  onLoadingChange: (loading: boolean) => void;
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

  const featuresCacheRef = useRef<BuildingsCacheEntry | null>(null);
  const inflightRequestRef = useRef<Promise<GeoJSON.Feature[]> | null>(null);
  const syncBuildingsRef = useRef<(() => Promise<void>) | null>(null);

  const staticFeaturesRef = useRef<StaticFeature[]>([]);
  const staticFeaturesLoadedRef = useRef(false);
  const staticFeaturesPromiseRef = useRef<Promise<StaticFeature[]> | null>(null);
  const staticRegionRef = useRef<StaticRegionBBox>(DEFAULT_STATIC_REGION);

  const isDisposedRef = useRef(false);
  const currentDateRef = useRef(new Date());
  const currentSunExposureRef = useRef<{ enabled: boolean; options: SunExposureOptions | null }>({
    enabled: false,
    options: null,
  });
  const sunExposureRevisionRef = useRef(0);
  const sunExposureDrainRef = useRef<Promise<void> | null>(null);

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
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');
    mapRef.current = map;

    const syncBuildings = async () => {
      const currentMap = mapRef.current;
      if (!currentMap || !currentMap.isStyleLoaded()) return;

      const buildingSource = currentMap.getSource(BUILDING_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      const sunWallsSource = currentMap.getSource(SUN_WALLS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (!buildingSource) return;

      setZoom(currentMap.getZoom());

      if (currentMap.getZoom() < MAP_CONFIG.buildingsMinZoom) {
        buildingsRef.current = [];
        clearGeoJsonSource(buildingSource);
        clearGeoJsonSource(sunWallsSource);
        return;
      }

      if (isWithinStaticRegion(currentMap, staticRegionRef.current)) {
        try {
          const staticFeatures = await ensureStaticFeaturesLoaded({
            onLoadingChange: onLoadingChangeRef.current,
            isDisposedRef,
            staticFeaturesRef,
            staticFeaturesLoadedRef,
            staticFeaturesPromiseRef,
            staticRegionRef,
          });
          if (isDisposedRef.current) return;

          const bounds = currentMap.getBounds();
          let visible = staticFeatures.filter((feature) => featureIntersectsBounds(feature, bounds));
          if (visible.length > MAX_VISIBLE_STATIC_FEATURES) {
            visible = visible.slice(0, MAX_VISIBLE_STATIC_FEATURES);
          }

          buildingsRef.current = visible;
          setGeoJsonSourceData(buildingSource, visible);
          sunWallsSource?.setData(currentSunExposureRef.current.enabled
            ? EMPTY_FEATURE_COLLECTION
            : { type: 'FeatureCollection', features: createSunWallFeatures(visible) });
          return;
        } catch (err) {
          staticFeaturesRef.current = [];
          staticFeaturesLoadedRef.current = true;
          buildingsRef.current = [];
          setGeoJsonSourceData(buildingSource, []);
          clearGeoJsonSource(sunWallsSource);
          return;
        }
      }

      const bounds = currentMap.getBounds();
      const key = buildBoundsCacheKey(bounds, Math.floor(currentMap.getZoom()));
      const cache = featuresCacheRef.current;

      if (cache && cache.key === key && Date.now() - cache.ts < 15_000) {
        buildingsRef.current = cache.data;
        setGeoJsonSourceData(buildingSource, cache.data);
        return;
      }

      if (inflightRequestRef.current) {
        const features = await inflightRequestRef.current;
        if (isDisposedRef.current) return;
        buildingsRef.current = features;
        setGeoJsonSourceData(buildingSource, features);
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
        setGeoJsonSourceData(buildingSource, features);
        clearGeoJsonSource(sunWallsSource);
      } catch (err) {
        console.warn('Failed to load buildings for MapLibre:', err);
        buildingsRef.current = [];
        clearGeoJsonSource(buildingSource);
        clearGeoJsonSource(sunWallsSource);
      } finally {
        inflightRequestRef.current = null;
        if (!isDisposedRef.current) {
          onLoadingChangeRef.current(false);
        }
      }
    };
    syncBuildingsRef.current = syncBuildings;

    const handleLoad = () => {
      map.addSource(BUILDING_SOURCE_ID, {
        type: 'geojson',
        data: EMPTY_FEATURE_COLLECTION,
      });
      map.addSource(SUN_WALLS_SOURCE_ID, {
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

      map.addLayer({
        id: SUN_WALLS_LAYER_ID,
        type: 'fill-extrusion',
        source: SUN_WALLS_SOURCE_ID,
        minzoom: MAP_CONFIG.buildingsMinZoom,
        paint: {
          'fill-extrusion-color': '#ffeb3b',
          'fill-extrusion-opacity': 0.86,
          'fill-extrusion-height': ['coalesce', ['to-number', ['get', 'wall_height']], 3],
          'fill-extrusion-base': 0,
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
            .filter(isBuildingPolygonFeature)
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
      syncBuildingsRef.current = null;
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

  const sleep = (ms: number) => new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

  const applySunExposureTransition = async (
    enabled: boolean,
    options: SunExposureOptions,
  ) => {
    const sunWallsSource = mapRef.current?.getSource(SUN_WALLS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (enabled) {
      // Entering exposure mode: clear helper walls and refresh features first.
      sunWallsSource?.setData(EMPTY_FEATURE_COLLECTION);
      await syncBuildingsRef.current?.();
      try {
        await shadeMapRef.current?.setSunExposure(true, options);
      } catch (err) {
        await sleep(180);
        await syncBuildingsRef.current?.();
        await shadeMapRef.current?.setSunExposure(true, options);
        if (err) {
          console.warn('Sun exposure transient error recovered by retry:', err);
        }
      }
      return;
    }

    // Exiting exposure mode: disable simulator mode first, then redraw shadows/walls.
    try {
      await shadeMapRef.current?.setSunExposure(false, options);
    } catch (err) {
      await sleep(180);
      await shadeMapRef.current?.setSunExposure(false, options);
      if (err) {
        console.warn('Disable sun exposure transient error recovered by retry:', err);
      }
    }
    await syncBuildingsRef.current?.();
  };

  const drainSunExposureTransitions = () => {
    if (sunExposureDrainRef.current) {
      return sunExposureDrainRef.current;
    }

    // Serialize mode changes and always converge to the latest requested state.
    sunExposureDrainRef.current = (async () => {
      while (true) {
        const revisionAtStart = sunExposureRevisionRef.current;
        const { enabled, options } = currentSunExposureRef.current;
        if (!options) {
          break;
        }
        await applySunExposureTransition(enabled, options);

        if (revisionAtStart === sunExposureRevisionRef.current) {
          break;
        }
      }
    })().finally(() => {
      sunExposureDrainRef.current = null;
    });

    return sunExposureDrainRef.current;
  };

  const shadow: ShadowEngineController = {
    setDate: (date: Date) => {
      currentDateRef.current = date;
      try {
        shadeMapRef.current?.setDate(date);
      } catch (err) {
        // Transient WebGL buffer races can happen during tile/source updates.
        window.setTimeout(() => {
          try {
            shadeMapRef.current?.setDate(date);
          } catch {
            if (err) {
              console.warn('setDate retry failed after transient WebGL error:', err);
            }
          }
        }, 120);
      }
    },
    setSunExposure: async (enabled, options) => {
      currentSunExposureRef.current = { enabled, options };
      sunExposureRevisionRef.current += 1;
      await drainSunExposureTransitions();
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
