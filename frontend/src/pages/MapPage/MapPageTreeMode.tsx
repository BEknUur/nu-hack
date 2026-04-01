import TreeCandidateCard from '@/components/TreeCandidateCard';
import TreeOptimizerWizard from '@/components/TreeOptimizerWizard';
import type { UseTreeStateResult } from '@/pages/MapPage/useTreeState';

interface MapPageTreeModeProps {
  visible: boolean;
  tree: UseTreeStateResult;
}

export function MapPageTreeMode({ visible, tree }: MapPageTreeModeProps) {
  if (!visible) return null;

  return (
    <>
      <TreeOptimizerWizard
        step={tree.treeWizardStep}
        drawMode={tree.treeDrawMode}
        drawingInProgress={tree.treeDrawing}
        hasArea={Boolean(tree.treeAreaGeometry)}
        areaKm2={tree.treeAreaKm2}
        summerWeight={tree.treeSummerWeight}
        topK={tree.treeTopK}
        minWinterLight={tree.treeMinWinterLight}
        loading={tree.treeLoading}
        error={tree.treeError}
        resultCount={tree.treeCandidates.length}
        topCandidates={tree.treeCandidates}
        onLocateCandidate={tree.locateTreeCandidate}
        onDrawModeChange={tree.handleTreeDrawModeChange}
        onStartDrawing={tree.startTreeDrawing}
        onCancelDrawing={tree.cancelTreeDrawing}
        onContinueToSettings={tree.continueToSettings}
        onClearArea={tree.clearTreeArea}
        onSummerWeightChange={tree.setTreeSummerWeight}
        onTopKChange={tree.setTreeTopK}
        onMinWinterLightChange={tree.setTreeMinWinterLight}
        onRunRanking={() => {
          void tree.handleRunTreeRanking();
        }}
        onBackToShape={tree.goBackToShape}
        onBackToSettings={tree.goBackToSettings}
      />

      {tree.selectedTreeCandidate && (
        <TreeCandidateCard
          candidate={tree.selectedTreeCandidate}
          explanation={tree.treeExplanation}
          explanationLoading={tree.treeExplainLoading}
          explanationError={tree.treeExplainError}
          anchorPoint={tree.treeCardAnchorPoint}
          onClose={() => {
            tree.setSelectedTreeCandidate(null);
            tree.setTreeCardAnchorPoint(null);
            tree.setTreeExplanation(null);
            tree.setTreeExplainError(null);
          }}
        />
      )}
    </>
  );
}
