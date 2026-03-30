import maplibregl from 'maplibre-gl';
import { EMPTY_FEATURE_COLLECTION } from '@/hooks/maplibre/constants';

export function toFeatureCollection(features: GeoJSON.Feature[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features,
  };
}

export function setGeoJsonSourceData(source: maplibregl.GeoJSONSource | undefined, features: GeoJSON.Feature[]) {
  source?.setData(toFeatureCollection(features));
}

export function clearGeoJsonSource(source: maplibregl.GeoJSONSource | undefined) {
  source?.setData(EMPTY_FEATURE_COLLECTION);
}

export function buildBoundsCacheKey(bounds: maplibregl.LngLatBounds, zoomBucket: number) {
  return [
    zoomBucket,
    bounds.getSouth().toFixed(3),
    bounds.getWest().toFixed(3),
    bounds.getNorth().toFixed(3),
    bounds.getEast().toFixed(3),
  ].join(':');
}
