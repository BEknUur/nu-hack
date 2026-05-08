export interface ClickInfo {
  lat: number;
  lng: number;
  inSun: boolean | null;
  buildingId?: string | null;
  buildingLabel?: string | null;
  complexName?: string | null;
  address?: string | null;
  buildingInfoLoading?: boolean;
  photoUrl?: string | null;
  photoPlaceName?: string | null;
}
