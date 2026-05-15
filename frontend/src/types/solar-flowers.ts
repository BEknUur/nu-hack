export type SolarDrawMode = 'rectangle' | 'circle' | 'polygon' | 'freehand';
export type SolarWizardStep = 'shape' | 'drawing' | 'settings' | 'results';
export type SolarPanelType = 'solar_flower' | 'ground_mounted' | 'rooftop';
export type SolarOptimizationTarget = 'max_annual' | 'max_winter' | 'balanced';

export interface SolarFactors {
  annual_irradiance: number;
  winter_irradiance: number;
  shading_risk: number;
  slope_suitability: number;
  access_score: number;
}

export interface SolarCandidate {
  id: string;
  rank: number;
  lat: number;
  lng: number;
  score: number;
  kwhPerYearEst: number;
  factors: SolarFactors;
}
