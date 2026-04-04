import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import {
  EMPTY_FEATURE_COLLECTION,
  SOLAR_PANEL_3D_SOURCE_ID,
  SOLAR_PANEL_3D_LAYER_ID,
} from '@/hooks/maplibre/constants';
import type { SolarCandidate } from '@/types/solar-flowers';

interface UseSolar3DLayerArgs {
  engine: string;
  rawMapRef: React.RefObject<unknown>;
  isSolarMode: boolean;
  solarCandidates: SolarCandidate[];
  selectedSolarCandidateId: string | null;
}

const HEX_RADIUS_DEG = 0.000045;
const HEX_SIDES = 6;

function makeHexPolygon(lng: number, lat: number): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  for (let i = 0; i < HEX_SIDES; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    coords.push([lng + HEX_RADIUS_DEG * Math.cos(angle), lat + HEX_RADIUS_DEG * Math.sin(angle)]);
  }
  coords.push(coords[0]);
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [coords] },
    properties: {},
  };
}

export function useSolar3DLayer({
  engine,
  rawMapRef,
  isSolarMode,
  solarCandidates,
  selectedSolarCandidateId,
}: UseSolar3DLayerArgs) {
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (engine !== 'maplibre') return;
    const map = rawMapRef.current as maplibregl.Map | null;
    if (!map) return;

    const update3D = () => {
      if (!map.getSource(SOLAR_PANEL_3D_SOURCE_ID)) {
        map.addSource(SOLAR_PANEL_3D_SOURCE_ID, {
          type: 'geojson',
          data: EMPTY_FEATURE_COLLECTION,
        });
      }

      if (!map.getLayer(SOLAR_PANEL_3D_LAYER_ID)) {
        map.addLayer({
          id: SOLAR_PANEL_3D_LAYER_ID,
          type: 'fill-extrusion',
          source: SOLAR_PANEL_3D_SOURCE_ID,
          paint: {
            'fill-extrusion-color': [
              'interpolate', ['linear'], ['to-number', ['get', 'score']],
              0,  '#7c2d12',
              55, '#c2410c',
              75, '#f97316',
              90, '#fbbf24',
            ],
            'fill-extrusion-height': [
              'interpolate', ['linear'], ['to-number', ['get', 'score']],
              0, 1.5, 100, 6.0,
            ],
            'fill-extrusion-base': 0,
            // This MapLibre build does not support data expressions for fill-extrusion-opacity.
            'fill-extrusion-opacity': 0.78,
          },
        });
      }

      const source = map.getSource(SOLAR_PANEL_3D_SOURCE_ID) as maplibregl.GeoJSONSource;

      if (!isSolarMode || solarCandidates.length === 0) {
        source.setData(EMPTY_FEATURE_COLLECTION);
        if (prevCountRef.current > 0) {
          map.easeTo({ pitch: 0, bearing: 0, duration: 600 });
        }
        prevCountRef.current = 0;
        return;
      }

      source.setData({
        type: 'FeatureCollection',
        features: solarCandidates.map((c) => {
          const hex = makeHexPolygon(c.lng, c.lat);
          hex.properties = {
            id: c.id,
            score: c.score,
            selected: c.id === selectedSolarCandidateId ? 1 : 0,
          };
          return hex;
        }),
      });

      prevCountRef.current = solarCandidates.length;
    };

    if (map.isStyleLoaded()) {
      update3D();
    } else {
      map.once('load', update3D);
    }
  }, [engine, isSolarMode, rawMapRef, selectedSolarCandidateId, solarCandidates]);
}
