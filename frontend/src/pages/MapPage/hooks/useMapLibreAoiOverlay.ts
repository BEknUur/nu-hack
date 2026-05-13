import { useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import {
  EMPTY_FEATURE_COLLECTION,
  TREE_AOI_FILL_LAYER_ID,
  TREE_AOI_LINE_LAYER_ID,
  TREE_AOI_SOURCE_ID,
} from '@/hooks/maplibre/constants';
import type { RankAreaGeometry } from '@/types/tree-optimizer';

interface UseMapLibreAoiOverlayArgs {
  engine: string;
  rawMapRef: React.RefObject<unknown>;
  geometry: RankAreaGeometry | null;
  mode: string | null;
}

export function useMapLibreAoiOverlay({
  engine,
  rawMapRef,
  geometry,
  mode,
}: UseMapLibreAoiOverlayArgs) {
  useEffect(() => {
    if (engine !== 'maplibre') return;
    const map = rawMapRef.current as maplibregl.Map | null;
    if (!map) return;

    const upsertOverlay = () => {
      if (!map.getSource(TREE_AOI_SOURCE_ID)) {
        map.addSource(TREE_AOI_SOURCE_ID, {
          type: 'geojson',
          data: EMPTY_FEATURE_COLLECTION,
        });
      }
      if (!map.getLayer(TREE_AOI_FILL_LAYER_ID)) {
        map.addLayer({
          id: TREE_AOI_FILL_LAYER_ID,
          type: 'fill',
          source: TREE_AOI_SOURCE_ID,
          paint: {
            'fill-color': '#2f67bf',
            'fill-opacity': 0.14,
          },
        });
      }
      if (!map.getLayer(TREE_AOI_LINE_LAYER_ID)) {
        map.addLayer({
          id: TREE_AOI_LINE_LAYER_ID,
          type: 'line',
          source: TREE_AOI_SOURCE_ID,
          paint: {
            'line-color': '#1f4f9c',
            'line-width': 2,
            'line-opacity': 0.9,
            'line-dasharray': [2, 1],
          },
        });
      }

      const source = map.getSource(TREE_AOI_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (!source) return;

      if (!geometry || !mode) {
        source.setData(EMPTY_FEATURE_COLLECTION);
        return;
      }

      source.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry,
            properties: { mode },
          },
        ],
      });
    };

    if (map.isStyleLoaded()) {
      upsertOverlay();
      return;
    }

    map.once('load', upsertOverlay);
  }, [engine, geometry, mode, rawMapRef]);
}
