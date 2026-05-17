import { useEffect, type RefObject } from 'react';
import { OSM_TILE_URLS, SATELLITE_TILE_URLS } from '@/hooks/maplibre/constants';

export interface UseMapLibreBasemapTilesParams {
  engine: string;
  rawMapRef: RefObject<unknown>;
  isSatellite: boolean;
}

export function useMapLibreBasemapTiles({ engine, rawMapRef, isSatellite }: UseMapLibreBasemapTilesParams) {
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
}
