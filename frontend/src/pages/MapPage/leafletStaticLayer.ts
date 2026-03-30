import L from 'leaflet';
import { MAP_CONFIG } from '@/config/map';
import { toSelectedBuilding } from '@/utils/buildings';

const SIDE_BEARINGS: Record<'N' | 'E' | 'S' | 'W', number> = {
  N: 0,
  E: 90,
  S: 180,
  W: 270,
};

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number) {
  return (rad * 180) / Math.PI;
}

function norm360(deg: number) {
  return ((deg % 360) + 360) % 360;
}

function angleDiff(a: number, b: number) {
  const d = Math.abs(norm360(a) - norm360(b));
  return d > 180 ? 360 - d : d;
}

function bearingFromAtoB(a: [number, number], b: [number, number]) {
  const latMeters = 111_320;
  const lngMeters = 111_320 * Math.cos(toRad((a[1] + b[1]) / 2));
  const dx = (b[0] - a[0]) * lngMeters;
  const dy = (b[1] - a[1]) * latMeters;
  return norm360(toDeg(Math.atan2(dx, dy)));
}

function polygonOuterRing(feature: GeoJSON.Feature): [number, number][] | null {
  const geometry = feature.geometry;
  if (!geometry) return null;
  if (geometry.type === 'Polygon') {
    return (geometry.coordinates[0] ?? []) as [number, number][];
  }
  if (geometry.type === 'MultiPolygon') {
    const firstPolygon = geometry.coordinates[0];
    return (firstPolygon?.[0] ?? []) as [number, number][];
  }
  return null;
}

function centroidOfRing(ring: [number, number][]) {
  if (!ring.length) return null;
  const sum = ring.reduce(
    (acc, [lng, lat]) => ({ lng: acc.lng + lng, lat: acc.lat + lat }),
    { lng: 0, lat: 0 },
  );
  return { lng: sum.lng / ring.length, lat: sum.lat / ring.length };
}

interface SetupLeafletStaticLayerOptions {
  rawMapRef: { current: unknown };
  staticDatasetLayerRef: { current: L.GeoJSON | null };
  sunEdgesLayerRef: { current: L.LayerGroup | null };
  suppressNextMapClickRef: { current: boolean };
  setContextMenu: (value: null) => void;
  setClickInfo: (value: null) => void;
  setSelectedBuilding: (building: import('@/types/building').SelectedBuilding | null) => void;
}

export function setupLeafletStaticLayer({
  rawMapRef,
  staticDatasetLayerRef,
  sunEdgesLayerRef,
  suppressNextMapClickRef,
  setContextMenu,
  setClickInfo,
  setSelectedBuilding,
}: SetupLeafletStaticLayerOptions): () => void {
  let disposed = false;
  let rafId = 0;
  let zoomHandlerAttached = false;
  let zoomHandlerMap: L.Map | null = null;
  let zoomHandler: (() => void) | null = null;

  async function loadStaticDatasetLayer() {
    const map = rawMapRef.current as L.Map | null;
    if (!map) return;

    try {
      const res = await fetch('/dataset/block-buildings.geojson');
      if (!res.ok) {
        console.warn('Static dataset not found at /dataset/block-buildings.geojson');
        return;
      }

      const geojson = await res.json() as GeoJSON.FeatureCollection;
      if (disposed) return;

      staticDatasetLayerRef.current?.remove();
      sunEdgesLayerRef.current?.remove();
      const sunEdgesLayer = L.layerGroup();

      staticDatasetLayerRef.current = L.geoJSON(geojson, {
        style: (feature) => {
          const props = (feature?.properties ?? {}) as { color?: string };
          return {
            color: '#1f2937',
            weight: 1,
            fillColor: props.color ?? '#f59e0b',
            fillOpacity: 0.45,
          };
        },
        onEachFeature: (feature, layer) => {
          const props = (feature.properties ?? {}) as {
            id?: string;
            bestSide?: string;
            sidePct?: Partial<Record<'N' | 'E' | 'S' | 'W', number>>;
          };
          const pct = props.sidePct ?? {};
          const popup = [
            `<b>${props.id ?? 'Building'}</b>`,
            `Best side: <b>${props.bestSide ?? '-'}</b>`,
            `N: ${pct.N ?? 0}% | E: ${pct.E ?? 0}%`,
            `S: ${pct.S ?? 0}% | W: ${pct.W ?? 0}%`,
          ].join('<br/>');
          layer.bindPopup(popup);
          layer.on('click', () => {
            suppressNextMapClickRef.current = true;
            setContextMenu(null);
            setClickInfo(null);
            setSelectedBuilding(toSelectedBuilding(feature as GeoJSON.Feature));
          });

          const bestSide = props.bestSide as 'N' | 'E' | 'S' | 'W' | undefined;
          if (!bestSide) return;

          const ring = polygonOuterRing(feature as GeoJSON.Feature);
          if (!ring || ring.length < 4) return;
          const center = centroidOfRing(ring);
          if (!center) return;
          const targetBearing = SIDE_BEARINGS[bestSide];
          const maxDeviation = 45;

          for (let i = 0; i < ring.length - 1; i += 1) {
            const a = ring[i];
            const b = ring[i + 1];
            const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
            const outwardBearing = bearingFromAtoB([center.lng, center.lat], mid);

            if (angleDiff(outwardBearing, targetBearing) > maxDeviation) continue;
            const latLngs: [number, number][] = [
              [a[1], a[0]],
              [b[1], b[0]],
            ];

            L.polyline(latLngs, {
              color: '#ffd54f',
              weight: 8,
              opacity: 0.18,
              lineCap: 'round',
            }).addTo(sunEdgesLayer);

            L.polyline(latLngs, {
              color: '#ffeb3b',
              weight: 3,
              opacity: 0.95,
              lineCap: 'round',
            }).addTo(sunEdgesLayer);
          }
        },
      }).addTo(map);

      function updateSunEdgesVisibility() {
        const currentMap = rawMapRef.current as L.Map | null;
        if (!sunEdgesLayerRef.current || !currentMap) return;
        const shouldShow = currentMap.getZoom() >= MAP_CONFIG.buildingsMinZoom;
        if (shouldShow) {
          if (!currentMap.hasLayer(sunEdgesLayerRef.current)) {
            sunEdgesLayerRef.current.addTo(currentMap);
          }
        } else if (currentMap.hasLayer(sunEdgesLayerRef.current)) {
          currentMap.removeLayer(sunEdgesLayerRef.current);
        }
      }

      zoomHandler = updateSunEdgesVisibility;
      zoomHandlerMap = map;
      zoomHandlerAttached = true;
      map.on('zoomend', updateSunEdgesVisibility);

      sunEdgesLayerRef.current = sunEdgesLayer;
      updateSunEdgesVisibility();
    } catch (err) {
      console.error('Failed to load static dataset layer:', err);
    }
  }

  function waitForMapAndLoad() {
    if (disposed) return;
    if (!rawMapRef.current) {
      rafId = window.requestAnimationFrame(waitForMapAndLoad);
      return;
    }
    void loadStaticDatasetLayer();
  }

  waitForMapAndLoad();
  return () => {
    disposed = true;
    if (rafId) window.cancelAnimationFrame(rafId);
    if (zoomHandlerAttached && zoomHandlerMap && zoomHandler) {
      zoomHandlerMap.off('zoomend', zoomHandler);
    }
    staticDatasetLayerRef.current?.remove();
    sunEdgesLayerRef.current?.remove();
    staticDatasetLayerRef.current = null;
    sunEdgesLayerRef.current = null;
  };
}
