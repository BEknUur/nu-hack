import { buildFeatureBBox, isBuildingPolygonFeature } from '@/hooks/maplibre/geo';
import type { StaticFeature, StaticRegionBBox } from '@/hooks/maplibre/types';

interface EnsureStaticFeaturesLoadedOptions {
  onLoadingChange: (loading: boolean) => void;
  isDisposedRef: { current: boolean };
  staticFeaturesRef: { current: StaticFeature[] };
  staticFeaturesLoadedRef: { current: boolean };
  staticFeaturesPromiseRef: { current: Promise<StaticFeature[]> | null };
  staticRegionRef: { current: StaticRegionBBox };
}

export async function ensureStaticFeaturesLoaded({
  onLoadingChange,
  isDisposedRef,
  staticFeaturesRef,
  staticFeaturesLoadedRef,
  staticFeaturesPromiseRef,
  staticRegionRef,
}: EnsureStaticFeaturesLoadedOptions): Promise<StaticFeature[]> {
  if (staticFeaturesLoadedRef.current) return staticFeaturesRef.current;
  if (staticFeaturesPromiseRef.current) return staticFeaturesPromiseRef.current;

  onLoadingChange(true);
  const request = (async () => {
    const [geoRes, summaryRes] = await Promise.all([
      fetch('/dataset/block-buildings.geojson'),
      fetch('/dataset/block-summary.json'),
    ]);
    if (!geoRes.ok) {
      throw new Error('Static buildings dataset not found');
    }
    if (!summaryRes.ok) {
      throw new Error('Static summary dataset not found');
    }

    const geo = await geoRes.json() as GeoJSON.FeatureCollection;
    const summary = await summaryRes.json() as {
      meta?: {
        bbox?: {
          s?: number;
          w?: number;
          n?: number;
          e?: number;
        };
      };
      buildings?: Array<{ id?: string; height?: number }>;
    };

    const metaBBox = summary.meta?.bbox;
    if (
      typeof metaBBox?.s === 'number' &&
      typeof metaBBox?.w === 'number' &&
      typeof metaBBox?.n === 'number' &&
      typeof metaBBox?.e === 'number'
    ) {
      staticRegionRef.current = {
        s: metaBBox.s,
        w: metaBBox.w,
        n: metaBBox.n,
        e: metaBBox.e,
      };
    }

    const heightById = new Map<string, number>();
    for (const b of summary.buildings ?? []) {
      if (!b.id) continue;
      if (typeof b.height === 'number' && Number.isFinite(b.height)) {
        heightById.set(b.id, b.height);
      }
    }

    const normalized = geo.features
      .filter(isBuildingPolygonFeature)
      .map((feature) => {
        const f = feature as StaticFeature;
        if (!f.properties) f.properties = {};
        const id = typeof f.properties.id === 'string' ? f.properties.id : undefined;
        const h = (id && heightById.get(id)) ?? Number(f.properties.height ?? f.properties.render_height ?? 3);
        f.properties.height = h;
        f.properties.render_height = h;
        f.__bbox = buildFeatureBBox(f);
        return f;
      });

    staticFeaturesRef.current = normalized;
    staticFeaturesLoadedRef.current = true;
    return normalized;
  })();

  staticFeaturesPromiseRef.current = request;
  try {
    return await request;
  } finally {
    staticFeaturesPromiseRef.current = null;
    if (!isDisposedRef.current) {
      onLoadingChange(false);
    }
  }
}
