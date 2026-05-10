export interface ClickInfo {
  lat: number;
  lng: number;
  screenX?: number | null;
  screenY?: number | null;
  inSun: boolean | null;
  buildingId?: string | null;
  buildingLabel?: string | null;
  complexName?: string | null;
  address?: string | null;
  buildingInfoLoading?: boolean;
  photoUrl?: string | null;
  photoPlaceName?: string | null;
  predictedBestSide?: 'N' | 'E' | 'S' | 'W' | null;
  predictedConfidence?: number | null;
  predictionLoading?: boolean;
}
