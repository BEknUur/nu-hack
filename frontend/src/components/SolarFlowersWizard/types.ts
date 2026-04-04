import type { LucideIcon } from 'lucide-react';
import type {
  SolarDrawMode,
  SolarOptimizationTarget,
  SolarPanelType,
} from '@/types/solar-flowers';

export interface SolarDrawShapeOption {
  mode: SolarDrawMode;
  label: string;
  Icon: LucideIcon;
}

export interface SolarPanelTypeOption {
  value: SolarPanelType;
  label: string;
  Icon: LucideIcon;
}

export interface SolarTargetOption {
  value: SolarOptimizationTarget;
  label: string;
  Icon: LucideIcon;
}
