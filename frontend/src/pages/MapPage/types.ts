export interface ContextMenuState {
  x: number;
  y: number;
  lat: number;
  lng: number;
  annualSunHours: number | null;
  dailySunHours: number | null;
  loadingInfo: boolean;
  error: string | null;
}
