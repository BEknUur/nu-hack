import { MAP_ENGINE } from '@/config/runtime';
import { useLeafletMapEngine } from '@/hooks/useLeafletMapEngine';
import { useMapLibreMapEngine } from '@/hooks/useMapLibreMapEngine';

interface UseMapEngineOptions {
  initialDate: Date;
  onLoadingChange: (loading: boolean) => void;
}

export function useMapEngine(options: UseMapEngineOptions) {
  const leafletEngine = useLeafletMapEngine(options);
  const mapLibreEngine = useMapLibreMapEngine(options);

  if (MAP_ENGINE === 'leaflet') {
    return leafletEngine;
  }

  return mapLibreEngine;
}
