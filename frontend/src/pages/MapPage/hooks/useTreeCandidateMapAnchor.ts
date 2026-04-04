import { useEffect, type Dispatch, type RefObject, type SetStateAction } from 'react';
import maplibregl from 'maplibre-gl';
import type { MapPoint } from '@/types/map-engine';
import type { TreeRankCandidate } from '@/types/tree-optimizer';

interface MapControllerLike {
  getContainerPoint: (point: MapPoint) => { x: number; y: number } | null;
}

export interface UseTreeCandidateMapAnchorParams {
  engine: string;
  rawMapRef: RefObject<unknown>;
  isTreeMode: boolean;
  selectedTreeCandidate: TreeRankCandidate | null;
  controller: MapControllerLike;
  setTreeCardAnchorPoint: Dispatch<SetStateAction<{ x: number; y: number } | null>>;
}

export function useTreeCandidateMapAnchor({
  engine,
  rawMapRef,
  isTreeMode,
  selectedTreeCandidate,
  controller,
  setTreeCardAnchorPoint,
}: UseTreeCandidateMapAnchorParams) {
  useEffect(() => {
    if (!isTreeMode || !selectedTreeCandidate) {
      setTreeCardAnchorPoint(null);
      return;
    }

    const updateAnchor = () => {
      const point = controller.getContainerPoint({
        lat: selectedTreeCandidate.lat,
        lng: selectedTreeCandidate.lng,
      });

      if (!point) {
        setTreeCardAnchorPoint((prev) => (prev === null ? prev : null));
        return;
      }

      setTreeCardAnchorPoint((prev) => {
        if (prev && prev.x === point.x && prev.y === point.y) {
          return prev;
        }
        return { x: point.x, y: point.y };
      });
    };

    updateAnchor();

    if (engine !== 'maplibre') return;
    const map = rawMapRef.current as maplibregl.Map | null;
    if (!map) return;

    map.on('move', updateAnchor);
    map.on('zoom', updateAnchor);
    map.on('resize', updateAnchor);

    return () => {
      map.off('move', updateAnchor);
      map.off('zoom', updateAnchor);
      map.off('resize', updateAnchor);
    };
  }, [controller, engine, isTreeMode, rawMapRef, selectedTreeCandidate]);
}
