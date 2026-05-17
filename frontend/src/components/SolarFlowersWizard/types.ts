import type {
  SolarDrawMode,
  SolarOptimizationTarget,
  SolarPanelType,
} from '@/types/solar-flowers';

export interface SolarDrawShapeOption {
  mode: SolarDrawMode;
  label: string;
}

export interface SolarPanelTypeOption {
  value: SolarPanelType;
  label: string;
}

export interface SolarTargetOption {
  value: SolarOptimizationTarget;
  label: string;
}
