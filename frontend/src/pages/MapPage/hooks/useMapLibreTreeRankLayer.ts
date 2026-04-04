import { useEffect, type Dispatch, type RefObject, type SetStateAction } from 'react';
import maplibregl from 'maplibre-gl';
import type { ClickInfo } from '@/types/map';
import type { SelectedBuilding } from '@/types/building';
import type { TreeRankCandidate } from '@/types/tree-optimizer';
import {
  EMPTY_FEATURE_COLLECTION,
  TREE_RANK_LABEL_LAYER_ID,
  TREE_RANK_LAYER_ID,
  TREE_RANK_SOURCE_ID,
} from '@/hooks/maplibre/constants';

export interface UseMapLibreTreeRankLayerParams {
  engine: string;
  rawMapRef: RefObject<unknown>;
  isTreeMode: boolean;
  treeCandidates: TreeRankCandidate[];
  selectedTreeCandidate: TreeRankCandidate | null;
  treeDrawArmed: boolean;
  treeDrawing: boolean;
  setSelectedTreeCandidate: Dispatch<SetStateAction<TreeRankCandidate | null>>;
  setClickInfo: Dispatch<SetStateAction<ClickInfo | null>>;
  setSelectedBuilding: Dispatch<SetStateAction<SelectedBuilding | null>>;
}

export function useMapLibreTreeRankLayer({
  engine,
  rawMapRef,
  isTreeMode,
  treeCandidates,
  selectedTreeCandidate,
  treeDrawArmed,
  treeDrawing,
  setSelectedTreeCandidate,
  setClickInfo,
  setSelectedBuilding,
}: UseMapLibreTreeRankLayerParams) {
  useEffect(() => {
    if (engine !== 'maplibre') return;

    const map = rawMapRef.current as maplibregl.Map | null;
    if (!map) return;

    const pickCandidateFromPoint = (point: maplibregl.Point) => {
      if (!map.getLayer(TREE_RANK_LAYER_ID)) return null;
      const features = map.queryRenderedFeatures(point, { layers: [TREE_RANK_LAYER_ID] });
      const candidateId = features[0]?.properties?.id;
      if (typeof candidateId !== 'string') return;
      const candidate = treeCandidates.find((item) => item.id === candidateId);
      return candidate ?? null;
    };

    const clickHandler = (event: maplibregl.MapMouseEvent) => {
      if (!isTreeMode || treeDrawArmed || treeDrawing) return;
      const candidate = pickCandidateFromPoint(event.point);
      if (!candidate) return;

      setSelectedTreeCandidate(candidate);
      setClickInfo(null);
      setSelectedBuilding(null);
    };

    const mouseMoveHandler = (event: maplibregl.MapMouseEvent) => {
      if (!isTreeMode || treeDrawArmed || treeDrawing) return;
      const candidate = pickCandidateFromPoint(event.point);
      map.getCanvas().style.cursor = candidate ? 'pointer' : '';
    };

    const mouseOutHandler = () => {
      map.getCanvas().style.cursor = '';
    };

    const updateTreeSource = () => {
      if (!map.getSource(TREE_RANK_SOURCE_ID)) {
        map.addSource(TREE_RANK_SOURCE_ID, {
          type: 'geojson',
          data: EMPTY_FEATURE_COLLECTION,
        });
      }

      if (!map.getLayer(TREE_RANK_LAYER_ID)) {
        map.addLayer({
          id: TREE_RANK_LAYER_ID,
          type: 'circle',
          source: TREE_RANK_SOURCE_ID,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['to-number', ['get', 'score']], 0, 5, 100, 10],
            'circle-color': [
              'interpolate',
              ['linear'],
              ['to-number', ['get', 'score']],
              0,
              '#9aa7bf',
              55,
              '#2f67bf',
              75,
              '#f0c24c',
              90,
              '#c68a11',
            ],
            'circle-opacity': ['case', ['==', ['get', 'selected'], 1], 0.95, 0.85],
            'circle-stroke-width': ['case', ['==', ['get', 'selected'], 1], 2.6, 1.2],
            'circle-stroke-color': ['case', ['==', ['get', 'selected'], 1], '#172033', '#ffffff'],
          },
        });
      }

      if (!map.getLayer(TREE_RANK_LABEL_LAYER_ID)) {
        map.addLayer({
          id: TREE_RANK_LABEL_LAYER_ID,
          type: 'symbol',
          source: TREE_RANK_SOURCE_ID,
          layout: {
            'text-field': ['get', 'rank_label'],
            'text-size': 10,
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-offset': [0, 1.2],
            'text-anchor': 'top',
          },
          paint: {
            'text-color': '#1f4f9c',
            'text-halo-color': '#ffffff',
            'text-halo-width': 0.8,
          },
        });
      }

      const source = map.getSource(TREE_RANK_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (!source) return;

      if (!isTreeMode || treeCandidates.length === 0) {
        source.setData(EMPTY_FEATURE_COLLECTION);
        return;
      }

      const selectedId = selectedTreeCandidate?.id ?? null;
      source.setData({
        type: 'FeatureCollection',
        features: treeCandidates.map((candidate) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [candidate.lng, candidate.lat],
          },
          properties: {
            id: candidate.id,
            score: candidate.score,
            rank_label: `#${candidate.rank}`,
            selected: candidate.id === selectedId ? 1 : 0,
          },
        })),
      });
    };

    if (map.isStyleLoaded()) {
      updateTreeSource();
    } else {
      map.once('load', updateTreeSource);
    }

    map.on('click', clickHandler);
    map.on('mousemove', mouseMoveHandler);
    map.on('mouseout', mouseOutHandler);

    return () => {
      map.off('click', clickHandler);
      map.off('mousemove', mouseMoveHandler);
      map.off('mouseout', mouseOutHandler);
      map.getCanvas().style.cursor = '';
    };
  }, [engine, isTreeMode, rawMapRef, selectedTreeCandidate?.id, treeCandidates, treeDrawArmed, treeDrawing]);
}
