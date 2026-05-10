import { getPreferredApiLanguage } from '@/i18n';

interface BuildingMetadata {
  complexName: string | null;
  address: string | null;
  photoUrl: string | null;
  photoPlaceName: string | null;
}

interface OverpassElement {
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassElement[];
}

interface ReverseAddress {
  road?: string;
  pedestrian?: string;
  footway?: string;
  house_number?: string;
  suburb?: string;
  city_district?: string;
  city?: string;
  town?: string;
  village?: string;
}

interface ReverseResponse {
  address?: ReverseAddress;
  display_name?: string;
}

interface PlaceDisplayName {
  text?: string;
}

interface PlacePhoto {
  name?: string;
}

interface NearbyPlace {
  displayName?: PlaceDisplayName;
  photos?: PlacePhoto[];
}

interface NearbySearchResponse {
  places?: NearbyPlace[];
}

interface PhotoMediaResponse {
  photoUri?: string;
}

const metadataCache = new Map<string, Omit<BuildingMetadata, 'photoUrl' | 'photoPlaceName'>>();
const GOOGLE_PLACES_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

function parseWayNumericId(buildingId: string): string | null {
  const match = /^way\/(\d+)$/.exec(buildingId.trim());
  return match ? match[1] : null;
}

function uniqueNonEmpty(parts: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of parts) {
    const v = raw?.trim();
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    result.push(v);
  }
  return result;
}

function formatAddressFromTags(tags: Record<string, string>): string | null {
  const street = tags['addr:street'] ?? tags['addr:place'];
  const houseNumber = tags['addr:housenumber'];
  const district = tags['addr:suburb'] ?? tags['addr:district'];
  const city = tags['addr:city'] ?? tags['addr:town'] ?? tags['addr:village'];
  const parts = uniqueNonEmpty([
    street && houseNumber ? `${street} ${houseNumber}` : street ?? houseNumber,
    district,
    city,
  ]);
  return parts.length > 0 ? parts.join(', ') : null;
}

function formatAddressFromReverse(data: ReverseResponse): string | null {
  const a = data.address;
  if (!a) return data.display_name ?? null;
  const street = a.road ?? a.pedestrian ?? a.footway;
  const house = a.house_number;
  const district = a.suburb ?? a.city_district;
  const city = a.city ?? a.town ?? a.village;
  const parts = uniqueNonEmpty([
    street && house ? `${street} ${house}` : street ?? house,
    district,
    city,
  ]);
  return parts.length > 0 ? parts.join(', ') : (data.display_name ?? null);
}

async function fetchOverpassTags(wayNumericId: string): Promise<Record<string, string> | null> {
  const query = `[out:json][timeout:15];way(${wayNumericId});out tags;`;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Overpass error: ${res.status}`);
  const data = await res.json() as OverpassResponse;
  const tags = data.elements?.[0]?.tags;
  return tags ?? null;
}

async function fetchReverseAddress(lat: number, lng: number): Promise<string | null> {
  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: String(lat),
    lon: String(lng),
    addressdetails: '1',
    zoom: '18',
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
    headers: {
      'Accept-Language': getPreferredApiLanguage(),
      'User-Agent': 'ShadowMapApp/1.0',
    },
  });
  if (!res.ok) throw new Error(`Nominatim reverse error: ${res.status}`);
  const data = await res.json() as ReverseResponse;
  return formatAddressFromReverse(data);
}

async function fetchNearbyPlacePhoto(lat: number, lng: number): Promise<{
  photoUrl: string | null;
  photoPlaceName: string | null;
}> {
  if (!GOOGLE_PLACES_API_KEY) {
    return { photoUrl: null, photoPlaceName: null };
  }

  const nearbyRes = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask': 'places.displayName,places.photos',
    },
    body: JSON.stringify({
      maxResultCount: 5,
      locationRestriction: {
        circle: {
          center: {
            latitude: lat,
            longitude: lng,
          },
          radius: 100,
        },
      },
    }),
  });

  if (!nearbyRes.ok) {
    throw new Error(`Places nearby search failed: ${nearbyRes.status}`);
  }

  const nearby = await nearbyRes.json() as NearbySearchResponse;
  const withPhoto = (nearby.places ?? []).find((place) => (place.photos ?? []).length > 0);
  const photoName = withPhoto?.photos?.[0]?.name;
  if (!photoName) {
    return { photoUrl: null, photoPlaceName: null };
  }

  const photoRes = await fetch(
    `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=640&skipHttpRedirect=true&key=${encodeURIComponent(GOOGLE_PLACES_API_KEY)}`,
  );
  if (!photoRes.ok) {
    throw new Error(`Places photo fetch failed: ${photoRes.status}`);
  }
  const photo = await photoRes.json() as PhotoMediaResponse;
  return {
    photoUrl: photo.photoUri ?? null,
    photoPlaceName: withPhoto?.displayName?.text ?? null,
  };
}

export async function getBuildingMetadata(buildingId: string, lat: number, lng: number): Promise<BuildingMetadata> {
  const cachedCore = metadataCache.get(buildingId);

  let complexName: string | null = cachedCore?.complexName ?? null;
  let address: string | null = cachedCore?.address ?? null;
  let photoUrl: string | null = null;
  let photoPlaceName: string | null = null;

  if (!cachedCore) {
    const wayNumericId = parseWayNumericId(buildingId);
    if (wayNumericId) {
      try {
        const tags = await fetchOverpassTags(wayNumericId);
        if (tags) {
          complexName = tags.name ?? tags['official_name'] ?? tags['short_name'] ?? tags['addr:housename'] ?? null;
          address = formatAddressFromTags(tags);
        }
      } catch {
        // Keep UI resilient and fallback to reverse geocoding.
      }
    }

    if (!address) {
      try {
        address = await fetchReverseAddress(lat, lng);
      } catch {
        // Network-only enrichment; keep silent on failure.
      }
    }

    metadataCache.set(buildingId, { complexName, address });
  }

  try {
    const photo = await fetchNearbyPlacePhoto(lat, lng);
    photoUrl = photo.photoUrl;
    photoPlaceName = photo.photoPlaceName;
  } catch {
    // Photo is optional enrichment.
  }

  const result: BuildingMetadata = { complexName, address, photoUrl, photoPlaceName };
  return result;
}
