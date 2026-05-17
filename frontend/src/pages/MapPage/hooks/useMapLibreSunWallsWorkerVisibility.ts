import { useEffect, type RefObject } from 'react';
import maplibregl from 'maplibre-gl';
import { SUN_WALLS_LAYER_ID } from '@/hooks/maplibre/constants';

export interface UseMapLibreSunWallsWorkerVisibilityParams {
  engine: string;
  rawMapRef: RefObject<unknown>;
  isWorkerMode: boolean;
}

export function useMapLibreSunWallsWorkerVisibility({
  engine,
  rawMapRef,
  isWorkerMode,
}: UseMapLibreSunWallsWorkerVisibilityParams) {
  useEffect(() => {
    if (engine !== 'maplibre') return;
    const map = rawMapRef.current as maplibregl.Map | null;
    if (!map) return;

    const applySunWallsVisibility = () => {
      if (!map.getLayer(SUN_WALLS_LAYER_ID)) return;
      map.setLayoutProperty(
        SUN_WALLS_LAYER_ID,
        'visibility',
        isWorkerMode ? 'none' : 'visible',
      );
    };

    if (map.isStyleLoaded()) {
      applySunWallsVisibility();
      return;
    }
    map.once('load', applySunWallsVisibility);
  }, [engine, rawMapRef, isWorkerMode]);
}
