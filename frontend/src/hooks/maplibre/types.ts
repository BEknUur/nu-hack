export interface BuildingsCacheEntry {
  key: string;
  data: GeoJSON.Feature[];
  ts: number;
}

export type StaticFeature = GeoJSON.Feature & {
  __bbox?: {
    minLng: number;
    minLat: number;
    maxLng: number;
    maxLat: number;
  };
};

export interface StaticRegionBBox {
  s: number;
  w: number;
  n: number;
  e: number;
}
