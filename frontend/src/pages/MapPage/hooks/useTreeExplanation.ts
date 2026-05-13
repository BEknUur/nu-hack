import { useEffect } from 'react';
import type { Language } from '@/i18n';
import { explainTreeCandidate } from '@/services/treeOptimizer';
import type { TreeRankCandidate, TreeExplainResponse } from '@/types/tree-optimizer';

interface UseTreeExplanationArgs {
  enabled: boolean;
  language: Language;
  selectedTreeCandidate: TreeRankCandidate | null;
  treeSummerWeight: number;
  explainFailedMessage: string;
  setTreeExplanation: React.Dispatch<React.SetStateAction<TreeExplainResponse | null>>;
  setTreeExplainError: React.Dispatch<React.SetStateAction<string | null>>;
  setTreeExplainLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useTreeExplanation({
  enabled,
  language,
  selectedTreeCandidate,
  treeSummerWeight,
  explainFailedMessage,
  setTreeExplanation,
  setTreeExplainError,
  setTreeExplainLoading,
}: UseTreeExplanationArgs) {
  useEffect(() => {
    if (!enabled || !selectedTreeCandidate) {
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
        setTreeExplainError(explainFailedMessage);
      })
      .finally(() => {
        if (isCancelled) return;
        setTreeExplainLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [
    enabled,
    explainFailedMessage,
    language,
    selectedTreeCandidate,
    setTreeExplainError,
    setTreeExplainLoading,
    setTreeExplanation,
    treeSummerWeight,
  ]);
}
