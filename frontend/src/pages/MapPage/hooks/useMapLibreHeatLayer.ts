import { useCallback, useEffect, useRef, type RefObject } from 'react';
import maplibregl from 'maplibre-gl';
import { fetchHeatGrid, type HeatCell } from '@/services/heatGrid';

const HEAT_SOURCE_ID = 'heat-lst-source';
const HEAT_FILL_LAYER_ID = 'heat-lst-fill';
const HEAT_LINE_LAYER_ID = 'heat-lst-line';

const CELL_HALF_DEG_LAT = 0.00045;   // ~50 m in latitude
const CELL_HALF_DEG_LON = 0.00072;   // ~50 m in longitude at ~51°N
const MAX_CELLS_HINT = 5_000;
const DEBOUNCE_MS = 500;

function cellToPolygon(cell: HeatCell): GeoJSON.Feature {
  const { lon, lat, lst, ndvi, priority } = cell;
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [lon - CELL_HALF_DEG_LON, lat - CELL_HALF_DEG_LAT],
        [lon + CELL_HALF_DEG_LON, lat - CELL_HALF_DEG_LAT],
        [lon + CELL_HALF_DEG_LON, lat + CELL_HALF_DEG_LAT],
        [lon - CELL_HALF_DEG_LON, lat + CELL_HALF_DEG_LAT],
        [lon - CELL_HALF_DEG_LON, lat - CELL_HALF_DEG_LAT],
      ]],
    },
    properties: { lon, lat, lst, ndvi, priority },
  };
}

function buildFeatureCollection(cells: HeatCell[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: cells.map(cellToPolygon),
  };
}

const EMPTY_FC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

export interface UseMapLibreHeatLayerParams {
  engine: string;
  rawMapRef: RefObject<unknown>;
  heatMode: boolean;
  setHeatHint: (hint: string | null) => void;
  setHeatLoading: (loading: boolean) => void;
}

export function useMapLibreHeatLayer({
  engine,
  rawMapRef,
  heatMode,
  setHeatHint,
  setHeatLoading,
}: UseMapLibreHeatLayerParams) {
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchAndRender = useCallback(async (map: maplibregl.Map) => {
    const bounds = map.getBounds();
    const lonMin = bounds.getWest();
    const latMin = bounds.getSouth();
    const lonMax = bounds.getEast();
    const latMax = bounds.getNorth();

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setHeatLoading(true);
    try {
      const data = await fetchHeatGrid(lonMin, latMin, lonMax, latMax);

      if (data.hint === 'zoom_in') {
        setHeatHint(`Too many cells (${data.count}) — zoom in closer`);
        const source = map.getSource(HEAT_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
        source?.setData(EMPTY_FC);
        return;
      }

      setHeatHint(null);
      const source = map.getSource(HEAT_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (source) {
        source.setData(buildFeatureCollection(data.cells));
      }
    } catch {
      // silently ignore fetch errors (map moved again, etc.)
    } finally {
      setHeatLoading(false);
    }
  }, [setHeatHint, setHeatLoading]);

  // Ensure layer exists in the map style
  const ensureLayers = useCallback((map: maplibregl.Map) => {
    if (!map.getSource(HEAT_SOURCE_ID)) {
      map.addSource(HEAT_SOURCE_ID, { type: 'geojson', data: EMPTY_FC });
    }

    if (!map.getLayer(HEAT_FILL_LAYER_ID)) {
      // Insert below sun-walls extrusion layer if it exists, so buildings stay on top
      const beforeLayer = map.getLayer('sun-walls-extrusion') ? 'sun-walls-extrusion' : undefined;
      map.addLayer(
        {
          id: HEAT_FILL_LAYER_ID,
          type: 'fill',
          source: HEAT_SOURCE_ID,
          paint: {
            'fill-color': [
              'interpolate',
              ['linear'],
              ['get', 'lst'],
              25, 'rgba(33,102,172,0.72)',
              32, 'rgba(90,180,100,0.72)',
              38, 'rgba(255,220,50,0.78)',
              44, 'rgba(220,60,20,0.82)',
              50, 'rgba(100,0,30,0.88)',
            ],
            'fill-opacity': 0.82,
          },
        },
        beforeLayer,
      );
    }

    if (!map.getLayer(HEAT_LINE_LAYER_ID)) {
      map.addLayer({
        id: HEAT_LINE_LAYER_ID,
        type: 'line',
        source: HEAT_SOURCE_ID,
        paint: {
          'line-color': 'rgba(0,0,0,0.06)',
          'line-width': 0.3,
        },
      });
    }
  }, []);

  useEffect(() => {
    if (engine !== 'maplibre') return;
    const map = rawMapRef.current as maplibregl.Map | null;
    if (!map) return;

    if (!heatMode) {
      // Hide layers when mode is off
      if (map.getLayer(HEAT_FILL_LAYER_ID)) {
        map.setLayoutProperty(HEAT_FILL_LAYER_ID, 'visibility', 'none');
        map.setLayoutProperty(HEAT_LINE_LAYER_ID, 'visibility', 'none');
      }
      popupRef.current?.remove();
      setHeatHint(null);
      return;
    }

    const init = () => {
      ensureLayers(map);
      map.setLayoutProperty(HEAT_FILL_LAYER_ID, 'visibility', 'visible');
      map.setLayoutProperty(HEAT_LINE_LAYER_ID, 'visibility', 'visible');
      void fetchAndRender(map);
    };

    if (map.isStyleLoaded()) {
      init();
    } else {
      map.once('load', init);
    }

    const scheduleFetch = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void fetchAndRender(map);
      }, DEBOUNCE_MS);
    };

    map.on('moveend', scheduleFetch);
    map.on('zoomend', scheduleFetch);

    // Click popup
    const clickHandler = (e: maplibregl.MapMouseEvent) => {
      if (!map.getLayer(HEAT_FILL_LAYER_ID)) return;
      const features = map.queryRenderedFeatures(e.point, { layers: [HEAT_FILL_LAYER_ID] });
      if (!features.length) return;

      const p = features[0].properties as { lst: number; ndvi: number; priority: number };
      const lst = typeof p.lst === 'number' ? p.lst.toFixed(1) : '—';
      const ndvi = typeof p.ndvi === 'number' ? p.ndvi.toFixed(3) : '—';
      const pri = typeof p.priority === 'number' ? (p.priority * 100).toFixed(0) : '—';

      popupRef.current?.remove();
      popupRef.current = new maplibregl.Popup({ closeButton: true, maxWidth: '200px' })
        .setLngLat(e.lngLat)
        .setHTML(
          `<div style="font-size:12px;line-height:1.6">
            <b>Surface temp (LST)</b>: ${lst}°C<br>
            <b>NDVI</b>: ${ndvi}<br>
            <b>Priority</b>: ${pri}/100
          </div>`,
        )
        .addTo(map);
    };

    const cursorOn = () => {
      if (map.getLayer(HEAT_FILL_LAYER_ID)) map.getCanvas().style.cursor = 'crosshair';
    };
    const cursorOff = () => {
      map.getCanvas().style.cursor = '';
    };

    map.on('click', HEAT_FILL_LAYER_ID, clickHandler);
    map.on('mouseenter', HEAT_FILL_LAYER_ID, cursorOn);
    map.on('mouseleave', HEAT_FILL_LAYER_ID, cursorOff);

    return () => {
      map.off('moveend', scheduleFetch);
      map.off('zoomend', scheduleFetch);
      map.off('click', HEAT_FILL_LAYER_ID, clickHandler);
      map.off('mouseenter', HEAT_FILL_LAYER_ID, cursorOn);
      map.off('mouseleave', HEAT_FILL_LAYER_ID, cursorOff);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      popupRef.current?.remove();
    };
  }, [engine, heatMode, rawMapRef, ensureLayers, fetchAndRender, setHeatHint]);
}
