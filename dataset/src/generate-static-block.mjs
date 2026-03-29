import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import osmtogeojson from "osmtogeojson";
import SunCalc from "suncalc";

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIRS = [
  path.resolve(THIS_DIR, "../output"),
  path.resolve(THIS_DIR, "../../frontend/public/dataset"),
];
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

// Full Astana coverage (approx city bounds).
const DATASET_BBOX = {
  s: 50.98,
  w: 71.2,
  n: 51.26,
  e: 71.65,
};
const TILE_SIZE_KM = 4;

const SETTINGS = {
  date: "2026-03-29",
  timezoneOffsetHours: 5, // Astana UTC+5
  stepMinutes: 5,
  startHour: 0,
  endHour: 24,
};

const CARDINALS = [
  { key: "N", bearing: 0 },
  { key: "E", bearing: 90 },
  { key: "S", bearing: 180 },
  { key: "W", bearing: 270 },
];

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function toDeg(rad) {
  return (rad * 180) / Math.PI;
}

function norm360(deg) {
  return ((deg % 360) + 360) % 360;
}

function angleDiff(a, b) {
  const d = Math.abs(norm360(a) - norm360(b));
  return d > 180 ? 360 - d : d;
}

// SunCalc azimuth is relative to south; convert to compass bearing.
function sunBearingFromAzimuth(azimuthRad) {
  return norm360(toDeg(azimuthRad) + 180);
}

function cardinalFromBearing(bearing) {
  let best = CARDINALS[0];
  let bestDiff = Infinity;
  for (const c of CARDINALS) {
    const d = angleDiff(bearing, c.bearing);
    if (d < bestDiff) {
      best = c;
      bestDiff = d;
    }
  }
  return best.key;
}

function getBuildingHeight(props = {}) {
  if (props.height != null && Number.isFinite(Number(props.height))) return Number(props.height);
  if (props["building:height"] != null && Number.isFinite(Number(props["building:height"]))) {
    return Number(props["building:height"]);
  }
  if (props["building:levels"] != null && Number.isFinite(Number(props["building:levels"]))) {
    return Number(props["building:levels"]) * 3;
  }
  return 3;
}

function overpassUrl(endpoint, { s, w, n, e }) {
  const query =
    `[out:json][timeout:25];` +
    `(way["building"](${s},${w},${n},${e});relation["building"](${s},${w},${n},${e}););` +
    `out body;>;out skel qt;`;
  return `${endpoint}?data=${encodeURIComponent(query)}`;
}

function kmToLatDelta(km) {
  return km / 111.32;
}

function kmToLngDelta(km, atLat) {
  const scale = Math.cos(toRad(atLat));
  return km / (111.32 * Math.max(0.01, scale));
}

function bboxFromCenterRadius(center, radiusKm) {
  const dLat = kmToLatDelta(radiusKm);
  const dLng = kmToLngDelta(radiusKm, center.lat);
  return {
    s: center.lat - dLat,
    w: center.lng - dLng,
    n: center.lat + dLat,
    e: center.lng + dLng,
  };
}

function tileBboxes(bbox, tileKm, centerLat) {
  const dLat = kmToLatDelta(tileKm);
  const dLng = kmToLngDelta(tileKm, centerLat);
  const boxes = [];

  for (let s = bbox.s; s < bbox.n; s += dLat) {
    const n = Math.min(s + dLat, bbox.n);
    for (let w = bbox.w; w < bbox.e; w += dLng) {
      const e = Math.min(w + dLng, bbox.e);
      boxes.push({ s, w, n, e });
    }
  }

  return boxes;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function ensurePolygonRings(geometry) {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return [geometry.coordinates[0]];
  if (geometry.type === "MultiPolygon") return geometry.coordinates.map((polygon) => polygon[0]);
  return [];
}

function centroidOfRing(ring) {
  let sx = 0;
  let sy = 0;
  for (const [lng, lat] of ring) {
    sx += lng;
    sy += lat;
  }
  return [sx / ring.length, sy / ring.length];
}

function haversineKm(a, b) {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function edgeLengthApproxMeters(a, b) {
  const latMeters = 111_320;
  const lngMeters = 111_320 * Math.cos(toRad((a[1] + b[1]) / 2));
  const dx = (b[0] - a[0]) * lngMeters;
  const dy = (b[1] - a[1]) * latMeters;
  return Math.hypot(dx, dy);
}

function bearingFromAtoB(a, b) {
  const latMeters = 111_320;
  const lngMeters = 111_320 * Math.cos(toRad((a[1] + b[1]) / 2));
  const dx = (b[0] - a[0]) * lngMeters;
  const dy = (b[1] - a[1]) * latMeters;
  return norm360(toDeg(Math.atan2(dx, dy)));
}

function midpoint(a, b) {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function localToUtc(dateStr, hour, minute, tzOffsetHours) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hour - tzOffsetHours, minute, 0, 0));
}

function buildTimeGrid() {
  const times = [];
  for (let h = SETTINGS.startHour; h < SETTINGS.endHour; h += 1) {
    for (let m = 0; m < 60; m += SETTINGS.stepMinutes) {
      times.push({ h, m });
    }
  }
  return times;
}

async function fetchBuildings() {
  let lastError = null;
  const cityCenterLat = (DATASET_BBOX.s + DATASET_BBOX.n) / 2;
  const tiles = tileBboxes(DATASET_BBOX, TILE_SIZE_KM, cityCenterLat);
  const byId = new Map();

  for (const tile of tiles) {
    const tileNumber = tiles.indexOf(tile) + 1;
    let tileLoaded = false;
    for (const endpoint of OVERPASS_ENDPOINTS) {
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          const url = overpassUrl(endpoint, tile);
          const res = await fetchWithTimeout(url, 15000);
          if (!res.ok) throw new Error(`${endpoint} responded with ${res.status}`);

          const osm = await res.json();
          const geo = osmtogeojson(osm);
          const polygons = geo.features.filter((feature) => {
            if (!feature.geometry) return false;
            return feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon";
          });

          for (const feature of polygons) {
            const id =
              feature.id ||
              feature.properties?.["@id"] ||
              JSON.stringify(feature.geometry);
            if (!byId.has(id)) byId.set(id, feature);
          }

          tileLoaded = true;
          console.log(`Loaded tile ${tileNumber}/${tiles.length} from ${endpoint}`);
          break;
        } catch (error) {
          lastError = error;
          if (attempt < 2) await sleep(500 * attempt);
        }
      }
      if (tileLoaded) break;
    }

    // Gentle pacing for public Overpass mirrors.
    await sleep(100);
  }

  if (!byId.size) {
    throw lastError || new Error("Failed to fetch buildings from all Overpass endpoints");
  }
  return Array.from(byId.values());
}

function analyzeBuilding(feature) {
  const rings = ensurePolygonRings(feature.geometry);
  if (!rings.length) return null;

  const ring = rings.reduce((best, current) => (current.length > best.length ? current : best), rings[0]);
  if (ring.length < 4) return null;

  const center = centroidOfRing(ring);
  const edges = [];

  for (let i = 0; i < ring.length - 1; i += 1) {
    const a = ring[i];
    const b = ring[i + 1];
    const len = edgeLengthApproxMeters(a, b);
    if (len < 1) continue;

    const mid = midpoint(a, b);
    const outwardBearing = bearingFromAtoB(center, mid);
    edges.push({
      len,
      outwardBearing,
      sideBucket: cardinalFromBearing(outwardBearing),
    });
  }

  if (!edges.length) return null;

  return {
    id: feature.id || feature.properties?.["@id"] || `building-${Math.random().toString(36).slice(2, 9)}`,
    center: { lng: center[0], lat: center[1] },
    height: getBuildingHeight(feature.properties || {}),
    edges,
  };
}

function computeScores(building, times) {
  const sideScores = { N: 0, E: 0, S: 0, W: 0 };
  const sideLengths = { N: 0, E: 0, S: 0, W: 0 };

  for (const edge of building.edges) {
    sideLengths[edge.sideBucket] += edge.len;
  }

  for (const { h, m } of times) {
    const dt = localToUtc(SETTINGS.date, h, m, SETTINGS.timezoneOffsetHours);
    const sun = SunCalc.getPosition(dt, building.center.lat, building.center.lng);
    if (sun.altitude <= 0) continue;

    const sunBearing = sunBearingFromAzimuth(sun.azimuth);
    const altitudeFactor = Math.sin(sun.altitude);

    for (const edge of building.edges) {
      const incidence = Math.max(0, Math.cos(toRad(angleDiff(edge.outwardBearing, sunBearing))));
      sideScores[edge.sideBucket] += incidence * altitudeFactor * edge.len * SETTINGS.stepMinutes;
    }
  }

  const normalized = {};
  for (const side of ["N", "E", "S", "W"]) {
    normalized[side] = sideLengths[side] > 0 ? sideScores[side] / sideLengths[side] : 0;
  }

  const ranked = Object.entries(normalized).sort((a, b) => b[1] - a[1]);
  const bestSide = ranked[0][0];
  const maxScore = ranked[0][1] || 1;
  const sidePct = {};

  for (const [side, value] of Object.entries(normalized)) {
    sidePct[side] = Number(((value / maxScore) * 100).toFixed(1));
  }

  return {
    bestSide,
    sidePct,
    rawScores: normalized,
  };
}

function colorForSide(side) {
  if (side === "N") return "#4f86f7";
  if (side === "E") return "#f39c12";
  if (side === "S") return "#e74c3c";
  return "#8e44ad";
}

function computeBlockStats(summaryBuildings) {
  const sides = ["N", "E", "S", "W"];
  const bestSideCounts = { N: 0, E: 0, S: 0, W: 0 };
  const avgSidePct = { N: 0, E: 0, S: 0, W: 0 };

  for (const b of summaryBuildings) {
    if (sides.includes(b.bestSide)) {
      bestSideCounts[b.bestSide] += 1;
    }
    for (const side of sides) {
      avgSidePct[side] += Number(b.sidePct?.[side] ?? 0);
    }
  }

  const total = summaryBuildings.length || 1;
  for (const side of sides) {
    avgSidePct[side] = Number((avgSidePct[side] / total).toFixed(1));
  }

  const dominantSide = Object.entries(avgSidePct).sort((a, b) => b[1] - a[1])[0][0];
  return { dominantSide, bestSideCounts, avgSidePct };
}

async function main() {
  const times = buildTimeGrid();
  const features = await fetchBuildings();

  const summaryBuildings = [];
  const outputGeoJson = {
    type: "FeatureCollection",
    features: [],
  };

  for (const feature of features) {
    const analyzed = analyzeBuilding(feature);
    if (!analyzed) continue;

    const scores = computeScores(analyzed, times);
    summaryBuildings.push({
      id: analyzed.id,
      center: analyzed.center,
      height: analyzed.height,
      bestSide: scores.bestSide,
      sidePct: scores.sidePct,
    });

    outputGeoJson.features.push({
      type: "Feature",
      geometry: feature.geometry,
      properties: {
        id: analyzed.id,
        bestSide: scores.bestSide,
        sidePct: scores.sidePct,
        color: colorForSide(scores.bestSide),
      },
    });
  }

  const summary = {
    meta: {
      bbox: DATASET_BBOX,
      tileSizeKm: TILE_SIZE_KM,
      date: SETTINGS.date,
      timezoneOffsetHours: SETTINGS.timezoneOffsetHours,
      stepMinutes: SETTINGS.stepMinutes,
      totalSteps: times.length,
    },
    buildingsCount: summaryBuildings.length,
    blockStats: computeBlockStats(summaryBuildings),
    buildings: summaryBuildings,
  };

  for (const outDir of OUTPUT_DIRS) {
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(path.join(outDir, "block-summary.json"), JSON.stringify(summary, null, 2), "utf8");
    await fs.writeFile(path.join(outDir, "block-buildings.geojson"), JSON.stringify(outputGeoJson, null, 2), "utf8");
  }

  console.log(`Done. Buildings: ${summaryBuildings.length}, time steps: ${times.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
