import maplibregl from 'maplibre-gl';
import {
  TREE_COVERAGE_FILL_LAYER_ID,
  TREE_COVERAGE_LINE_LAYER_ID,
  TREE_COVERAGE_SOURCE_ID,
  TREE_HEAT_LAYER_ID,
  TREE_HEAT_SOURCE_ID,
  TREE_TOP_LAYER_ID,
  TREE_TOP_SOURCE_ID,
} from '@/hooks/maplibre/constants';

interface TreeHeatPoint {
  lat: number;
  lng: number;
  score: number;
}

function toHeatFeatureCollection(rows: TreeHeatPoint[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: rows.map((row) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [row.lng, row.lat],
      },
      properties: {
        score: row.score,
      },
    })),
  };
}

interface TreeLayerOptions {
  showHeatLayer?: boolean;
  showCoverageLayer?: boolean;
  pointsMode?: TreePointsMode;
}

export type TreePointsMode = 'top100' | 'top300' | 'roadside';

const TREE_POINTS_DATASET_PATH: Record<TreePointsMode, string> = {
  top100: '/dataset/astana-tree-top100.geojson',
  top300: '/dataset/astana-tree-top300.geojson',
  roadside: '/dataset/astana-tree-roadside.geojson',
};

const treePointsCache = new Map<TreePointsMode, GeoJSON.FeatureCollection>();

const TREE_STUDY_BBOX = {
  north: 51.1570,
  south: 51.0985,
  east: 71.4757,
  west: 71.3853,
};

function toCoverageFeatureCollection(): GeoJSON.FeatureCollection {
  const { west, south, east, north } = TREE_STUDY_BBOX;
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [west, south],
            [east, south],
            [east, north],
            [west, north],
            [west, south],
          ]],
        },
        properties: {
          name: 'Checked area',
        },
      },
    ],
  };
}

export async function addTreeOptimizerLayers(
  map: maplibregl.Map,
  options: TreeLayerOptions = {},
): Promise<void> {
  const { showHeatLayer = true, showCoverageLayer = false, pointsMode = 'top100' } = options;
  const [heatRes, topRes] = await Promise.all([
    fetch('/dataset/astana-tree-heat-points.json'),
    loadTreePointsDataset(pointsMode),
  ]);
  if (!heatRes.ok) {
    throw new Error('Failed to load Astana tree optimizer datasets');
  }

  const heatRows = await heatRes.json() as TreeHeatPoint[];
  const topFeatureCollection = topRes;
  const heatFeatureCollection = toHeatFeatureCollection(heatRows);

  if (showHeatLayer) {
    if (!map.getSource(TREE_HEAT_SOURCE_ID)) {
      map.addSource(TREE_HEAT_SOURCE_ID, {
        type: 'geojson',
        data: heatFeatureCollection,
      });
    }

    if (!map.getLayer(TREE_HEAT_LAYER_ID)) {
      map.addLayer({
        id: TREE_HEAT_LAYER_ID,
        type: 'heatmap',
        source: TREE_HEAT_SOURCE_ID,
        maxzoom: 18,
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['coalesce', ['get', 'score'], 0], 0, 0, 1, 1],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 0.7, 15, 1.5],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(255,255,178,0)',
            0.25,
            '#ffffb2',
            0.45,
            '#fd8d3c',
            0.75,
            '#f03b20',
            1,
            '#bd0026',
          ],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 8, 15, 24],
          'heatmap-opacity': 0.65,
        },
      });
    }
  }

  if (!map.getSource(TREE_TOP_SOURCE_ID)) {
    map.addSource(TREE_TOP_SOURCE_ID, {
      type: 'geojson',
      data: topFeatureCollection,
    });
  }

  if (!map.getLayer(TREE_TOP_LAYER_ID)) {
    map.addLayer({
      id: TREE_TOP_LAYER_ID,
      type: 'circle',
      source: TREE_TOP_SOURCE_ID,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3, 15, 7],
        'circle-color': '#16a34a',
        'circle-stroke-color': '#14532d',
        'circle-stroke-width': 1.2,
        'circle-opacity': 0.92,
      },
    });
  }

  if (showCoverageLayer) {
    if (!map.getSource(TREE_COVERAGE_SOURCE_ID)) {
      map.addSource(TREE_COVERAGE_SOURCE_ID, {
        type: 'geojson',
        data: toCoverageFeatureCollection(),
      });
    }

    if (!map.getLayer(TREE_COVERAGE_FILL_LAYER_ID)) {
      map.addLayer({
        id: TREE_COVERAGE_FILL_LAYER_ID,
        type: 'fill',
        source: TREE_COVERAGE_SOURCE_ID,
        paint: {
          'fill-color': '#3b82f6',
          'fill-opacity': 0.04,
        },
      });
    }

    if (!map.getLayer(TREE_COVERAGE_LINE_LAYER_ID)) {
      map.addLayer({
        id: TREE_COVERAGE_LINE_LAYER_ID,
        type: 'line',
        source: TREE_COVERAGE_SOURCE_ID,
        paint: {
          'line-color': '#2563eb',
          'line-width': 1.8,
          'line-dasharray': [2, 2],
          'line-opacity': 0.8,
        },
      });
    }
  }
}

async function loadTreePointsDataset(mode: TreePointsMode): Promise<GeoJSON.FeatureCollection> {
  const cached = treePointsCache.get(mode);
  if (cached) return cached;

  const res = await fetch(TREE_POINTS_DATASET_PATH[mode]);
  if (!res.ok) {
    throw new Error(`Failed to load dataset for mode: ${mode}`);
  }
  const fc = await res.json() as GeoJSON.FeatureCollection;
  treePointsCache.set(mode, fc);
  return fc;
}

export async function setTreePointsMode(map: maplibregl.Map, mode: TreePointsMode): Promise<void> {
  const source = map.getSource(TREE_TOP_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
  if (!source) return;
  const fc = await loadTreePointsDataset(mode);
  source.setData(fc);
}

export function wireTreeOptimizerPopups(map: maplibregl.Map): () => void {
  const clickHandler = (event: maplibregl.MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    if (!feature || feature.geometry.type !== 'Point') return;
    const coords = feature.geometry.coordinates as [number, number];
    const props = feature.properties ?? {};
    const rank = Number(props.rank ?? 0);
    const score = Number(props.score ?? 0);
    const shadeDelta = Number(props.shade_delta_m2 ?? 0);
    const proximity = Number(props.pedestrian_proximity ?? 0);
    const h3Index = String(props.h3_index ?? 'n/a');
    const lat = coords[1];
    const lng = coords[0];
    const streetViewEvent = new CustomEvent('tree-streetview', {
      detail: { lat, lng },
    });
    window.dispatchEvent(streetViewEvent);

    const popupHtml = `
      <div style="font-size:12px; line-height:1.4;">
        <b>Optimal Tree Spot #${rank}</b><br/>
        Score: ${score.toFixed(3)}<br/>
        Shade Delta: ${shadeDelta.toFixed(1)} m²<br/>
        Pedestrian Proximity: ${proximity.toFixed(2)}<br/>
        H3: <span style="display:inline-block; padding:2px 6px; border:1px solid #d1d5db; border-radius:4px; background:#f8fafc; font-family:ui-monospace, SFMono-Regular, Menlo, monospace;">${h3Index}</span><br/>
        <div style="margin-top:8px; color:#15803d; font-weight:600;">
          Street View открыт в панели (метка: "Сажать здесь")
        </div>
      </div>
    `;

    new maplibregl.Popup({ closeButton: true, closeOnClick: true })
      .setLngLat(coords)
      .setHTML(popupHtml)
      .addTo(map);
  };

  const enterHandler = () => {
    map.getCanvas().style.cursor = 'pointer';
  };
  const leaveHandler = () => {
    map.getCanvas().style.cursor = '';
  };

  map.on('click', TREE_TOP_LAYER_ID, clickHandler);
  map.on('mouseenter', TREE_TOP_LAYER_ID, enterHandler);
  map.on('mouseleave', TREE_TOP_LAYER_ID, leaveHandler);

  return () => {
    map.off('click', TREE_TOP_LAYER_ID, clickHandler);
    map.off('mouseenter', TREE_TOP_LAYER_ID, enterHandler);
    map.off('mouseleave', TREE_TOP_LAYER_ID, leaveHandler);
  };
}
