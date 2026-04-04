import type { MapBounds } from '@/types/map-engine';
import type {
    RankAreaGeometry,
    TreeExplainResponse,
    TreeRankCandidate,
    TreeRankResponse,
} from '@/types/tree-optimizer';
import { getBackendUrl } from '@/services/backendUrl';

export interface RankTreeCandidatesInput {
    areaGeometry: RankAreaGeometry;
    areaBounds?: MapBounds;
    topK: number;
    summerWeight: number;
    minWinterLight: number;
    minSpacingM?: number;
}

export async function rankTreeCandidates(input: RankTreeCandidatesInput): Promise<TreeRankResponse> {
    const res = await fetch(`${getBackendUrl()}/ml/tree-optimizer/rank`, {
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
            top_k: input.topK,
            summer_weight: input.summerWeight,
            min_winter_light: input.minWinterLight,
            min_spacing_m: input.minSpacingM ?? 60,
        }),
    });

    if (!res.ok) {
        throw new Error(`Tree ranking failed: ${res.status}`);
    }

    return res.json() as Promise<TreeRankResponse>;
}

export async function explainTreeCandidate(
    candidate: TreeRankCandidate,
    language: 'ru' | 'kk' | 'en',
    summerWeight: number,
): Promise<TreeExplainResponse> {
    const res = await fetch(`${getBackendUrl()}/ml/tree-optimizer/explain`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            candidate,
            language,
            summer_weight: summerWeight,
        }),
    });

    if (!res.ok) {
        throw new Error(`Tree explanation failed: ${res.status}`);
    }

    return res.json() as Promise<TreeExplainResponse>;
}
