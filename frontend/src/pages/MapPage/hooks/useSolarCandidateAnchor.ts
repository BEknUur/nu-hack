import { useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import type { MapEngineController } from '@/types/map-engine';
import type { SolarCandidate } from '@/types/solar-flowers';

interface UseSolarCandidateAnchorArgs {
  enabled: boolean;
  engine: string;
  rawMapRef: React.RefObject<unknown>;
  controller: MapEngineController;
  selectedSolarCandidate: SolarCandidate | null;
  setSolarCardAnchorPoint: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
}

export function useSolarCandidateAnchor({
  enabled,
  engine,
  rawMapRef,
  controller,
  selectedSolarCandidate,
  setSolarCardAnchorPoint,
}: UseSolarCandidateAnchorArgs) {
  useEffect(() => {
    if (!enabled || !selectedSolarCandidate) {
      setSolarCardAnchorPoint(null);
      return;
    }

    const updateAnchor = () => {
      const point = controller.getContainerPoint({
        lat: selectedSolarCandidate.lat,
        lng: selectedSolarCandidate.lng,
      });

      if (!point) {
        setSolarCardAnchorPoint((prev) => (prev === null ? prev : null));
        return;
      }

      setSolarCardAnchorPoint((prev) => {
        if (prev && prev.x === point.x && prev.y === point.y) return prev;
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
  }, [controller, enabled, engine, rawMapRef, selectedSolarCandidate, setSolarCardAnchorPoint]);
}
