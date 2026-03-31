export type TreeDrawMode = 'rectangle' | 'circle' | 'polygon' | 'freehand';

export type RankAreaGeometry =
    | { type: 'Polygon'; coordinates: number[][][] }
    | { type: 'MultiPolygon'; coordinates: number[][][][] };

export interface TreeRankFactors {
    summer_cooling: number;
    winter_light: number;
    access_balance: number;
    conflict_risk: number;
    confidence: number;
    nearby_buildings: number;
    nearest_building_m: number;
}

export interface TreeRankCandidate {
    id: string;
    rank: number;
    lat: number;
    lng: number;
    score: number;
    factors: TreeRankFactors;
}

export interface TreeRankResponse {
    candidates: TreeRankCandidate[];
    meta: {
        model_version: string;
        selection_mode: 'geometry' | 'bbox';
        area_km2: number;
        step_m: number;
        generated_points: number;
        scored_points: number;
    };
}

export interface TreeExplainResponse {
    summary: string;
    reasons: string[];
    caution: string;
    source: 'alemllm' | 'fallback';
}
