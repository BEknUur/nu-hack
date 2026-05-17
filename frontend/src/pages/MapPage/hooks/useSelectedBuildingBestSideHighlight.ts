import { useEffect, type RefObject } from 'react';
import L from 'leaflet';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { renderLeafletSelectedBuildingLayer } from '@/pages/MapPage/leafletSelectionLayer';
import type { SelectedBuilding } from '@/types/building';
import { buildBestSideHighlightFeatureCollection } from '@/utils/bestSideHighlight';

export interface UseSelectedBuildingBestSideHighlightParams {
  engine: string;
  rawMapRef: RefObject<unknown>;
  selectedBuilding: SelectedBuilding | null;
  predictedBestSide: 'N' | 'E' | 'S' | 'W' | null | undefined;
  selectedBuildingLayerRef: RefObject<L.LayerGroup | null>;
}

export function useSelectedBuildingBestSideHighlight({
  engine,
  rawMapRef,
  selectedBuilding,
  predictedBestSide,
  selectedBuildingLayerRef,
}: UseSelectedBuildingBestSideHighlightParams) {
  useEffect(() => {
    const bestSide = predictedBestSide ?? null;
    const map = rawMapRef.current as L.Map | MapLibreMap | null;
    if (!map || !selectedBuilding || !bestSide) {
      selectedBuildingLayerRef.current?.remove();
      selectedBuildingLayerRef.current = null;
      if (engine === 'maplibre') {
        const mapLibreMap = rawMapRef.current as {
          getSource?: (id: string) => { setData?: (data: GeoJSON.FeatureCollection) => void } | undefined;
          getLayer?: (id: string) => unknown;
          removeLayer?: (id: string) => void;
          removeSource?: (id: string) => void;
          isStyleLoaded?: () => boolean;
          once?: (event: 'load', listener: () => void) => void;
        } | null;
        const source = mapLibreMap?.getSource?.('selected-building-highlight');
        source?.setData?.({ type: 'FeatureCollection', features: [] });
      }
      return;
    }

    if (engine === 'leaflet') {
      selectedBuildingLayerRef.current?.remove();
      selectedBuildingLayerRef.current = renderLeafletSelectedBuildingLayer(
        map as L.Map,
        selectedBuilding,
        bestSide,
      );
      return;
    }

    const mapLibreMap = map as {
      addSource?: (id: string, source: { type: 'geojson'; data: GeoJSON.FeatureCollection }) => void;
      addLayer?: (layer: {
        id: string;
        type: 'line';
        source: string;
        layout?: Record<string, unknown>;
        paint: Record<string, unknown>;
      }) => void;
      getSource?: (id: string) => { setData?: (data: GeoJSON.FeatureCollection) => void } | undefined;
      getLayer?: (id: string) => unknown;
      isStyleLoaded?: () => boolean;
      once?: (event: 'load', listener: () => void) => void;
    };
    const sourceId = 'selected-building-highlight';
    const glowLayerId = 'selected-building-highlight-glow';
    const lineLayerId = 'selected-building-highlight-line';
    const updateMapLibreOverlay = () => {
      if (!mapLibreMap.getSource?.(sourceId)) {
        mapLibreMap.addSource?.(sourceId, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }
      if (!mapLibreMap.getLayer?.(glowLayerId)) {
        mapLibreMap.addLayer?.({
          id: glowLayerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': '#ffd54f',
            'line-width': 8,
            'line-opacity': 0.18,
          },
        });
      }
      if (!mapLibreMap.getLayer?.(lineLayerId)) {
        mapLibreMap.addLayer?.({
          id: lineLayerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': '#ffeb3b',
            'line-width': 3,
            'line-opacity': 0.95,
          },
        });
      }
      const source = mapLibreMap.getSource?.(sourceId);
      source?.setData?.(buildBestSideHighlightFeatureCollection(selectedBuilding, bestSide));
    };

    if (mapLibreMap.isStyleLoaded?.()) {
      updateMapLibreOverlay();
      return;
    }

    mapLibreMap.once?.('load', updateMapLibreOverlay);
  }, [engine, rawMapRef, selectedBuilding, predictedBestSide]);
}
