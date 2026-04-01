import { useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import type { MapEngineController } from '@/types/map-engine';
import type { TreeRankCandidate } from '@/types/tree-optimizer';

interface UseTreeCandidateAnchorArgs {
  enabled: boolean;
  engine: string;
  rawMapRef: React.RefObject<unknown>;
  controller: MapEngineController;
  selectedTreeCandidate: TreeRankCandidate | null;
  setTreeCardAnchorPoint: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
}

export function useTreeCandidateAnchor({
  enabled,
  engine,
  rawMapRef,
  controller,
  selectedTreeCandidate,
  setTreeCardAnchorPoint,
}: UseTreeCandidateAnchorArgs) {
  useEffect(() => {
    if (!enabled || !selectedTreeCandidate) {
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
  }, [controller, enabled, engine, rawMapRef, selectedTreeCandidate, setTreeCardAnchorPoint]);
}
