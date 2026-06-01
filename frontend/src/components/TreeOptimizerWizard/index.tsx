import { type CSSProperties, useState } from 'react';
import { useTranslation } from '@/i18n';
import type { TreeDrawMode, TreeRankCandidate } from '@/types/tree-optimizer';
import { TreeAreaDrawControls } from '@/components/treeShared/TreeAreaDrawControls';
import { TreeRankingControls } from '@/components/treeShared/TreeRankingControls';
import type { ScenarioImpactResponse } from '@/services/heatGrid';

export type TreeWizardStep = 'shape' | 'drawing' | 'settings' | 'results';

interface TreeOptimizerWizardProps {
  step: TreeWizardStep;
  drawMode: TreeDrawMode;
  drawingInProgress: boolean;
  hasArea: boolean;
  areaKm2: number | null;
  summerWeight: number;
  topK: number;
  minWinterLight: number;
  loading: boolean;
  error: string | null;
  resultCount: number;
  topCandidates: TreeRankCandidate[];
  onLocateCandidate: (candidate: TreeRankCandidate) => void;
  onDrawModeChange: (mode: TreeDrawMode) => void;
  onStartDrawing: () => void;
  onCancelDrawing: () => void;
  onContinueToSettings: () => void;
  onClearArea: () => void;
  onSummerWeightChange: (value: number) => void;
  onTopKChange: (value: number) => void;
  onMinWinterLightChange: (value: number) => void;
  onRunRanking: () => void;
  onBackToShape: () => void;
  onBackToSettings: () => void;
  // Scenario panel (shown after results)
  scenarioBbox?: { lon_min: number; lat_min: number; lon_max: number; lat_max: number } | null;
  onScenarioRequest?: (targetCanopyPct: number) => void;
  scenarioImpact?: ScenarioImpactResponse | null;
  scenarioLoading?: boolean;
}

export interface WizardCopy {
  panelTag: string;
  title: string;
  stepShape: string;
  stepDrawing: string;
  stepSettings: string;
  stepResults: string;
  drawModeLabel: string;
  drawRectangle: string;
  drawCircle: string;
  drawPolygon: string;
  drawFreehand: string;
  drawAction: string;
  redrawAction: string;
  continueAction: string;
  clearAction: string;
  drawingTitle: string;
  drawingHintRectangle: string;
  drawingHintCircle: string;
  drawingHintPolygon: string;
  drawingHintFreehand: string;
  drawingSubHint: string;
  drawingActive: string;
  cancelDrawing: string;
  settingsTitle: string;
  areaLabel: string;
  balanceLabel: string;
  seasonShare: (summer: number, winter: number) => string;
  summerHint: string;
  winterHint: string;
  topN: string;
  minWinterLight: string;
  run: string;
  running: string;
  backToShape: string;
  resultsTitle: string;
  resultCount: (count: number) => string;
  resultsHint: string;
  noResults: string;
  adjustSettings: string;
  redrawArea: string;
  rerun: string;
  score: string;
  topCandidates: string;
  viewOnMap: string;
}

const WIZARD_COPY: Record<'ru' | 'kk' | 'en', WizardCopy> = {
  ru: {
    panelTag: 'Сценарий',
    title: 'Деревья',
    stepShape: 'Шаг 1 из 3 · Выбор области',
    stepDrawing: 'Шаг 1 из 3 · Рисование на карте',
    stepSettings: 'Шаг 2 из 3 · Настройка подбора',
    stepResults: 'Шаг 3 из 3 · Результаты',
    drawModeLabel: 'Фигура выделения',
    drawRectangle: 'Прямоугольник',
    drawCircle: 'Круг',
    drawPolygon: 'Полигон',
    drawFreehand: 'Свободно',
    drawAction: 'Рисовать',
    redrawAction: 'Заново',
    continueAction: 'Далее',
    clearAction: 'Очистить',
    drawingTitle: 'Рисование',
    drawingHintRectangle: 'Зажмите и протяните мышь, чтобы задать прямоугольник.',
    drawingHintCircle: 'Зажмите и протяните мышь от центра, чтобы задать круг.',
    drawingHintPolygon: 'Кликайте по вершинам, завершите двойным кликом.',
    drawingHintFreehand: 'Зажмите кнопку мыши и рисуйте контур свободно.',
    drawingSubHint: 'Esc для отмены.',
    drawingActive: 'Рисование активно',
    cancelDrawing: 'Отмена',
    settingsTitle: 'Параметры',
    areaLabel: 'Площадь',
    balanceLabel: 'Тень',
    seasonShare: (summer, winter) => `Лето ${summer}% · Зима ${winter}%`,
    summerHint: 'Лето',
    winterHint: 'Зима',
    topN: 'Точки',
    minWinterLight: 'Свет',
    run: 'Найти',
    running: 'Выполняю подбор...',
    backToShape: 'Область',
    resultsTitle: 'Результат',
    resultCount: (count) => `${count} точек`,
    resultsHint: 'Нажмите точку на карте.',
    noResults: 'По текущим параметрам точки не найдены. Измените фильтры или область.',
    adjustSettings: 'Изменить',
    redrawArea: 'Новая область',
    rerun: 'Повторить',
    score: 'Балл',
    topCandidates: 'Топ кандидатов',
    viewOnMap: 'Карта',
  },
  kk: {
    panelTag: 'Сценарий',
    title: 'Ағаштар',
    stepShape: '1 / 3-қадам · Аймақ таңдау',
    stepDrawing: '1 / 3-қадам · Картада сызу',
    stepSettings: '2 / 3-қадам · Параметрлер',
    stepResults: '3 / 3-қадам · Нәтижелер',
    drawModeLabel: 'Аймақ пішіні',
    drawRectangle: 'Тіктөртбұрыш',
    drawCircle: 'Шеңбер',
    drawPolygon: 'Көпбұрыш',
    drawFreehand: 'Еркін',
    drawAction: 'Сызу',
    redrawAction: 'Қайта',
    continueAction: 'Келесі',
    clearAction: 'Тазалау',
    drawingTitle: 'Сызу',
    drawingHintRectangle: 'Тінтуірді басып ұстап, тіктөртбұрышты тартып салыңыз.',
    drawingHintCircle: 'Орталықтан басып ұстап, радиусты тартып шеңбер салыңыз.',
    drawingHintPolygon: 'Төбелерді шертіп қосыңыз, қос шерту арқылы аяқтаңыз.',
    drawingHintFreehand: 'Тінтуір батырмасын ұстап тұрып, контурды еркін сызыңыз.',
    drawingSubHint: 'Esc болдырмайды.',
    drawingActive: 'Сызу белсенді',
    cancelDrawing: 'Болдырмау',
    settingsTitle: 'Параметрлер',
    areaLabel: 'Аудан',
    balanceLabel: 'Көлеңке',
    seasonShare: (summer, winter) => `Жаз ${summer}% · Қыс ${winter}%`,
    summerHint: 'Жаз',
    winterHint: 'Қыс',
    topN: 'Нүктелер',
    minWinterLight: 'Жарық',
    run: 'Табу',
    running: 'Есептелуде...',
    backToShape: 'Аймақ',
    resultsTitle: 'Нәтиже',
    resultCount: (count) => `${count} нүкте`,
    resultsHint: 'Картадан нүктені басыңыз.',
    noResults: 'Ағымдағы параметрлер бойынша нүктелер табылмады. Параметрді не аймақты өзгертіңіз.',
    adjustSettings: 'Өзгерту',
    redrawArea: 'Жаңа аймақ',
    rerun: 'Қайта',
    score: 'Балл',
    topCandidates: 'Үздік кандидаттар',
    viewOnMap: 'Карта',
  },
  en: {
    panelTag: 'Scenario',
    title: 'Trees',
    stepShape: 'Step 1 of 3 · Select area',
    stepDrawing: 'Step 1 of 3 · Draw on map',
    stepSettings: 'Step 2 of 3 · Configure ranking',
    stepResults: 'Step 3 of 3 · Results',
    drawModeLabel: 'Selection shape',
    drawRectangle: 'Rectangle',
    drawCircle: 'Circle',
    drawPolygon: 'Polygon',
    drawFreehand: 'Free draw',
    drawAction: 'Draw',
    redrawAction: 'Redraw',
    continueAction: 'Next',
    clearAction: 'Clear',
    drawingTitle: 'Drawing',
    drawingHintRectangle: 'Click and drag to define a rectangle.',
    drawingHintCircle: 'Click and drag from center to define a circle.',
    drawingHintPolygon: 'Click to add vertices, double-click to finish.',
    drawingHintFreehand: 'Hold mouse button and draw a free contour.',
    drawingSubHint: 'Esc to cancel.',
    drawingActive: 'Drawing active',
    cancelDrawing: 'Cancel',
    settingsTitle: 'Settings',
    areaLabel: 'Area',
    balanceLabel: 'Shade',
    seasonShare: (summer, winter) => `Summer ${summer}% · Winter ${winter}%`,
    summerHint: 'Summer',
    winterHint: 'Winter',
    topN: 'Spots',
    minWinterLight: 'Light',
    run: 'Find',
    running: 'Running ranking...',
    backToShape: 'Area',
    resultsTitle: 'Results',
    resultCount: (count) => `${count} spots`,
    resultsHint: 'Select a point on the map.',
    noResults: 'No spots found for current parameters. Adjust filters or area.',
    adjustSettings: 'Edit',
    redrawArea: 'New area',
    rerun: 'Run again',
    score: 'Score',
    topCandidates: 'Top candidates',
    viewOnMap: 'View',
  },
};

export function drawModeHint(copy: WizardCopy, mode: TreeDrawMode): string {
  if (mode === 'rectangle') return copy.drawingHintRectangle;
  if (mode === 'circle') return copy.drawingHintCircle;
  if (mode === 'polygon') return copy.drawingHintPolygon;
  return copy.drawingHintFreehand;
}

export { WIZARD_COPY };

export default function TreeOptimizerWizard({
  step,
  drawMode,
  drawingInProgress,
  hasArea,
  areaKm2,
  summerWeight,
  topK,
  minWinterLight,
  loading,
  error,
  resultCount,
  topCandidates,
  onLocateCandidate,
  onDrawModeChange,
  onStartDrawing,
  onCancelDrawing,
  onContinueToSettings,
  onClearArea,
  onSummerWeightChange,
  onTopKChange,
  onMinWinterLightChange,
  onRunRanking,
  onBackToShape,
  onBackToSettings,
  scenarioBbox,
  onScenarioRequest,
  scenarioImpact,
  scenarioLoading,
}: TreeOptimizerWizardProps) {
  const { language } = useTranslation();
  const copy = WIZARD_COPY[language];
  const [canopyPct, setCanopyPct] = useState(20);

  const summerPct = Math.round(summerWeight * 100);
  const winterPct = 100 - summerPct;
  const stepCardClass = 'rounded-md border border-[color:var(--line)] bg-white/72 p-2';
  const controlsDisabled = loading || !hasArea || step === 'drawing';
  const areaStatus = step === 'drawing'
    ? copy.drawingActive
    : areaKm2 != null
      ? `${areaKm2.toFixed(2)} km2`
      : null;

  const shapeButtons: Array<{ mode: TreeDrawMode; label: string }> = [
    { mode: 'rectangle', label: copy.drawRectangle },
    { mode: 'circle', label: copy.drawCircle },
  ];

  return (
    <aside
      data-tree-wizard-panel="true"
      className="map-panel absolute right-4 top-[8.5rem] z-[1100] hidden w-[264px] max-w-[calc(100vw-2rem)] rounded-lg p-2.5 text-[var(--ink)] md:top-4 md:block"
    >
      <div className="text-[17px] font-semibold tracking-[-0.04em]">{copy.title}</div>

      <div className="mt-2.5 space-y-2">
        <div className={stepCardClass}>
          <div className="ui-mono text-[10px] text-[var(--ink-soft)]">Area</div>
          <TreeAreaDrawControls
            variant="wizard"
            shapeLabel=""
            drawMode={drawMode}
            drawModeOptions={shapeButtons}
            onDrawModeChange={onDrawModeChange}
            hasArea={hasArea}
            isDrawing={step === 'drawing'}
            onStartDrawing={onStartDrawing}
            onClearArea={onClearArea}
            onCancelDrawing={onCancelDrawing}
            drawActionLabel={copy.drawAction}
            redrawActionLabel={copy.redrawAction}
            clearActionLabel={copy.clearAction}
            cancelActionLabel={copy.cancelDrawing}
            clearDisabled={!hasArea && step !== 'drawing'}
            continueActionLabel={copy.continueAction}
            continueDisabled={!hasArea}
            onContinue={step !== 'drawing' ? onContinueToSettings : undefined}
            statusContent={areaStatus ? (
              <div className="mt-2 ui-mono text-[10px] text-[var(--ink-soft)]">
                {areaStatus}
              </div>
            ) : undefined}
            drawingContent={(step === 'drawing' || drawingInProgress) ? (
              <div className="mt-2 rounded-md border border-[color:var(--line)] bg-white/72 px-2 py-1.5">
                <div className="flex items-center gap-2 text-[11px] text-[var(--yellow-strong)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--yellow-strong)] animate-pulse-dot" />
                  <span>{copy.drawingTitle}</span>
                </div>
                <p className="mt-1 text-[11px] text-[var(--ink-soft)]">{drawModeHint(copy, drawMode)}</p>
              </div>
            ) : undefined}
          />
        </div>

        <div className={stepCardClass}>
          <div className="ui-mono text-[10px] text-[var(--ink-soft)]">Rank</div>

          <TreeRankingControls
            variant="wizard"
            balanceLabel={copy.balanceLabel}
            seasonShareLabel={copy.seasonShare(summerPct, winterPct)}
            summerHint={copy.summerHint}
            winterHint={copy.winterHint}
            topNLabel={copy.topN}
            minWinterLightLabel={copy.minWinterLight}
            summerPct={summerPct}
            topK={topK}
            minWinterLight={minWinterLight}
            onSummerWeightChange={onSummerWeightChange}
            onTopKChange={onTopKChange}
            onMinWinterLightChange={onMinWinterLightChange}
            controlsDisabled={controlsDisabled}
            loading={loading}
            runLabel={copy.run}
            runningLabel={copy.running}
            onRun={onRunRanking}
            runDisabled={controlsDisabled}
            secondaryActionLabel={step === 'results' ? copy.adjustSettings : copy.backToShape}
            onSecondaryAction={step === 'results' ? onBackToSettings : onBackToShape}
          />

          {error && (
            <p className="mt-2 rounded-md border border-[#e2b2a7] bg-[#fff7f4] px-2 py-1.5 text-[12px] text-[#9c3b2a]">
              {error}
            </p>
          )}
        </div>

        {step === 'results' && (
          <div className={stepCardClass}>
            <div className="ui-mono text-[10px] text-[var(--ink-soft)]">{copy.resultsTitle}</div>
            <p className="mt-1 text-[13px] text-[var(--ink)]">{copy.resultCount(resultCount)}</p>
            {resultCount === 0 ? (
              <p className="mt-2 text-[12px] text-[var(--ink-soft)]">{copy.noResults}</p>
            ) : (
              <>
                <ul className="mt-2 max-h-44 space-y-1.5 overflow-y-auto">
                  {topCandidates.map((candidate) => (
                    <li
                      key={candidate.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-[color:var(--line)] bg-white/72 px-2 py-1.5"
                    >
                      <div className="min-w-0">
                        <span className="ui-mono text-[10px] text-[var(--ink-soft)]">#{candidate.rank}</span>
                        <span className="ml-2 text-[12px] font-medium text-[var(--ink)]">
                          {candidate.score.toFixed(1)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 rounded-md border border-[color:rgba(198,138,17,0.24)] bg-white px-2 py-1 text-[11px] font-medium text-[var(--yellow-strong)] transition-colors hover:bg-[rgba(240,194,76,0.12)]"
                        onClick={() => {
                          onLocateCandidate(candidate);
                        }}
                      >
                        {copy.viewOnMap}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {step === 'results' && scenarioBbox && onScenarioRequest && (
          <div className={stepCardClass}>
            <div className="ui-mono text-[10px] text-[var(--ink-soft)]">Scenario</div>
            <div className="mt-2">
              <div className="flex items-center justify-between text-[11px] text-[var(--ink)]">
                <span>Canopy cover target</span>
                <span className="ui-mono font-semibold">+{canopyPct}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={40}
                step={5}
                value={canopyPct}
                className="time-slider mt-1 w-full"
                style={{ '--pct': `${((canopyPct - 5) / 35) * 100}%` } as CSSProperties}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setCanopyPct(v);
                  onScenarioRequest(v);
                }}
              />
              <div className="mt-0.5 flex justify-between ui-mono text-[9px] text-[var(--ink-soft)]">
                <span>+5%</span><span>+40%</span>
              </div>
            </div>

            {scenarioLoading && (
              <p className="mt-2 text-[11px] text-[var(--ink-soft)]">Calculating...</p>
            )}

            {scenarioImpact && !scenarioLoading && !scenarioImpact.error && (
              <div className="mt-2 rounded-md border border-[color:var(--line)] bg-white/72 px-2 py-1.5 space-y-0.5">
                <div className="text-[12px] font-semibold text-[#2e6b3e]">
                  −{scenarioImpact.estimated_air_cooling_c.toFixed(1)}°C air cooling
                </div>
                <div className="text-[11px] text-[var(--ink)]">
                  {scenarioImpact.trees_needed.toLocaleString()} trees needed
                </div>
                <div className="text-[11px] text-[var(--ink)]">
                  −{scenarioImpact.co2_uptake_t_per_year.toFixed(1)} t CO₂/yr
                </div>
                <div className="text-[11px] text-[var(--ink-soft)]">
                  Zone: {scenarioImpact.zone_area_ha.toFixed(1)} ha ·{' '}
                  LST now: {scenarioImpact.mean_surface_temp_now_c.toFixed(1)}°C
                </div>
                <p className="text-[9px] text-[var(--ink-soft)] leading-tight mt-1">
                  Air temp estimate per npj Urban Sustainability 2025. CO₂ approx.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
