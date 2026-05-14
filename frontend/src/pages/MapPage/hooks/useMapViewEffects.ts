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
  const waitForMap = <T,>(
    getMap: () => T | null,
    isReady: (map: T) => boolean,
    apply: (map: T) => void,
  ) => {
    let cancelled = false;
    let rafId = 0;

    const runWhenMapExists = () => {
      if (cancelled) return;
      const map = getMap();
      if (!map || !isReady(map)) {
        rafId = window.requestAnimationFrame(runWhenMapExists);
        return;
      }

      apply(map);
    };

    runWhenMapExists();

    return () => {
      cancelled = true;
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  };

  const waitForShadeOpsReady = (
    apply: () => void | Promise<void>,
  ) => {
    let cancelled = false;
    let rafId = 0;

    const runWhenReady = () => {
      if (cancelled) return;
      if (!shadow || !isMapReadyForShadeOps(controller)) {
        rafId = window.requestAnimationFrame(runWhenReady);
        return;
      }

      void apply();
    };

    runWhenReady();

    return () => {
      cancelled = true;
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  };

  useEffect(() => {
    if (engine !== 'maplibre') {
      return;
    }

    return waitForMap(
      () => rawMapRef.current as {
        easeTo?: (options: { pitch: number; bearing: number; duration: number }) => void;
      } | null,
      (map) => typeof map.easeTo === 'function',
      (map) => {
        map.easeTo?.({
          pitch: is3D ? 58 : 0,
          bearing: is3D ? -18 : 0,
          duration: 450,
        });
      },
    );
  }, [engine, is3D, rawMapRef]);

  useEffect(() => {
    if (engine !== 'maplibre') return;

    return waitForMap(
      () => rawMapRef.current as {
        getSource?: (id: string) => unknown;
      } | null,
      (map) => Boolean(map.getSource?.('osm')),
      (map) => {
        const source = map.getSource?.('osm') as { setTiles?: (tiles: string[]) => void } | undefined;
        source?.setTiles?.(isSatellite ? SATELLITE_TILE_URLS : OSM_TILE_URLS);
      },
    );
  }, [engine, isSatellite, rawMapRef]);

  useEffect(() => {
    if (sunExposure) return;
    return waitForShadeOpsReady(() => {
      try {
        shadow?.setDate(date);
      } catch {
        return;
      }
    });
  }, [controller, date, shadow, sunExposure]);

  useEffect(() => {
    return waitForShadeOpsReady(async () => {
      await shadow?.setSunExposure(sunExposure, getDefaultSunExposureRange(dateStr)).catch(() => {
      });
    });
  }, [controller, dateStr, shadow, sunExposure]);

  useEffect(() => {
    if (engine !== 'maplibre') return;

    return waitForMap(
      () => rawMapRef.current as {
        getLayer?: (id: string) => unknown;
        setLayoutProperty?: (id: string, name: string, value: string) => void;
      } | null,
      (map) => Boolean(map.getLayer?.(SUN_WALLS_LAYER_ID)),
      (map) => {
        map.setLayoutProperty?.(SUN_WALLS_LAYER_ID, 'visibility', isWorkerMode ? 'none' : 'visible');
      },
    );
  }, [engine, isWorkerMode, rawMapRef]);
}
