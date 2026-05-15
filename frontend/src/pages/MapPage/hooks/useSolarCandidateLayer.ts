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

    const pickCandidate = (point: maplibregl.Point) => {
      if (!map.getLayer(SOLAR_RANK_LAYER_ID)) return null;
      const features = map.queryRenderedFeatures(point, { layers: [SOLAR_RANK_LAYER_ID] });
      const candidateId = features[0]?.properties?.id;
      if (typeof candidateId !== 'string') return null;
      return solarCandidates.find((c) => c.id === candidateId) ?? null;
    };

    const clickHandler = (event: maplibregl.MapMouseEvent) => {
      if (!isSolarMode || solarDrawArmed || solarDrawing) return;
      const candidate = pickCandidate(event.point);
      if (!candidate) return;
      onSelectCandidate(candidate);
    };

    const mouseMoveHandler = (event: maplibregl.MapMouseEvent) => {
      if (!isSolarMode || solarDrawArmed || solarDrawing) return;
      map.getCanvas().style.cursor = pickCandidate(event.point) ? 'pointer' : '';
    };

    const mouseOutHandler = () => {
      map.getCanvas().style.cursor = '';
    };

    const updateSource = () => {
      if (!map.getSource(SOLAR_RANK_SOURCE_ID)) {
        map.addSource(SOLAR_RANK_SOURCE_ID, {
          type: 'geojson',
          data: EMPTY_FEATURE_COLLECTION,
        });
      }

      if (!map.getLayer(SOLAR_RANK_LAYER_ID)) {
        map.addLayer({
          id: SOLAR_RANK_LAYER_ID,
          type: 'circle',
          source: SOLAR_RANK_SOURCE_ID,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['to-number', ['get', 'score']], 0, 5, 100, 11],
            'circle-color': [
              'interpolate',
              ['linear'],
              ['to-number', ['get', 'score']],
              0, '#6b4c1e',
              55, '#c2620a',
              75, '#fb923c',
              90, '#fbbf24',
            ],
            'circle-opacity': ['case', ['==', ['get', 'selected'], 1], 0.97, 0.88],
            'circle-stroke-width': ['case', ['==', ['get', 'selected'], 1], 2.8, 1.2],
            'circle-stroke-color': ['case', ['==', ['get', 'selected'], 1], '#1a0a00', '#ffffff'],
          },
        });
      }

      if (!map.getLayer(SOLAR_RANK_LABEL_LAYER_ID)) {
        map.addLayer({
          id: SOLAR_RANK_LABEL_LAYER_ID,
          type: 'symbol',
          source: SOLAR_RANK_SOURCE_ID,
          layout: {
            'text-field': ['get', 'rank_label'],
            'text-size': 10,
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-offset': [0, 1.2],
            'text-anchor': 'top',
          },
          paint: {
            'text-color': '#7c2d12',
            'text-halo-color': '#ffffff',
            'text-halo-width': 0.8,
          },
        });
      }

      const source = map.getSource(SOLAR_RANK_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (!source) return;

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

    map.on('click', clickHandler);
    map.on('mousemove', mouseMoveHandler);
    map.on('mouseout', mouseOutHandler);

    return () => {
      map.off('click', clickHandler);
      map.off('mousemove', mouseMoveHandler);
      map.off('mouseout', mouseOutHandler);
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
