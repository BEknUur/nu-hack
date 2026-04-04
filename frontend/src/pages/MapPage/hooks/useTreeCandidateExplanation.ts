import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { Language } from '@/i18n';
import { explainTreeCandidate } from '@/services/treeOptimizer';
import type { TreeExplainResponse, TreeRankCandidate } from '@/types/tree-optimizer';

export interface UseTreeCandidateExplanationParams {
  isTreeMode: boolean;
  selectedTreeCandidate: TreeRankCandidate | null;
  language: Language;
  treeSummerWeight: number;
  explainFailed: string;
  setTreeExplanation: Dispatch<SetStateAction<TreeExplainResponse | null>>;
  setTreeExplainError: Dispatch<SetStateAction<string | null>>;
  setTreeExplainLoading: Dispatch<SetStateAction<boolean>>;
}

export function useTreeCandidateExplanation({
  isTreeMode,
  selectedTreeCandidate,
  language,
  treeSummerWeight,
  explainFailed,
  setTreeExplanation,
  setTreeExplainError,
  setTreeExplainLoading,
}: UseTreeCandidateExplanationParams) {
  useEffect(() => {
    if (!isTreeMode || !selectedTreeCandidate) {
      setTreeExplanation(null);
      setTreeExplainError(null);
      setTreeExplainLoading(false);
      return;
    }

    let isCancelled = false;
    setTreeExplainLoading(true);
    setTreeExplainError(null);
    setTreeExplanation(null);

    explainTreeCandidate(selectedTreeCandidate, language, treeSummerWeight)
      .then((response) => {
        if (isCancelled) return;
        setTreeExplanation(response);
      })
      .catch((error) => {
        if (isCancelled) return;
        console.error('Tree explanation error:', error);
        setTreeExplainError(explainFailed);
      })
      .finally(() => {
        if (isCancelled) return;
        setTreeExplainLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [isTreeMode, language, selectedTreeCandidate, treeSummerWeight, explainFailed]);
}
