export interface ScreenPoint {
  x: number;
  y: number;
}

export interface SunExposureOptions {
  startDate: Date;
  endDate: Date;
  iterations: number;
}

export interface ShadowEngineController {
  setDate: (date: Date) => void;
  setSunExposure: (enabled: boolean, options: SunExposureOptions) => Promise<void>;
  isPositionInSun: (point: ScreenPoint) => Promise<boolean>;
  getHoursOfSun: (point: ScreenPoint) => Promise<number>;
}
