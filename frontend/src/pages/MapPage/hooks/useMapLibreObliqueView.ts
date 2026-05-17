import { useEffect, type Dispatch, type RefObject, type SetStateAction } from 'react';

export interface UseMapLibreObliqueViewParams {
  engine: string;
  rawMapRef: RefObject<unknown>;
  is3D: boolean;
  setIs3D: Dispatch<SetStateAction<boolean>>;
}

/** 2D/3D control: MapLibre camera pitch/bearing when `is3D` toggles. */
export function useMapLibreObliqueView({
  engine,
  rawMapRef,
  is3D,
  setIs3D,
}: UseMapLibreObliqueViewParams) {
  useEffect(() => {
    if (engine !== 'maplibre') {
      setIs3D(false);
      return;
    }

    const map = rawMapRef.current as {
      loaded?: () => boolean;
      once?: (event: string, listener: () => void) => void;
      easeTo?: (options: { pitch: number; bearing: number; duration: number }) => void;
    } | null;
    if (!map) return;

    const applyView = () => {
      map.easeTo?.({
        pitch: is3D ? 58 : 0,
        bearing: is3D ? -18 : 0,
        duration: 450,
      });
    };

    if (map.loaded?.()) {
      applyView();
      return;
    }

    map.once?.('load', applyView);
  }, [engine, is3D, rawMapRef]);
}
