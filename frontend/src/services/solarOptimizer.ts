import type { RankAreaGeometry } from '@/types/tree-optimizer';
import type { SolarCandidate, SolarOptimizationTarget, SolarPanelType } from '@/types/solar-flowers';
import { getBackendUrl } from '@/services/backendUrl';

interface BackendSolarCandidate {
    id: string;
    rank: number;
    lat: number;
    lng: number;
    score: number;
    kwh_per_year_est: number;
    factors: {
        annual_irradiance: number;
        winter_irradiance: number;
        shading_risk: number;
        slope_suitability: number;
        access_score: number;
    };
}

interface BackendSolarResponse {
    candidates: BackendSolarCandidate[];
    meta: {
        model_version: string;
        selection_mode: string;
        area_km2: number;
        step_m: number;
        generated_points: number;
        scored_points: number;
    };
}

export interface RankSolarCandidatesInput {
    areaGeometry: RankAreaGeometry;
    topK: number;
    optimizationTarget: SolarOptimizationTarget;
    panelType: SolarPanelType;
    minSpacingM?: number;
}

export async function rankSolarCandidates(input: RankSolarCandidatesInput): Promise<SolarCandidate[]> {
    const res = await fetch(`${getBackendUrl()}/ml/solar-optimizer/rank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            area_geometry: input.areaGeometry,
            top_k: input.topK,
            optimization_target: input.optimizationTarget,
            panel_type: input.panelType,
            min_spacing_m: input.minSpacingM ?? 10,
        }),
    });

    if (!res.ok) {
        throw new Error(`Solar ranking failed: ${res.status}`);
    }

    const data = (await res.json()) as BackendSolarResponse;

    return data.candidates.map((c): SolarCandidate => ({
        id: c.id,
        rank: c.rank,
        lat: c.lat,
        lng: c.lng,
        score: c.score,
        kwhPerYearEst: c.kwh_per_year_est,
        factors: {
            annual_irradiance: c.factors.annual_irradiance,
            winter_irradiance: c.factors.winter_irradiance,
            shading_risk: c.factors.shading_risk,
            slope_suitability: c.factors.slope_suitability,
            access_score: c.factors.access_score,
        },
    }));
}
