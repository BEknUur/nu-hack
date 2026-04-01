import { useEffect } from 'react';
import L from 'leaflet';
import { buildBestSideHighlightFeatureCollection } from '@/utils/bestSideHighlight';
import { renderLeafletSelectedBuildingLayer } from '@/pages/MapPage/leafletSelectionLayer';
import {
  SELECTED_BUILDING_GLOW_LAYER_ID,
  SELECTED_BUILDING_LINE_LAYER_ID,
  SELECTED_BUILDING_SOURCE_ID,
} from '@/pages/MapPage/constants';
import type { SelectedBuilding } from '@/types/building';

interface UseSelectedBuildingHighlightArgs {
  engine: string;
  rawMapRef: React.RefObject<unknown>;
  selectedBuildingLayerRef: React.RefObject<L.LayerGroup | null>;
  selectedBuilding: SelectedBuilding | null;
  bestSide: 'N' | 'E' | 'S' | 'W' | null | undefined;
}

export function useSelectedBuildingHighlight({
  engine,
  rawMapRef,
  selectedBuildingLayerRef,
  selectedBuilding,
  bestSide,
}: UseSelectedBuildingHighlightArgs) {
  useEffect(() => {
    const map = rawMapRef.current as L.Map | {
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
    } | null;

    if (!map || !selectedBuilding || !bestSide) {
      selectedBuildingLayerRef.current?.remove();
      selectedBuildingLayerRef.current = null;
      const source = (rawMapRef.current as {
        getSource?: (id: string) => { setData?: (data: GeoJSON.FeatureCollection) => void } | undefined;
      } | null)?.getSource?.(SELECTED_BUILDING_SOURCE_ID);
      source?.setData?.({ type: 'FeatureCollection', features: [] });
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

    const updateOverlay = () => {
      if (!mapLibreMap.getSource?.(SELECTED_BUILDING_SOURCE_ID)) {
        mapLibreMap.addSource?.(SELECTED_BUILDING_SOURCE_ID, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }
      if (!mapLibreMap.getLayer?.(SELECTED_BUILDING_GLOW_LAYER_ID)) {
        mapLibreMap.addLayer?.({
          id: SELECTED_BUILDING_GLOW_LAYER_ID,
          type: 'line',
          source: SELECTED_BUILDING_SOURCE_ID,
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
      if (!mapLibreMap.getLayer?.(SELECTED_BUILDING_LINE_LAYER_ID)) {
        mapLibreMap.addLayer?.({
          id: SELECTED_BUILDING_LINE_LAYER_ID,
          type: 'line',
          source: SELECTED_BUILDING_SOURCE_ID,
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
      mapLibreMap.getSource?.(SELECTED_BUILDING_SOURCE_ID)?.setData?.(
        buildBestSideHighlightFeatureCollection(selectedBuilding, bestSide),
      );
    };

    if (mapLibreMap.isStyleLoaded?.()) {
      updateOverlay();
      return;
    }
    mapLibreMap.once?.('load', updateOverlay);
  }, [bestSide, engine, rawMapRef, selectedBuilding, selectedBuildingLayerRef]);
}
