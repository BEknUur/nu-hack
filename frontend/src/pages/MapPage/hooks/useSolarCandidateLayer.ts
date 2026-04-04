import { useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import {
  EMPTY_FEATURE_COLLECTION,
  SOLAR_RANK_LABEL_LAYER_ID,
  SOLAR_RANK_LAYER_ID,
  SOLAR_RANK_SOURCE_ID,
} from '@/hooks/maplibre/constants';
import type { SolarCandidate } from '@/types/solar-flowers';

interface UseSolarCandidateLayerArgs {
  engine: string;
  rawMapRef: React.RefObject<unknown>;
  isSolarMode: boolean;
  solarCandidates: SolarCandidate[];
  selectedSolarCandidateId: string | null;
  solarDrawArmed: boolean;
  solarDrawing: boolean;
  onSelectCandidate: (candidate: SolarCandidate) => void;
}

export function useSolarCandidateLayer({
  engine,
  rawMapRef,
  isSolarMode,
  solarCandidates,
  selectedSolarCandidateId,
  solarDrawArmed,
  solarDrawing,
  onSelectCandidate,
}: UseSolarCandidateLayerArgs) {
  useEffect(() => {
    if (engine !== 'maplibre') return;
    const map = rawMapRef.current as maplibregl.Map | null;
    if (!map) return;

    const pickCandidate = (point: maplibregl.Point): SolarCandidate | null => {
      if (!map.getLayer(SOLAR_RANK_LAYER_ID)) return null;
      const features = map.queryRenderedFeatures(point, { layers: [SOLAR_RANK_LAYER_ID] });
      const id = features[0]?.properties?.id;
      if (typeof id !== 'string') return null;
      return solarCandidates.find((c) => c.id === id) ?? null;
    };

    const onClick = (e: maplibregl.MapMouseEvent) => {
      if (!isSolarMode || solarDrawArmed || solarDrawing) return;
      const hit = pickCandidate(e.point);
      if (hit) onSelectCandidate(hit);
    };

    const onMove = (e: maplibregl.MapMouseEvent) => {
      if (!isSolarMode || solarDrawArmed || solarDrawing) return;
      map.getCanvas().style.cursor = pickCandidate(e.point) ? 'pointer' : '';
    };

    const onOut = () => {
      map.getCanvas().style.cursor = '';
    };

    const updateSource = () => {
      // Ensure source exists
      if (!map.getSource(SOLAR_RANK_SOURCE_ID)) {
        map.addSource(SOLAR_RANK_SOURCE_ID, {
          type: 'geojson',
          data: EMPTY_FEATURE_COLLECTION,
        });
      }

      // Ensure circle layer exists
      if (!map.getLayer(SOLAR_RANK_LAYER_ID)) {
        map.addLayer({
          id: SOLAR_RANK_LAYER_ID,
          type: 'circle',
          source: SOLAR_RANK_SOURCE_ID,
          paint: {
            'circle-radius': [
              'interpolate', ['linear'], ['to-number', ['get', 'score']],
              0, 6, 100, 13,
            ],
            'circle-color': [
              'interpolate', ['linear'], ['to-number', ['get', 'score']],
              0,  '#6b4c1e',
              55, '#c2620a',
              75, '#fb923c',
              90, '#fbbf24',
            ],
            'circle-opacity': ['case', ['==', ['get', 'selected'], 1], 1.0, 0.9],
            'circle-stroke-width': ['case', ['==', ['get', 'selected'], 1], 3.0, 1.5],
            'circle-stroke-color': ['case', ['==', ['get', 'selected'], 1], '#fff7ed', '#ffffff'],
          },
        });
      }

      // Ensure label layer exists
      if (!map.getLayer(SOLAR_RANK_LABEL_LAYER_ID)) {
        map.addLayer({
          id: SOLAR_RANK_LABEL_LAYER_ID,
          type: 'symbol',
          source: SOLAR_RANK_SOURCE_ID,
          layout: {
            'text-field': ['get', 'rank_label'],
            'text-size': 10,
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-offset': [0, 1.4],
            'text-anchor': 'top',
          },
          paint: {
            'text-color': '#7c2d12',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.0,
          },
        });
      }

      // Keep points/labels above any solar 3D extrusion layers.
      if (map.getLayer(SOLAR_RANK_LAYER_ID)) {
        map.moveLayer(SOLAR_RANK_LAYER_ID);
      }
      if (map.getLayer(SOLAR_RANK_LABEL_LAYER_ID)) {
        map.moveLayer(SOLAR_RANK_LABEL_LAYER_ID);
      }

      const source = map.getSource(SOLAR_RANK_SOURCE_ID) as maplibregl.GeoJSONSource;

      if (!isSolarMode || solarCandidates.length === 0) {
        source.setData(EMPTY_FEATURE_COLLECTION);
        return;
      }

      source.setData({
        type: 'FeatureCollection',
        features: solarCandidates.map((c) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [c.lng, c.lat] },
          properties: {
            id: c.id,
            score: c.score,
            rank_label: `#${c.rank}`,
            selected: c.id === selectedSolarCandidateId ? 1 : 0,
          },
        })),
      });
    };

    if (map.isStyleLoaded()) {
      updateSource();
    } else {
      map.once('load', updateSource);
    }

    map.on('click', onClick);
    map.on('mousemove', onMove);
    map.on('mouseout', onOut);

    return () => {
      map.off('click', onClick);
      map.off('mousemove', onMove);
      map.off('mouseout', onOut);
      map.getCanvas().style.cursor = '';
    };
  }, [
    engine,
    isSolarMode,
    onSelectCandidate,
    rawMapRef,
    selectedSolarCandidateId,
    solarCandidates,
    solarDrawArmed,
    solarDrawing,
  ]);
}
