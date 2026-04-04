import {
  BarChart3,
  Circle,
  Flower2,
  Hexagon,
  Pencil,
  Snowflake,
  Sparkles,
  Square,
  Sun,
  Zap,
} from 'lucide-react';
import type {
  SolarCandidate,
  SolarDrawMode,
  SolarOptimizationTarget,
  SolarPanelType,
  SolarWizardStep,
} from '@/types/solar-flowers';
import {
  SOLAR_WIZARD_COPY,
} from '@/components/SolarFlowersWizard/copy';
import { SolarWizardHeader } from '@/components/SolarFlowersWizard/SolarWizardHeader';
import { SolarShapeStep } from '@/components/SolarFlowersWizard/SolarShapeStep';
import { SolarSettingsStep } from '@/components/SolarFlowersWizard/SolarSettingsStep';
import { SolarResultsStep } from '@/components/SolarFlowersWizard/SolarResultsStep';
import {
  ACCENT_BORDER,
  PANEL_BG,
} from '@/components/SolarFlowersWizard/styles';
import type {
  SolarDrawShapeOption,
  SolarPanelTypeOption,
  SolarTargetOption,
} from '@/components/SolarFlowersWizard/types';

export interface SolarFlowersWizardProps {
  step: SolarWizardStep;
  drawMode: SolarDrawMode;
  drawingInProgress: boolean;
  hasArea: boolean;
  areaKm2: number | null;
  panelType: SolarPanelType;
  target: SolarOptimizationTarget;
  topK: number;
  loading: boolean;
  error: string | null;
  candidates: SolarCandidate[];
  selectedCandidate: SolarCandidate | null;
  language: 'ru' | 'kk' | 'en';

  onDrawModeChange: (mode: SolarDrawMode) => void;
  onStartDrawing: () => void;
  onCancelDrawing: () => void;
  onContinueToSettings: () => void;
  onClearArea: () => void;
  onPanelTypeChange: (type: SolarPanelType) => void;
  onTargetChange: (target: SolarOptimizationTarget) => void;
  onTopKChange: (topK: number) => void;
  onRunRanking: () => void;
  onBackToShape: () => void;
  onCloseCandidate: () => void;
}

export default function SolarFlowersWizard({
  step,
  drawMode,
  drawingInProgress,
  hasArea,
  areaKm2,
  panelType,
  target,
  topK,
  loading,
  error,
  candidates,
  selectedCandidate,
  language,
  onDrawModeChange,
  onStartDrawing,
  onCancelDrawing,
  onContinueToSettings,
  onClearArea,
  onPanelTypeChange,
  onTargetChange,
  onTopKChange,
  onRunRanking,
  onBackToShape,
  onCloseCandidate,
}: SolarFlowersWizardProps) {
  const copy = SOLAR_WIZARD_COPY[language] ?? SOLAR_WIZARD_COPY.en;
  const stepIndex = step === 'shape' || step === 'drawing' ? 0 : step === 'settings' ? 1 : 2;

  const drawShapes: SolarDrawShapeOption[] = [
    { mode: 'rectangle', label: copy.drawModeRect, Icon: Square },
    { mode: 'circle', label: copy.drawModeCircle, Icon: Circle },
    { mode: 'polygon', label: copy.drawModePoly, Icon: Hexagon },
    { mode: 'freehand', label: copy.drawModeFree, Icon: Pencil },
  ];

  const panelTypes: SolarPanelTypeOption[] = [
    { value: 'solar_flower', label: copy.panelFlower, Icon: Flower2 },
    { value: 'ground_mounted', label: copy.panelGround, Icon: Zap },
    { value: 'rooftop', label: copy.panelRooftop, Icon: Sparkles },
  ];

  const targets: SolarTargetOption[] = [
    { value: 'max_annual', label: copy.targetAnnual, Icon: Sun },
    { value: 'max_winter', label: copy.targetWinter, Icon: Snowflake },
    { value: 'balanced', label: copy.targetBalanced, Icon: BarChart3 },
  ];

  return (
    <aside
      className="absolute right-4 top-[4.5rem] z-[1100] w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden md:top-4"
      style={{ background: PANEL_BG, backdropFilter: 'blur(22px)', border: `1px solid ${ACCENT_BORDER}` }}
    >
      <SolarWizardHeader copy={copy} stepIndex={stepIndex} />

      <div className="px-5 pb-5 space-y-3 max-h-[calc(100vh-14rem)] overflow-y-auto">
        {(step === 'shape' || step === 'drawing') && (
          <SolarShapeStep
            step={step}
            drawMode={drawMode}
            drawingInProgress={drawingInProgress}
            hasArea={hasArea}
            areaKm2={areaKm2}
            drawShapes={drawShapes}
            copy={copy}
            onDrawModeChange={onDrawModeChange}
            onStartDrawing={onStartDrawing}
            onCancelDrawing={onCancelDrawing}
            onContinueToSettings={onContinueToSettings}
            onClearArea={onClearArea}
          />
        )}

        {step === 'settings' && (
          <SolarSettingsStep
            areaKm2={areaKm2}
            panelType={panelType}
            target={target}
            topK={topK}
            loading={loading}
            error={error}
            hasArea={hasArea}
            panelTypes={panelTypes}
            targets={targets}
            copy={copy}
            onPanelTypeChange={onPanelTypeChange}
            onTargetChange={onTargetChange}
            onTopKChange={onTopKChange}
            onRunRanking={onRunRanking}
            onBackToShape={onBackToShape}
          />
        )}

        {step === 'results' && (
          <SolarResultsStep
            candidates={candidates}
            selectedCandidate={selectedCandidate}
            copy={copy}
            onRunRanking={onRunRanking}
            onBackToShape={onBackToShape}
            onCloseCandidate={onCloseCandidate}
          />
        )}
      </div>
    </aside>
  );
}
