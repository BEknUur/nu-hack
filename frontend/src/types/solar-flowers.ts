export type SolarProfile = 'flower_full_sun' | 'flower_partial_shade' | 'solar_panel';

export interface SolarRankFactors {
  sun_hours: number;
  light_fit: number;
  openness: number;
  access_balance: number;
  conflict_risk: number;
  confidence: number;
  nearby_buildings: number;
  nearest_building_m: number;
}

export interface SolarRankCandidate {
  id: string;
  rank: number;
  lat: number;
  lng: number;
  score: number;
  factors: SolarRankFactors;
}

export interface SolarRankResponse {
  candidates: SolarRankCandidate[];
  meta: {
    model_version: string;
    selection_mode: 'geometry' | 'bbox';
    area_km2: number;
    step_m: number;
    generated_points: number;
    scored_points: number;
    profile: SolarProfile;
    date: string;
  };
}

export interface SolarExplainResponse {
  summary: string;
  reasons: string[];
  caution: string;
  source: 'alemllm' | 'fallback';
}

export interface MissionPick {
  id: string;
  lat: number;
  lng: number;
  score: number;
}
