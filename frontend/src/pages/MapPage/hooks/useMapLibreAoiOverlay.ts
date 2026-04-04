import { useEffect, type RefObject } from 'react';
import maplibregl from 'maplibre-gl';
import type { RankAreaGeometry, TreeDrawMode } from '@/types/tree-optimizer';
import {
  EMPTY_FEATURE_COLLECTION,
  TREE_AOI_FILL_LAYER_ID,
  TREE_AOI_LINE_LAYER_ID,
  TREE_AOI_SOURCE_ID,
} from '@/hooks/maplibre/constants';

export interface UseMapLibreAoiOverlayParams {
  engine: string;
  rawMapRef: RefObject<unknown>;
  isTreeMode: boolean;
  isWorkerMode: boolean;
  treeAreaGeometry: RankAreaGeometry | null;
  treeDraftGeometry: RankAreaGeometry | null;
  treeDrawMode: TreeDrawMode;
  workerAreaGeometry: RankAreaGeometry | null;
  workerDraftGeometry: RankAreaGeometry | null;
  workerDrawMode: TreeDrawMode;
}

export function useMapLibreAoiOverlay({
  engine,
  rawMapRef,
  isTreeMode,
  isWorkerMode,
  treeAreaGeometry,
  treeDraftGeometry,
  treeDrawMode,
  workerAreaGeometry,
  workerDraftGeometry,
  workerDrawMode,
}: UseMapLibreAoiOverlayParams) {
  useEffect(() => {
    if (engine !== 'maplibre') return;
    const map = rawMapRef.current as maplibregl.Map | null;
    if (!map) return;

    const upsertAoiOverlay = () => {
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

      const geometry = isTreeMode
        ? (treeDraftGeometry ?? treeAreaGeometry)
        : (isWorkerMode ? (workerDraftGeometry ?? workerAreaGeometry) : null);
      if ((!isTreeMode && !isWorkerMode) || !geometry) {
        source.setData(EMPTY_FEATURE_COLLECTION);
        return;
      }

      source.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry,
            properties: {
              mode: isTreeMode ? treeDrawMode : 'worker-zone',
            },
          },
        ],
      });

      if (map.getLayer(TREE_AOI_FILL_LAYER_ID)) {
        try {
          map.moveLayer(TREE_AOI_FILL_LAYER_ID);
        } catch {
          // ignore
        }
      }
      if (map.getLayer(TREE_AOI_LINE_LAYER_ID)) {
        try {
          map.moveLayer(TREE_AOI_LINE_LAYER_ID);
        } catch {
          // ignore
        }
      }
    };

    const onLoad = () => {
      upsertAoiOverlay();
    };

    if (map.isStyleLoaded()) {
      upsertAoiOverlay();
    } else {
      map.once('load', onLoad);
    }

    return () => {
      map.off('load', onLoad);
    };
  }, [
    engine,
    isTreeMode,
    isWorkerMode,
    rawMapRef,
    treeAreaGeometry,
    treeDraftGeometry,
    treeDrawMode,
    workerAreaGeometry,
    workerDraftGeometry,
    workerDrawMode,
  ]);
}
