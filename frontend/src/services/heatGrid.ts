import { getBackendUrl } from '@/services/backendUrl';

export interface HeatCell {
    lon: number;
    lat: number;
    lst: number;
    ndvi: number;
    priority: number;
}

export interface HeatGridResponse {
    count: number;
    cells: HeatCell[];
    hint?: string | null;
}

export interface ScenarioImpactRequest {
    bbox: { lon_min: number; lat_min: number; lon_max: number; lat_max: number };
    n_trees?: number;
    target_canopy_pct?: number;
    heatwave?: boolean;
}

export interface ScenarioImpactResponse {
    zone_area_ha: number;
    trees_needed: number;
    canopy_increase_pct: number;
    mean_surface_temp_now_c: number;
    estimated_air_cooling_c: number;
    co2_uptake_t_per_year: number;
    note: string;
    error?: string | null;
}

export async function fetchHeatGrid(
    lonMin: number,
    latMin: number,
    lonMax: number,
    latMax: number,
): Promise<HeatGridResponse> {
    const url = new URL(`${getBackendUrl()}/ml/heat/grid`);
    url.searchParams.set('lon_min', String(lonMin));
    url.searchParams.set('lat_min', String(latMin));
    url.searchParams.set('lon_max', String(lonMax));
    url.searchParams.set('lat_max', String(latMax));

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Heat grid fetch failed: ${res.status}`);
    return res.json() as Promise<HeatGridResponse>;
}

export async function fetchScenarioImpact(
    input: ScenarioImpactRequest,
): Promise<ScenarioImpactResponse> {
    const res = await fetch(`${getBackendUrl()}/ml/scenario/impact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(`Scenario impact failed: ${res.status}`);
    return res.json() as Promise<ScenarioImpactResponse>;
}
