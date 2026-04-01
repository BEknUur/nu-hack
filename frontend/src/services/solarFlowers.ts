import type { MapBounds } from '@/types/map-engine';
import type { RankAreaGeometry } from '@/types/tree-optimizer';
import type {
  SolarExplainResponse,
  SolarProfile,
  SolarRankCandidate,
  SolarRankResponse,
} from '@/types/solar-flowers';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string | undefined;

function getBackendUrl() {
  return BACKEND_URL?.replace(/\/$/, '') ?? 'http://localhost:8000';
}

export interface RankSolarFlowersInput {
  areaGeometry: RankAreaGeometry;
  areaBounds?: MapBounds;
  profile: SolarProfile;
  date: string;
  topK: number;
  minSpacingM?: number;
}

export async function rankSolarFlowersCandidates(input: RankSolarFlowersInput): Promise<SolarRankResponse> {
  const res = await fetch(`${getBackendUrl()}/ml/solar-flowers/rank`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      area_geometry: input.areaGeometry,
      bbox: input.areaBounds
        ? {
            s: input.areaBounds.south,
            w: input.areaBounds.west,
            n: input.areaBounds.north,
            e: input.areaBounds.east,
          }
        : undefined,
      profile: input.profile,
      date: input.date,
      top_k: input.topK,
      min_spacing_m: input.minSpacingM ?? 60,
    }),
  });

  if (!res.ok) {
    throw new Error(`Solar ranking failed: ${res.status}`);
  }

  return res.json() as Promise<SolarRankResponse>;
}

export async function explainSolarFlowersCandidate(
  candidate: SolarRankCandidate,
  profile: SolarProfile,
  date: string,
  language: 'ru' | 'kk' | 'en',
): Promise<SolarExplainResponse> {
  const res = await fetch(`${getBackendUrl()}/ml/solar-flowers/explain`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      candidate,
      profile,
      date,
      language,
    }),
  });

  if (!res.ok) {
    throw new Error(`Solar explanation failed: ${res.status}`);
  }

  return res.json() as Promise<SolarExplainResponse>;
}
