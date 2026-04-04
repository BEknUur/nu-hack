import type { SelectedBuilding } from '@/types/building';
import { getBackendUrl } from '@/services/backendUrl';

type Side = 'N' | 'E' | 'S' | 'W';

interface BestSidePredictionResponse {
  best_side: Side;
  confidence: number;
  probabilities: Record<Side, number>;
  model_version: string;
  source: string;
}

function toPolygonPayload(building: SelectedBuilding) {
  return building.polygons.map((polygon) => ({
    outer: polygon.outer,
    holes: polygon.holes,
  }));
}

export async function predictBestSide(
  building: SelectedBuilding,
  dateStr: string,
): Promise<BestSidePredictionResponse> {
  const res = await fetch(`${getBackendUrl()}/ml/best-side/predict`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      building: {
        id: building.id,
        label: building.label,
        center: building.center,
        height: building.height,
        polygons: toPolygonPayload(building),
      },
      date: dateStr,
      tz_offset_hours: 5,
    }),
  });

  if (!res.ok) {
    throw new Error(`Best-side prediction failed: ${res.status}`);
  }

  return res.json() as Promise<BestSidePredictionResponse>;
}
