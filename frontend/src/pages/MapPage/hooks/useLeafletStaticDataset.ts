import { useEffect } from 'react';
import L from 'leaflet';
import { setupLeafletStaticLayer } from '@/pages/MapPage/leafletStaticLayer';
import type { ClickInfo } from '@/types/map';

interface UseLeafletStaticDatasetArgs {
  engine: string;
  rawMapRef: React.RefObject<unknown>;
  staticDatasetLayerRef: React.RefObject<L.GeoJSON | null>;
  sunEdgesLayerRef: React.RefObject<L.LayerGroup | null>;
  suppressNextMapClickRef: React.RefObject<boolean>;
  setClickInfo: React.Dispatch<React.SetStateAction<ClickInfo | null>>;
}

export function useLeafletStaticDataset({
  engine,
  rawMapRef,
  staticDatasetLayerRef,
  sunEdgesLayerRef,
  suppressNextMapClickRef,
  setClickInfo,
}: UseLeafletStaticDatasetArgs) {
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
  }, [engine, rawMapRef, setClickInfo, staticDatasetLayerRef, sunEdgesLayerRef, suppressNextMapClickRef]);
}
