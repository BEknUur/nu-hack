import osmtogeojson from 'osmtogeojson';

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
] as const;

interface BBox {
  s: number;
  w: number;
  n: number;
  e: number;
}

function buildQuery({ s, w, n, e }: BBox): string {
  return (
    `[out:json][timeout:25];` +
    `(way["building"](${s},${w},${n},${e});` +
    `relation["building"](${s},${w},${n},${e}););` +
    `out body;>;out skel qt;`
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
function getBuildingHeight(props: Record<string, unknown>): number {
  if (props.height) return Number(props.height);
  if (props['building:height']) return Number(props['building:height']);
  if (props['building:levels']) return Number(props['building:levels']) * 3;
  return 3;
}

export async function fetchBuildings(bbox: BBox): Promise<GeoJSON.Feature[]> {
  const query = buildQuery(bbox);
  let lastError: unknown;
  let geojson: GeoJSON.FeatureCollection | null = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const url = `${endpoint}?data=${encodeURIComponent(query)}`;
        const res = await fetchWithTimeout(url, 12000);
        if (!res.ok) throw new Error(`${endpoint} responded with ${res.status}`);

        const json: unknown = await res.json();
        geojson = osmtogeojson(json);
        break;
      } catch (err) {
        lastError = err;
        if (attempt < 3) await sleep(400 * attempt);
      }
    }

    if (geojson) break;
  }

  if (!geojson) throw lastError instanceof Error ? lastError : new Error('Overpass request failed');

  const polygonFeatures = geojson.features.filter((feature) => (
    feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon'
  ));

  polygonFeatures.forEach((feature) => {
    if (!feature.properties) feature.properties = {};
    const h = getBuildingHeight(feature.properties as Record<string, unknown>);
    feature.properties.height = h;
    feature.properties.render_height = h;
  });

  return polygonFeatures;
}
