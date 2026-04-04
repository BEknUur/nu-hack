import { useEffect, type Dispatch, type MutableRefObject, type RefObject, type SetStateAction } from 'react';
import L from 'leaflet';
import type { ClickInfo } from '@/types/map';
import { setupLeafletStaticLayer } from '@/pages/MapPage/leafletStaticLayer';

export interface UseLeafletStaticSunLayerParams {
  engine: string;
  rawMapRef: RefObject<unknown>;
  staticDatasetLayerRef: MutableRefObject<L.GeoJSON | null>;
  sunEdgesLayerRef: MutableRefObject<L.LayerGroup | null>;
  suppressNextMapClickRef: MutableRefObject<boolean>;
  setClickInfo: Dispatch<SetStateAction<ClickInfo | null>>;
}

export function useLeafletStaticSunLayer({
  engine,
  rawMapRef,
  staticDatasetLayerRef,
  sunEdgesLayerRef,
  suppressNextMapClickRef,
  setClickInfo,
}: UseLeafletStaticSunLayerParams) {
  useEffect(() => {
    if (engine !== 'leaflet') return;
    return setupLeafletStaticLayer({
      rawMapRef,
      staticDatasetLayerRef,
      sunEdgesLayerRef,
      suppressNextMapClickRef,
      setContextMenu: () => {},
      setClickInfo: () => setClickInfo(null),
    });
  }, [engine, rawMapRef]);
}
