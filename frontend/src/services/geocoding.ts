export interface GeocodingResult {
  id: string;
  displayName: string;
  lat: number;
  lng: number;
  boundingBox: [number, number, number, number]; // south, north, west, east
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  boundingbox: [string, string, string, string];
}

export async function searchLocation(query: string): Promise<GeocodingResult[]> {
  if (!query.trim()) return [];

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '5',
    addressdetails: '1',
  });

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    { headers: { 'Accept-Language': 'en', 'User-Agent': 'ShadowMapApp/1.0' } },
  );

  if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);

  const data: NominatimResult[] = await res.json();

  return data.map((item) => ({
    id: String(item.place_id),
    displayName: item.display_name,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    boundingBox: [
      parseFloat(item.boundingbox[0]),
      parseFloat(item.boundingbox[1]),
      parseFloat(item.boundingbox[2]),
      parseFloat(item.boundingbox[3]),
    ],
  }));
}
