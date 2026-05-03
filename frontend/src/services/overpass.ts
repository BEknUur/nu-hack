import osmtogeojson from 'osmtogeojson';

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';

interface BBox {
  s: number;
  w: number;
  n: number;
  e: number;
}

function getBuildingHeight(props: Record<string, unknown>): number {
  if (props.height) return Number(props.height);
  if (props['building:height']) return Number(props['building:height']);
  if (props['building:levels']) return Number(props['building:levels']) * 3;
  return 3;
}

export async function fetchBuildings(bbox: BBox): Promise<GeoJSON.Feature[]> {
  const query = (
    `[out:json][timeout:25];` +
    `(way["building"](${bbox.s},${bbox.w},${bbox.n},${bbox.e});` +
    `relation["building"](${bbox.s},${bbox.w},${bbox.n},${bbox.e}););` +
    `out body;>;out skel qt;`
  );
  const url = `${OVERPASS_ENDPOINT}?data=${encodeURIComponent(query)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Overpass API responded with ${res.status}`);

  const json: unknown = await res.json();
  const geojson = osmtogeojson(json);

  geojson.features.forEach((feature) => {
    if (!feature.properties) feature.properties = {};
    const h = getBuildingHeight(feature.properties as Record<string, unknown>);
    feature.properties.height = h;
    feature.properties.render_height = h;
  });

  return geojson.features;
}
