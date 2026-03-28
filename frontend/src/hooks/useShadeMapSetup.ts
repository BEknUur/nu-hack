import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ShadeMap from 'leaflet-shadow-simulator';
import { MAP_CONFIG, SHADE_CONFIG, TERRAIN_SOURCE } from '@/config/map';
import { fetchBuildings } from '@/services/overpass';

interface UseShadeMapSetupOptions {
  initialDate: Date;
  /** Called when building fetch starts/ends — use a stable ref to avoid stale closures */
  onLoadingChange: (loading: boolean) => void;
}

export interface UseShadeMapSetupReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
  mapRef: React.RefObject<L.Map | null>;
  shadeMapRef: React.RefObject<ShadeMap | null>;
  zoom: number;
}

export function useShadeMapSetup({
  initialDate,
  onLoadingChange,
}: UseShadeMapSetupOptions): UseShadeMapSetupReturn {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const shadeMapRef = useRef<ShadeMap | null>(null);
  const [zoom, setZoom] = useState<number>(MAP_CONFIG.zoom);

  // Keep callback ref fresh so getFeatures never captures a stale closure
  const onLoadingChangeRef = useRef(onLoadingChange);
  onLoadingChangeRef.current = onLoadingChange;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: MAP_CONFIG.center,
      zoom: MAP_CONFIG.zoom,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer(MAP_CONFIG.tileUrl, {
      attribution: MAP_CONFIG.tileAttribution,
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    map.on('zoom', () => setZoom(map.getZoom()));

    const shadeMap = new ShadeMap({
      date: initialDate,
      color: SHADE_CONFIG.color,
      opacity: SHADE_CONFIG.opacity,
      apiKey: import.meta.env.VITE_SHADEMAP_API_KEY as string,
      terrainSource: TERRAIN_SOURCE,
      getFeatures: async () => {
        const m = mapRef.current;
        if (!m || m.getZoom() < MAP_CONFIG.buildingsMinZoom) return [];

        const bounds = m.getBounds();
        onLoadingChangeRef.current(true);
        try {
          return await fetchBuildings({
            s: bounds.getSouth(),
            w: bounds.getWest(),
            n: bounds.getNorth(),
            e: bounds.getEast(),
          });
        } catch (err) {
          console.error('Failed to load buildings:', err);
          return [];
        } finally {
          onLoadingChangeRef.current(false);
        }
      },
    }).addTo(map);

    shadeMapRef.current = shadeMap;

    return () => {
      shadeMap.onRemove();
      map.remove();
      mapRef.current = null;
      shadeMapRef.current = null;
    };
    // initialDate intentionally excluded — only used for construction, not updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { containerRef, mapRef, shadeMapRef, zoom };
}
