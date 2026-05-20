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

const TREE_RANK_EMOJI_ICON_ID = 'tree-rank-emoji-icon';
const TREE_RANK_EMOJI_SELECTED_ICON_ID = 'tree-rank-emoji-selected-icon';

function renderTreeEmojiImage(size: number, selected: boolean): ImageData | null {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, size, size);

  if (selected) {
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255, 247, 221, 0.98)';
    ctx.arc(size / 2, size / 2, size * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.round(size * 0.68)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.shadowColor = 'rgba(255,255,255,0.95)';
  ctx.shadowBlur = selected ? 8 : 5;
  ctx.fillText('🌳', size / 2, size / 2);

  return ctx.getImageData(0, 0, size, size);
}

function ensureTreeEmojiImages(map: maplibregl.Map) {
  if (!map.hasImage(TREE_RANK_EMOJI_ICON_ID)) {
    const image = renderTreeEmojiImage(64, false);
    if (image) {
      map.addImage(TREE_RANK_EMOJI_ICON_ID, image, { pixelRatio: 2 });
    }
  }

  if (!map.hasImage(TREE_RANK_EMOJI_SELECTED_ICON_ID)) {
    const image = renderTreeEmojiImage(72, true);
    if (image) {
      map.addImage(TREE_RANK_EMOJI_SELECTED_ICON_ID, image, { pixelRatio: 2 });
    }
  }
}

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
    const interactiveLayerIds = [TREE_RANK_LAYER_ID, TREE_RANK_LABEL_LAYER_ID];

    const pickCandidateFromPoint = (point: maplibregl.Point) => {
      if (!map.getLayer(TREE_RANK_LAYER_ID)) return null;
      const features = map.queryRenderedFeatures(point, { layers: interactiveLayerIds });
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
      ensureTreeEmojiImages(map);

      if (!map.getSource(TREE_RANK_SOURCE_ID)) {
        map.addSource(TREE_RANK_SOURCE_ID, {
          type: 'geojson',
          data: EMPTY_FEATURE_COLLECTION,
        });
      }

      if (!map.getLayer(TREE_RANK_LAYER_ID)) {
        map.addLayer({
          id: TREE_RANK_LAYER_ID,
          type: 'symbol',
          source: TREE_RANK_SOURCE_ID,
          layout: {
            'icon-image': [
              'case',
              ['==', ['get', 'selected'], 1],
              TREE_RANK_EMOJI_SELECTED_ICON_ID,
              TREE_RANK_EMOJI_ICON_ID,
            ],
            'icon-size': [
              'case',
              ['==', ['get', 'selected'], 1],
              ['interpolate', ['linear'], ['to-number', ['get', 'score']], 0, 0.78, 100, 1],
              ['interpolate', ['linear'], ['to-number', ['get', 'score']], 0, 0.66, 100, 0.88],
            ],
            'icon-anchor': 'center',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
          },
          paint: {
            'icon-opacity': ['case', ['==', ['get', 'selected'], 1], 1, 0.98],
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
            'text-offset': [0, 1.55],
            'text-anchor': 'top',
            'text-allow-overlap': true,
            'text-ignore-placement': true,
          },
          paint: {
            'text-color': '#c68a11',
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
