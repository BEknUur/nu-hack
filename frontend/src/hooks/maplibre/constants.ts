import maplibregl from 'maplibre-gl';
import { MAP_CONFIG } from '@/config/map';
import type { StaticRegionBBox } from './types';

export const BUILDING_SOURCE_ID = 'osm-buildings';
export const SUN_WALLS_SOURCE_ID = 'sun-walls';
export const SUN_WALLS_LAYER_ID = 'sun-walls-extrusion';
export const TREE_HEAT_SOURCE_ID = 'tree-heat-source';
export const TREE_HEAT_LAYER_ID = 'tree-heat-layer';
export const TREE_TOP_SOURCE_ID = 'tree-top-source';
export const TREE_TOP_LAYER_ID = 'tree-top-layer';
export const TREE_COVERAGE_SOURCE_ID = 'tree-coverage-source';
export const TREE_COVERAGE_FILL_LAYER_ID = 'tree-coverage-fill-layer';
export const TREE_COVERAGE_LINE_LAYER_ID = 'tree-coverage-line-layer';
export const MAX_VISIBLE_STATIC_FEATURES = 4500;

export const EMPTY_FEATURE_COLLECTION: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

export const DEFAULT_STATIC_REGION: StaticRegionBBox = {
  s: MAP_CONFIG.center[0] - 0.12,
  w: MAP_CONFIG.center[1] - 0.2,
  n: MAP_CONFIG.center[0] + 0.12,
  e: MAP_CONFIG.center[1] + 0.2,
};

export const SIDE_BEARINGS: Record<'N' | 'E' | 'S' | 'W', number> = {
  N: 0,
  E: 90,
  S: 180,
  W: 270,
};

export const OSM_TILE_URLS = [
  'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
  'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
  'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
];

export const SATELLITE_TILE_URLS = [
  'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
];

export const MAPLIBRE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: OSM_TILE_URLS,
      tileSize: 256,
      attribution: MAP_CONFIG.tileAttribution,
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
    },
  ],
};
