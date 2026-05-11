import type { MapBounds } from '@/types/map-engine';
import type { RankAreaGeometry } from '@/types/tree-optimizer';

type Coord = [number, number]; // [lng, lat]

function toRadians(deg: number): number {
    return (deg * Math.PI) / 180;
}

function metersBetween(a: Coord, b: Coord): number {
    const latMeters = 111_320;
    const lngMeters = 111_320 * Math.cos(toRadians((a[1] + b[1]) / 2));
    const dx = (b[0] - a[0]) * lngMeters;
    const dy = (b[1] - a[1]) * latMeters;
    return Math.hypot(dx, dy);
}

function closeRing(ring: Coord[]): Coord[] {
    if (ring.length < 3) return ring;
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] === last[0] && first[1] === last[1]) return ring;
    return [...ring, first];
}

export function rectangleToPolygon(start: Coord, end: Coord): RankAreaGeometry {
    const minLng = Math.min(start[0], end[0]);
    const maxLng = Math.max(start[0], end[0]);
    const minLat = Math.min(start[1], end[1]);
    const maxLat = Math.max(start[1], end[1]);

    const ring: Coord[] = [
        [minLng, minLat],
        [maxLng, minLat],
        [maxLng, maxLat],
        [minLng, maxLat],
        [minLng, minLat],
    ];

    return {
        type: 'Polygon',
        coordinates: [ring],
    };
}

export function circleToPolygon(center: Coord, radiusMeters: number, segments = 48): RankAreaGeometry {
    const [centerLng, centerLat] = center;
    const latScale = 111_320;
    const lngScale = 111_320 * Math.max(0.01, Math.cos(toRadians(centerLat)));

    const ring: Coord[] = [];
    for (let i = 0; i < segments; i += 1) {
        const angle = (2 * Math.PI * i) / segments;
        const dx = Math.cos(angle) * radiusMeters;
        const dy = Math.sin(angle) * radiusMeters;
        ring.push([
            centerLng + dx / lngScale,
            centerLat + dy / latScale,
        ]);
    }

    return {
        type: 'Polygon',
        coordinates: [closeRing(ring)],
    };
}

export function polygonFromVertices(vertices: Coord[]): RankAreaGeometry | null {
    if (vertices.length < 3) return null;
    const ring = closeRing(vertices);
    if (ring.length < 4) return null;
    return {
        type: 'Polygon',
        coordinates: [ring],
    };
}

export function freehandToPolygon(points: Coord[]): RankAreaGeometry | null {
    if (points.length < 3) return null;

    const simplified: Coord[] = [];
    const minDistance = 8; // meters

    for (const point of points) {
        const last = simplified[simplified.length - 1];
        if (!last || metersBetween(last, point) >= minDistance) {
            simplified.push(point);
        }
    }

    return polygonFromVertices(simplified);
}

function ringAreaM2(ring: Coord[]): number {
    if (ring.length < 4) return 0;
    const centerLat = ring.reduce((sum, [, lat]) => sum + lat, 0) / ring.length;
    const metersPerDegreeLat = 111_320;
    const metersPerDegreeLng = 111_320 * Math.cos(toRadians(centerLat));

    let area = 0;
    for (let i = 0; i < ring.length - 1; i += 1) {
        const [lng1, lat1] = ring[i];
        const [lng2, lat2] = ring[i + 1];
        const x1 = lng1 * metersPerDegreeLng;
        const y1 = lat1 * metersPerDegreeLat;
        const x2 = lng2 * metersPerDegreeLng;
        const y2 = lat2 * metersPerDegreeLat;
        area += x1 * y2 - x2 * y1;
    }

    return Math.abs(area) / 2;
}

function polygonAreaM2(rings: number[][][]): number {
    if (rings.length === 0) return 0;
    const outer = ringAreaM2(rings[0] as Coord[]);
    const holes = rings.slice(1).reduce((sum, hole) => sum + ringAreaM2(hole as Coord[]), 0);
    return Math.max(0, outer - holes);
}

export function estimateGeometryAreaKm2(geometry: RankAreaGeometry): number {
    if (geometry.type === 'Polygon') {
        return polygonAreaM2(geometry.coordinates) / 1_000_000;
    }

    const total = geometry.coordinates
        .reduce((sum, polygon) => sum + polygonAreaM2(polygon), 0);
    return total / 1_000_000;
}

export function geometryToBounds(geometry: RankAreaGeometry): MapBounds {
    const points: Coord[] = [];

    if (geometry.type === 'Polygon') {
        for (const ring of geometry.coordinates) {
            for (const coord of ring as Coord[]) points.push(coord);
        }
    } else {
        for (const polygon of geometry.coordinates) {
            for (const ring of polygon) {
                for (const coord of ring as Coord[]) points.push(coord);
            }
        }
    }

    const lngs = points.map(([lng]) => lng);
    const lats = points.map(([, lat]) => lat);

    return {
        south: Math.min(...lats),
        west: Math.min(...lngs),
        north: Math.max(...lats),
        east: Math.max(...lngs),
    };
}
