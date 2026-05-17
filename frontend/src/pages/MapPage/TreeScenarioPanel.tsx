import type { ComponentProps } from 'react';
import TreeOptimizerWizard from '@/components/TreeOptimizerWizard';

export type TreeScenarioPanelProps = ComponentProps<typeof TreeOptimizerWizard>;

/** MapPage trees route: sidebar wizard UI only — state lives in `MapPage`. */
export function TreeScenarioPanel(props: TreeScenarioPanelProps) {
  return <TreeOptimizerWizard {...props} />;
}
