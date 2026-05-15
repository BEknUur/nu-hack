import type { CSSProperties } from 'react';
import { LoaderCircle, Sprout } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import type { TreeDrawMode } from '@/types/tree-optimizer';

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
}

interface WizardCopy {
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
}

const WIZARD_COPY: Record<'ru' | 'kk' | 'en', WizardCopy> = {
  ru: {
    panelTag: 'Сценарий',
    title: 'Посадка деревьев',
    stepShape: 'Шаг 1 из 3 · Выбор области',
    stepDrawing: 'Шаг 1 из 3 · Рисование на карте',
    stepSettings: 'Шаг 2 из 3 · Настройка подбора',
    stepResults: 'Шаг 3 из 3 · Результаты',
    drawModeLabel: 'Фигура выделения',
    drawRectangle: 'Прямоугольник',
    drawCircle: 'Круг',
    drawPolygon: 'Полигон',
    drawFreehand: 'Свободно',
    drawAction: 'Начать рисование',
    redrawAction: 'Перерисовать область',
    continueAction: 'К настройкам подбора',
    clearAction: 'Очистить',
    drawingTitle: 'Рисуйте область прямо на карте',
    drawingHintRectangle: 'Зажмите и протяните мышь, чтобы задать прямоугольник.',
    drawingHintCircle: 'Зажмите и протяните мышь от центра, чтобы задать круг.',
    drawingHintPolygon: 'Кликайте по вершинам, завершите двойным кликом.',
    drawingHintFreehand: 'Зажмите кнопку мыши и рисуйте контур свободно.',
    drawingSubHint: 'Нажмите Esc, чтобы отменить текущее рисование.',
    drawingActive: 'Рисование активно',
    cancelDrawing: 'Отмена',
    settingsTitle: 'Настройте модель подбора и запустите расчет',
    areaLabel: 'Площадь',
    balanceLabel: 'Баланс приоритета',
    seasonShare: (summer, winter) => `Лето ${summer}% · Зима ${winter}%`,
    summerHint: 'Больше прохлады летом',
    winterHint: 'Больше света зимой',
    topN: 'Количество точек',
    minWinterLight: 'Мин. зимний свет',
    run: 'Подобрать точки',
    running: 'Выполняю подбор...',
    backToShape: 'Изменить область',
    resultsTitle: 'Подбор завершен',
    resultCount: (count) => `Найдено точек: ${count}`,
    resultsHint: 'Нажмите на точку на карте, чтобы увидеть причины выбора.',
    noResults: 'По текущим параметрам точки не найдены. Измените фильтры или область.',
    adjustSettings: 'Изменить настройки',
    redrawArea: 'Выбрать новую область',
    rerun: 'Пересчитать',
    score: 'Балл',
    topCandidates: 'Топ кандидатов',
  },
  kk: {
    panelTag: 'Сценарий',
    title: 'Ағаш отырғызу',
    stepShape: '1 / 3-қадам · Аймақ таңдау',
    stepDrawing: '1 / 3-қадам · Картада сызу',
    stepSettings: '2 / 3-қадам · Параметрлер',
    stepResults: '3 / 3-қадам · Нәтижелер',
    drawModeLabel: 'Аймақ пішіні',
    drawRectangle: 'Тіктөртбұрыш',
    drawCircle: 'Шеңбер',
    drawPolygon: 'Көпбұрыш',
    drawFreehand: 'Еркін',
    drawAction: 'Сызуды бастау',
    redrawAction: 'Аймақты қайта сызу',
    continueAction: 'Параметрлерге өту',
    clearAction: 'Тазалау',
    drawingTitle: 'Аймақты картада тікелей сызыңыз',
    drawingHintRectangle: 'Тінтуірді басып ұстап, тіктөртбұрышты тартып салыңыз.',
    drawingHintCircle: 'Орталықтан басып ұстап, радиусты тартып шеңбер салыңыз.',
    drawingHintPolygon: 'Төбелерді шертіп қосыңыз, қос шерту арқылы аяқтаңыз.',
    drawingHintFreehand: 'Тінтуір батырмасын ұстап тұрып, контурды еркін сызыңыз.',
    drawingSubHint: 'Ағымдағы сызуды болдырмау үшін Esc пернесін басыңыз.',
    drawingActive: 'Сызу белсенді',
    cancelDrawing: 'Болдырмау',
    settingsTitle: 'Параметрлерді баптап, есептеуді іске қосыңыз',
    areaLabel: 'Аудан',
    balanceLabel: 'Басымдық балансы',
    seasonShare: (summer, winter) => `Жаз ${summer}% · Қыс ${winter}%`,
    summerHint: 'Жазғы салқындық көбірек',
    winterHint: 'Қысқы жарық көбірек',
    topN: 'Нүкте саны',
    minWinterLight: 'Қысқы жарық мин.',
    run: 'Нүктелерді табу',
    running: 'Есептелуде...',
    backToShape: 'Аймақты өзгерту',
    resultsTitle: 'Есептеу аяқталды',
    resultCount: (count) => `Табылған нүктелер: ${count}`,
    resultsHint: 'Нүктені басып, таңдау себептерін көріңіз.',
    noResults: 'Ағымдағы параметрлер бойынша нүктелер табылмады. Параметрді не аймақты өзгертіңіз.',
    adjustSettings: 'Параметрлерді өзгерту',
    redrawArea: 'Жаңа аймақ таңдау',
    rerun: 'Қайта есептеу',
    score: 'Балл',
    topCandidates: 'Үздік кандидаттар',
  },
  en: {
    panelTag: 'Scenario',
    title: 'Tree Planting',
    stepShape: 'Step 1 of 3 · Select area',
    stepDrawing: 'Step 1 of 3 · Draw on map',
    stepSettings: 'Step 2 of 3 · Configure ranking',
    stepResults: 'Step 3 of 3 · Results',
    drawModeLabel: 'Selection shape',
    drawRectangle: 'Rectangle',
    drawCircle: 'Circle',
    drawPolygon: 'Polygon',
    drawFreehand: 'Free draw',
    drawAction: 'Start drawing',
    redrawAction: 'Redraw area',
    continueAction: 'Continue to settings',
    clearAction: 'Clear',
    drawingTitle: 'Draw the target area directly on the map',
    drawingHintRectangle: 'Click and drag to define a rectangle.',
    drawingHintCircle: 'Click and drag from center to define a circle.',
    drawingHintPolygon: 'Click to add vertices, double-click to finish.',
    drawingHintFreehand: 'Hold mouse button and draw a free contour.',
    drawingSubHint: 'Press Esc to cancel current drawing.',
    drawingActive: 'Drawing active',
    cancelDrawing: 'Cancel',
    settingsTitle: 'Tune the ranking model and run calculation',
    areaLabel: 'Area',
    balanceLabel: 'Priority balance',
    seasonShare: (summer, winter) => `Summer ${summer}% · Winter ${winter}%`,
    summerHint: 'More summer cooling',
    winterHint: 'More winter light',
    topN: 'Number of spots',
    minWinterLight: 'Min winter light',
    run: 'Find best spots',
    running: 'Running ranking...',
    backToShape: 'Change area',
    resultsTitle: 'Ranking complete',
    resultCount: (count) => `Spots found: ${count}`,
    resultsHint: 'Click any point on the map to see the decision explanation.',
    noResults: 'No spots found for current parameters. Adjust filters or area.',
    adjustSettings: 'Adjust settings',
    redrawArea: 'Select new area',
    rerun: 'Re-run ranking',
    score: 'Score',
    topCandidates: 'Top candidates',
  },
};

function drawModeHint(copy: WizardCopy, mode: TreeDrawMode): string {
  if (mode === 'rectangle') return copy.drawingHintRectangle;
  if (mode === 'circle') return copy.drawingHintCircle;
  if (mode === 'polygon') return copy.drawingHintPolygon;
  return copy.drawingHintFreehand;
}

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
}: TreeOptimizerWizardProps) {
  const { language } = useTranslation();
  const copy = WIZARD_COPY[language];

  const summerPct = Math.round(summerWeight * 100);
  const winterPct = 100 - summerPct;
  const segmentClass = 'map-segment rounded-lg px-3 py-2 text-sm font-medium';
  const stepCardClass = 'rounded-xl border border-[color:var(--line)] bg-white/80 p-3';

  const shapeButtons: Array<{ mode: TreeDrawMode; label: string }> = [
    { mode: 'rectangle', label: copy.drawRectangle },
    { mode: 'circle', label: copy.drawCircle },
    { mode: 'polygon', label: copy.drawPolygon },
    { mode: 'freehand', label: copy.drawFreehand },
  ];

  return (
    <aside
      data-tree-wizard-panel="true"
      className="map-panel absolute right-4 top-[8.5rem] z-[1100] w-[320px] max-w-[calc(100vw-2rem)] rounded-xl p-4 text-[var(--ink)] md:top-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="ui-mono text-[11px] text-[var(--ink-soft)]">{copy.panelTag}</div>
          <div className="mt-1 text-xl font-semibold tracking-[-0.04em]">{copy.title}</div>
        </div>
        <div className="map-chip flex min-h-10 min-w-10 items-center justify-center rounded-lg px-3">
          <Sprout className="h-4 w-4 text-[var(--yellow-strong)]" />
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div className={stepCardClass}>
          <div className="ui-mono text-[10px] text-[var(--ink-soft)]">Step 1</div>
          <div className="mt-1 text-sm text-[var(--ink)]">Select area on map</div>
          <div className="mt-2 text-sm text-[var(--ink-soft)]">{copy.drawModeLabel}</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {shapeButtons.map((option) => (
              <button
                key={option.mode}
                type="button"
                onClick={() => onDrawModeChange(option.mode)}
                className={cn(segmentClass, drawMode === option.mode && 'is-active')}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="ui-mono text-[11px] text-[var(--ink-soft)]">
              {step === 'drawing' ? copy.stepDrawing : copy.stepShape}
            </span>
            <span className="ui-mono text-[11px] text-[var(--ink-soft)]">
              {drawMode}
            </span>
            {areaKm2 != null && (
              <span className="ui-mono text-[11px] text-[var(--ink-soft)]">
                {areaKm2.toFixed(2)} km2
              </span>
            )}
          </div>

          {(step === 'drawing' || drawingInProgress) && (
            <div className="mt-3 rounded-lg border border-[color:var(--line)] bg-white/70 p-3">
              <div className="text-sm font-medium text-[var(--ink)]">{copy.drawingTitle}</div>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">{drawModeHint(copy, drawMode)}</p>
              <p className="mt-2 text-[11px] text-[var(--ink-soft)]">{copy.drawingSubHint}</p>
              <div className="mt-2 inline-flex items-center gap-2 text-xs text-[var(--blue-strong)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--blue-strong)] animate-pulse-dot" />
                {copy.drawingActive}
              </div>
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onStartDrawing}
              className="inline-flex items-center justify-center rounded-lg border border-[color:var(--blue-strong)] bg-[var(--blue-strong)] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--blue)]"
            >
              {hasArea ? copy.redrawAction : copy.drawAction}
            </button>
            <button
              type="button"
              onClick={step === 'drawing' ? onCancelDrawing : onClearArea}
              className={segmentClass}
              disabled={!hasArea && step !== 'drawing'}
            >
              {step === 'drawing' ? copy.cancelDrawing : copy.clearAction}
            </button>
          </div>

          {step !== 'drawing' && (
            <button
              type="button"
              onClick={onContinueToSettings}
              className="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-[color:var(--line)] bg-white px-3 py-2 text-sm font-medium text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
              disabled={!hasArea}
            >
              {copy.continueAction}
            </button>
          )}
        </div>

        <div className={stepCardClass}>
          <div className="ui-mono text-[10px] text-[var(--ink-soft)]">Step 2</div>
          <div className="mt-1 text-sm text-[var(--ink)]">Configure ranking</div>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">{copy.settingsTitle}</p>

          <div className="mt-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-[var(--ink)]">{copy.balanceLabel}</span>
              <span className="ui-mono text-[11px] text-[var(--ink-soft)]">{copy.seasonShare(summerPct, winterPct)}</span>
            </div>
            <input
              type="range"
              className="time-slider mt-2"
              min={0}
              max={100}
              step={1}
              value={summerPct}
              style={{ '--pct': `${summerPct}%` } as CSSProperties}
              onChange={(event) => onSummerWeightChange(Number(event.target.value) / 100)}
              disabled={loading || !hasArea || step === 'drawing'}
            />
            <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--ink-soft)]">
              <span>{copy.summerHint}</span>
              <span>{copy.winterHint}</span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="text-sm text-[var(--ink-soft)]">
              {copy.topN}
              <select
                className="map-input mt-1 w-full rounded-lg px-2 py-1.5 text-sm text-[var(--ink)]"
                value={topK}
                onChange={(event) => onTopKChange(Number(event.target.value))}
                disabled={loading || !hasArea || step === 'drawing'}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </label>

            <label className="text-sm text-[var(--ink-soft)]">
              {copy.minWinterLight}
              <select
                className="map-input mt-1 w-full rounded-lg px-2 py-1.5 text-sm text-[var(--ink)]"
                value={minWinterLight}
                onChange={(event) => onMinWinterLightChange(Number(event.target.value))}
                disabled={loading || !hasArea || step === 'drawing'}
              >
                <option value={0.2}>20%</option>
                <option value={0.3}>30%</option>
                <option value={0.4}>40%</option>
                <option value={0.5}>50%</option>
              </select>
            </label>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onRunRanking}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[color:var(--blue-strong)] bg-[var(--blue-strong)] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--blue)] disabled:cursor-not-allowed disabled:opacity-70"
              disabled={loading || !hasArea || step === 'drawing'}
            >
              {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {loading ? copy.running : copy.run}
            </button>
            <button
              type="button"
              onClick={step === 'results' ? onBackToSettings : onBackToShape}
              className={segmentClass}
            >
              {step === 'results' ? copy.adjustSettings : copy.backToShape}
            </button>
          </div>

          {error && (
            <p className="mt-3 rounded-lg border border-[#e2b2a7] bg-[#fff7f4] px-3 py-2 text-sm text-[#9c3b2a]">
              {error}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
