import { useEffect } from 'react';
import { OSM_TILE_URLS, SATELLITE_TILE_URLS, SUN_WALLS_LAYER_ID } from '@/hooks/maplibre/constants';
import { getDefaultSunExposureRange } from '@/pages/MapPage/constants';
import { isMapReadyForShadeOps } from '@/pages/MapPage/helpers';
import type { MapEngineController, MapEngineKind } from '@/types/map-engine';
import type { ShadowEngineController } from '@/types/shadow-engine';

interface UseMapViewEffectsArgs {
  engine: MapEngineKind;
  rawMapRef: React.RefObject<unknown>;
  controller: MapEngineController;
  shadow: ShadowEngineController | null;
  date: Date;
  dateStr: string;
  sunExposure: boolean;
  is3D: boolean;
  isSatellite: boolean;
  isWorkerMode: boolean;
}

export function useMapViewEffects({
  engine,
  rawMapRef,
  controller,
  shadow,
  date,
  dateStr,
  sunExposure,
  is3D,
  isSatellite,
  isWorkerMode,
}: UseMapViewEffectsArgs) {
  useEffect(() => {
    if (engine !== 'maplibre') {
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

  useEffect(() => {
    if (sunExposure) return;
    if (!shadow || !isMapReadyForShadeOps(controller)) return;
    try {
      shadow.setDate(date);
    } catch {
      return;
    }
  }, [controller, date, shadow, sunExposure]);

  useEffect(() => {
    if (!shadow || !isMapReadyForShadeOps(controller)) return;
    shadow.setSunExposure(sunExposure, getDefaultSunExposureRange(dateStr)).catch(() => {
    });
  }, [controller, dateStr, shadow, sunExposure]);

  useEffect(() => {
    if (engine !== 'maplibre') return;
    const map = rawMapRef.current as {
      getLayer?: (id: string) => unknown;
      setLayoutProperty?: (id: string, name: string, value: string) => void;
      isStyleLoaded?: () => boolean;
      once?: (event: 'load', listener: () => void) => void;
    } | null;
    if (!map) return;

    const applySunWallsVisibility = () => {
      if (!map.getLayer?.(SUN_WALLS_LAYER_ID)) return;
      map.setLayoutProperty?.(SUN_WALLS_LAYER_ID, 'visibility', isWorkerMode ? 'none' : 'visible');
    };

    if (map.isStyleLoaded?.()) {
      applySunWallsVisibility();
      return;
    }

    map.once?.('load', applySunWallsVisibility);
  }, [engine, isWorkerMode, rawMapRef]);
}
