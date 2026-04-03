import type { CSSProperties } from 'react';
import {
  Flower2,
  LoaderCircle,
  MapPin,
  SlidersHorizontal,
  Sparkles,
  Square,
  Circle,
  Hexagon,
  Pencil,
  Zap,
  Sun,
  Snowflake,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  SolarCandidate,
  SolarDrawMode,
  SolarOptimizationTarget,
  SolarPanelType,
  SolarWizardStep,
} from '@/types/solar-flowers';

// ─── Copy ─────────────────────────────────────────────────────────────────────

interface Copy {
  tag: string;
  title: string;
  subtitle: string;
  steps: [string, string, string];

  drawTitle: string;
  drawHint: string;
  drawModeRect: string;
  drawModeCircle: string;
  drawModePoly: string;
  drawModeFree: string;
  drawBtn: string;
  redrawBtn: string;
  clearBtn: string;
  continueBtn: string;
  cancelBtn: string;
  drawingActive: string;
  drawingEsc: string;

  settingsTitle: string;
  panelTypeLabel: string;
  panelFlower: string;
  panelGround: string;
  panelRooftop: string;
  targetLabel: string;
  targetAnnual: string;
  targetWinter: string;
  targetBalanced: string;
  countLabel: string;
  areaLabel: string;
  runBtn: string;
  runningBtn: string;
  backBtn: string;

  resultsTitle: string;
  foundLabel: (n: number) => string;
  resultsHint: string;
  noResults: string;
  rerunBtn: string;
  newAreaBtn: string;
  scoreLabel: string;
  kwhLabel: string;
  annualFactor: string;
  winterFactor: string;
  shadingFactor: string;
  slopeLabel: string;
  accessLabel: string;
}

const COPY: Record<'ru' | 'kk' | 'en', Copy> = {
  en: {
    tag: 'Scenario 04',
    title: 'Solar Flowers',
    subtitle: 'Find optimal placements for solar trackers',
    steps: ['Area', 'Settings', 'Results'],

    drawTitle: 'Select the analysis area',
    drawHint: 'Choose a shape and draw the zone where you want to find solar placement candidates.',
    drawModeRect: 'Rectangle',
    drawModeCircle: 'Circle',
    drawModePoly: 'Polygon',
    drawModeFree: 'Freehand',
    drawBtn: 'Start drawing',
    redrawBtn: 'Redraw area',
    clearBtn: 'Clear',
    continueBtn: 'Configure settings',
    cancelBtn: 'Cancel',
    drawingActive: 'Drawing active',
    drawingEsc: 'Press Esc to cancel',

    settingsTitle: 'Configure and run analysis',
    panelTypeLabel: 'Installation type',
    panelFlower: 'Solar Flower',
    panelGround: 'Ground-Mounted',
    panelRooftop: 'Rooftop',
    targetLabel: 'Optimization target',
    targetAnnual: 'Max annual yield',
    targetWinter: 'Max winter yield',
    targetBalanced: 'Balanced',
    countLabel: 'Number of candidates',
    areaLabel: 'Selected area',
    runBtn: 'Run analysis',
    runningBtn: 'Analyzing…',
    backBtn: 'Change area',

    resultsTitle: 'Analysis complete',
    foundLabel: (n) => `${n} candidate${n === 1 ? '' : 's'} found`,
    resultsHint: 'Click any marker on the map to inspect a candidate.',
    noResults: 'No candidates found. Try a larger area or different settings.',
    rerunBtn: 'Re-run',
    newAreaBtn: 'New area',
    scoreLabel: 'Score',
    kwhLabel: 'Est. kWh/yr',
    annualFactor: 'Annual irradiance',
    winterFactor: 'Winter irradiance',
    shadingFactor: 'Shading risk',
    slopeLabel: 'Slope',
    accessLabel: 'Access',
  },
  ru: {
    tag: 'Сценарий 04',
    title: 'Солнечные цветы',
    subtitle: 'Поиск оптимальных мест для солнечных трекеров',
    steps: ['Область', 'Настройки', 'Результаты'],

    drawTitle: 'Выберите область анализа',
    drawHint: 'Выберите форму и нарисуйте зону для поиска мест установки.',
    drawModeRect: 'Прямоугольник',
    drawModeCircle: 'Круг',
    drawModePoly: 'Полигон',
    drawModeFree: 'Свободно',
    drawBtn: 'Начать рисование',
    redrawBtn: 'Перерисовать',
    clearBtn: 'Очистить',
    continueBtn: 'К настройкам',
    cancelBtn: 'Отмена',
    drawingActive: 'Рисование активно',
    drawingEsc: 'Esc для отмены',

    settingsTitle: 'Настройте и запустите анализ',
    panelTypeLabel: 'Тип установки',
    panelFlower: 'Солнечный цветок',
    panelGround: 'Наземная',
    panelRooftop: 'Кровельная',
    targetLabel: 'Цель оптимизации',
    targetAnnual: 'Макс. годовая выработка',
    targetWinter: 'Макс. зимняя выработка',
    targetBalanced: 'Баланс',
    countLabel: 'Количество точек',
    areaLabel: 'Площадь',
    runBtn: 'Запустить анализ',
    runningBtn: 'Анализ…',
    backBtn: 'Изменить область',

    resultsTitle: 'Анализ завершён',
    foundLabel: (n) => `Найдено точек: ${n}`,
    resultsHint: 'Нажмите на маркер на карте для просмотра деталей.',
    noResults: 'Точки не найдены. Увеличьте область или измените настройки.',
    rerunBtn: 'Пересчитать',
    newAreaBtn: 'Новая область',
    scoreLabel: 'Балл',
    kwhLabel: 'кВт·ч/год (ест.)',
    annualFactor: 'Год. инсоляция',
    winterFactor: 'Зим. инсоляция',
    shadingFactor: 'Риск затенения',
    slopeLabel: 'Рельеф',
    accessLabel: 'Доступность',
  },
  kk: {
    tag: 'Сценарий 04',
    title: 'Күн гүлдері',
    subtitle: 'Күн трекерлері үшін оңтайлы орындарды табу',
    steps: ['Аймақ', 'Параметрлер', 'Нәтижелер'],

    drawTitle: 'Талдау аймағын таңдаңыз',
    drawHint: 'Пішінді таңдап, орналасу нүктелерін іздейтін аймақты сызыңыз.',
    drawModeRect: 'Тіктөртбұрыш',
    drawModeCircle: 'Шеңбер',
    drawModePoly: 'Көпбұрыш',
    drawModeFree: 'Еркін',
    drawBtn: 'Сызуды бастау',
    redrawBtn: 'Қайта сызу',
    clearBtn: 'Тазалау',
    continueBtn: 'Параметрлерге',
    cancelBtn: 'Болдырмау',
    drawingActive: 'Сызу белсенді',
    drawingEsc: 'Esc — болдырмау',

    settingsTitle: 'Параметрлерді баптап, талдауды іске қосыңыз',
    panelTypeLabel: 'Орнату түрі',
    panelFlower: 'Күн гүлі',
    panelGround: 'Жерге орнату',
    panelRooftop: 'Шатырға орнату',
    targetLabel: 'Оңтайландыру мақсаты',
    targetAnnual: 'Жылдық өнімділікті арттыру',
    targetWinter: 'Қысқы өнімділікті арттыру',
    targetBalanced: 'Теңгерімді',
    countLabel: 'Нүктелер саны',
    areaLabel: 'Аудан',
    runBtn: 'Талдауды іске қосу',
    runningBtn: 'Талдануда…',
    backBtn: 'Аймақты өзгерту',

    resultsTitle: 'Талдау аяқталды',
    foundLabel: (n) => `Нүктелер табылды: ${n}`,
    resultsHint: 'Карта маркерін басып, мәліметтерді қараңыз.',
    noResults: 'Нүктелер табылмады. Аймақты үлкейтіп немесе параметрлерді өзгертіп көріңіз.',
    rerunBtn: 'Қайта есептеу',
    newAreaBtn: 'Жаңа аймақ',
    scoreLabel: 'Балл',
    kwhLabel: 'кВт·сағ/жыл (бол.)',
    annualFactor: 'Жылд. инсоляция',
    winterFactor: 'Қысқы инсоляция',
    shadingFactor: 'Көлеңке қаупі',
    slopeLabel: 'Бедер',
    accessLabel: 'Қолжетімділік',
  },
};

// ─── Shared sub-components ────────────────────────────────────────────────────

const ORANGE = '#fb923c';
const ACCENT_BG = 'rgba(251,146,60,0.09)';
const ACCENT_BORDER = 'rgba(251,146,60,0.18)';
const PANEL_BG = 'rgba(6,8,15,0.93)';
const DARK_CARD = 'rgba(255,255,255,0.04)';
const DARK_CARD_BORDER = 'rgba(255,255,255,0.08)';

function FactorBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] text-white/40">{label}</span>
        <span className="text-[11px] text-white/55 tabular-nums">{value}</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, background: `linear-gradient(90deg, #c2620a, ${ORANGE})` }}
        />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

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
  const copy = COPY[language] ?? COPY.en;

  const stepIndex = step === 'shape' || step === 'drawing' ? 0 : step === 'settings' ? 1 : 2;

  const drawShapes: Array<{ mode: SolarDrawMode; label: string; Icon: typeof Square }> = [
    { mode: 'rectangle', label: copy.drawModeRect, Icon: Square },
    { mode: 'circle', label: copy.drawModeCircle, Icon: Circle },
    { mode: 'polygon', label: copy.drawModePoly, Icon: Hexagon },
    { mode: 'freehand', label: copy.drawModeFree, Icon: Pencil },
  ];

  const panelTypes: Array<{ value: SolarPanelType; label: string }> = [
    { value: 'solar_flower', label: copy.panelFlower },
    { value: 'ground_mounted', label: copy.panelGround },
    { value: 'rooftop', label: copy.panelRooftop },
  ];

  const targets: Array<{ value: SolarOptimizationTarget; label: string; Icon: typeof Sun }> = [
    { value: 'max_annual', label: copy.targetAnnual, Icon: Sun },
    { value: 'max_winter', label: copy.targetWinter, Icon: Snowflake },
    { value: 'balanced', label: copy.targetBalanced, Icon: BarChart3 },
  ];

  const chipBase = 'flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium cursor-pointer transition-all duration-150 border select-none';
  const chipActive = 'text-white border-[rgba(251,146,60,0.5)] bg-[rgba(251,146,60,0.14)]';
  const chipIdle = 'text-white/40 border-[rgba(255,255,255,0.07)] bg-transparent hover:border-[rgba(255,255,255,0.14)] hover:text-white/60';

  return (
    <aside
      className="absolute right-4 top-[4.5rem] z-[1100] w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden md:top-4"
      style={{ background: PANEL_BG, backdropFilter: 'blur(22px)', border: `1px solid ${ACCENT_BORDER}` }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="relative px-5 pt-5 pb-4"
        style={{ background: 'linear-gradient(135deg, rgba(251,146,60,0.07), transparent 60%)' }}
      >
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute -top-8 -right-8 w-40 h-40 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(251,146,60,0.18), transparent 70%)' }}
        />

        <div className="relative flex items-start justify-between gap-3">
          <div>
            <span className="font-mono text-[10px] text-white/25 uppercase tracking-[0.12em]">
              {copy.tag}
            </span>
            <h2 className="font-display text-[1.25rem] font-bold text-white tracking-[-0.04em] mt-0.5 leading-none">
              {copy.title}
            </h2>
            <p className="text-[11px] text-white/35 mt-1.5 leading-snug">{copy.subtitle}</p>
          </div>
          <div
            className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: ACCENT_BG, border: `1px solid ${ACCENT_BORDER}` }}
          >
            <Flower2 className="h-5 w-5" style={{ color: ORANGE }} />
          </div>
        </div>

        {/* Step bar */}
        <div className="mt-4 flex gap-1.5 items-center">
          {copy.steps.map((label, i) => (
            <div key={i} className="flex-1 flex flex-col gap-1">
              <div
                className="h-0.5 rounded-full transition-all duration-500"
                style={{ background: i <= stepIndex ? ORANGE : 'rgba(255,255,255,0.1)' }}
              />
              <span
                className="text-[10px] font-mono transition-colors duration-300"
                style={{ color: i <= stepIndex ? 'rgba(251,146,60,0.7)' : 'rgba(255,255,255,0.2)' }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="px-5 pb-5 space-y-3 max-h-[calc(100vh-14rem)] overflow-y-auto">

        {/* ── Step 1: Shape & Draw ── */}
        {(step === 'shape' || step === 'drawing') && (
          <div
            className="rounded-xl p-4 space-y-3"
            style={{ background: DARK_CARD, border: `1px solid ${DARK_CARD_BORDER}` }}
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" style={{ color: ORANGE }} />
              <span className="text-sm font-semibold text-white">{copy.drawTitle}</span>
            </div>
            <p className="text-[12px] text-white/40 leading-snug">{copy.drawHint}</p>

            {/* Shape selector */}
            <div className="grid grid-cols-2 gap-1.5">
              {drawShapes.map(({ mode, label, Icon }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onDrawModeChange(mode)}
                  className={cn(chipBase, drawMode === mode ? chipActive : chipIdle)}
                >
                  <Icon className="h-3 w-3 flex-shrink-0" />
                  {label}
                </button>
              ))}
            </div>

            {/* Area display */}
            {areaKm2 != null && (
              <div
                className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{ background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.14)' }}
              >
                <span className="text-[11px] text-white/40">{copy.areaLabel}</span>
                <span className="font-mono text-[11px]" style={{ color: ORANGE }}>
                  {areaKm2.toFixed(3)} km²
                </span>
              </div>
            )}

            {/* Drawing active indicator */}
            {(step === 'drawing' || drawingInProgress) && (
              <div
                className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{ background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.14)' }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-1.5 w-1.5 rounded-full animate-pulse"
                    style={{ background: ORANGE }}
                  />
                  <span className="text-[11px]" style={{ color: ORANGE }}>{copy.drawingActive}</span>
                </div>
                <span className="text-[10px] text-white/25">{copy.drawingEsc}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={step === 'drawing' ? onCancelDrawing : onStartDrawing}
                className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-all duration-150"
                style={{ background: step === 'drawing' ? 'rgba(255,255,255,0.06)' : ORANGE, border: `1px solid ${step === 'drawing' ? 'rgba(255,255,255,0.1)' : 'transparent'}` }}
              >
                {step === 'drawing'
                  ? copy.cancelBtn
                  : hasArea
                  ? copy.redrawBtn
                  : copy.drawBtn}
              </button>
              <button
                type="button"
                onClick={onClearArea}
                disabled={!hasArea && step !== 'drawing'}
                className="flex items-center justify-center rounded-lg px-3 py-2 text-xs font-medium text-white/40 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {copy.clearBtn}
              </button>
            </div>

            {step !== 'drawing' && (
              <button
                type="button"
                onClick={onContinueToSettings}
                disabled={!hasArea}
                className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  color: hasArea ? ORANGE : 'rgba(255,255,255,0.3)',
                  border: `1px solid ${hasArea ? ACCENT_BORDER : 'rgba(255,255,255,0.07)'}`,
                  background: hasArea ? ACCENT_BG : 'transparent',
                }}
              >
                <SlidersHorizontal className="h-3 w-3" />
                {copy.continueBtn}
              </button>
            )}
          </div>
        )}

        {/* ── Step 2: Settings ── */}
        {step === 'settings' && (
          <div
            className="rounded-xl p-4 space-y-4"
            style={{ background: DARK_CARD, border: `1px solid ${DARK_CARD_BORDER}` }}
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-3.5 w-3.5 flex-shrink-0" style={{ color: ORANGE }} />
              <span className="text-sm font-semibold text-white">{copy.settingsTitle}</span>
            </div>

            {/* Area display */}
            {areaKm2 != null && (
              <div
                className="flex items-center justify-between rounded-lg px-3 py-1.5"
                style={{ background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.12)' }}
              >
                <span className="text-[11px] text-white/40">{copy.areaLabel}</span>
                <span className="font-mono text-[11px]" style={{ color: ORANGE }}>
                  {areaKm2.toFixed(3)} km²
                </span>
              </div>
            )}

            {/* Panel type */}
            <div>
              <span className="text-[11px] text-white/40 uppercase tracking-wide">{copy.panelTypeLabel}</span>
              <div className="mt-2 flex flex-col gap-1.5">
                {panelTypes.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onPanelTypeChange(value)}
                    className={cn(chipBase, 'w-full justify-start', panelType === value ? chipActive : chipIdle)}
                  >
                    {value === 'solar_flower' && <Flower2 className="h-3 w-3 flex-shrink-0" />}
                    {value === 'ground_mounted' && <Zap className="h-3 w-3 flex-shrink-0" />}
                    {value === 'rooftop' && <Sparkles className="h-3 w-3 flex-shrink-0" />}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Optimization target */}
            <div>
              <span className="text-[11px] text-white/40 uppercase tracking-wide">{copy.targetLabel}</span>
              <div className="mt-2 flex flex-col gap-1.5">
                {targets.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onTargetChange(value)}
                    className={cn(chipBase, 'w-full justify-start', target === value ? chipActive : chipIdle)}
                  >
                    <Icon className="h-3 w-3 flex-shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Count */}
            <div>
              <span className="text-[11px] text-white/40 uppercase tracking-wide">{copy.countLabel}</span>
              <div className="mt-2 flex gap-1.5 flex-wrap">
                {[10, 20, 35, 50].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onTopKChange(n)}
                    className={cn(chipBase, topK === n ? chipActive : chipIdle)}
                    style={{ minWidth: '3rem' } as CSSProperties}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="rounded-lg px-3 py-2 text-xs leading-snug"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}
              >
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={onRunRanking}
                disabled={loading || !hasArea}
                className="flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold text-white transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: loading ? 'rgba(251,146,60,0.5)' : ORANGE }}
              >
                {loading && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                {loading ? copy.runningBtn : copy.runBtn}
              </button>
              <button
                type="button"
                onClick={onBackToShape}
                className="flex items-center justify-center rounded-lg px-3 py-2.5 text-xs font-medium text-white/40 transition-all duration-150"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {copy.backBtn}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Results ── */}
        {step === 'results' && (
          <div className="space-y-3">
            <div
              className="rounded-xl p-4 space-y-2"
              style={{ background: DARK_CARD, border: `1px solid ${DARK_CARD_BORDER}` }}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 flex-shrink-0" style={{ color: ORANGE }} />
                <span className="text-sm font-semibold text-white">{copy.resultsTitle}</span>
              </div>

              {candidates.length > 0 ? (
                <>
                  <div
                    className="flex items-center gap-2 rounded-lg px-3 py-1.5"
                    style={{ background: ACCENT_BG, border: `1px solid ${ACCENT_BORDER}` }}
                  >
                    <span className="font-mono text-[11px]" style={{ color: ORANGE }}>
                      {copy.foundLabel(candidates.length)}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/35 leading-snug">{copy.resultsHint}</p>

                  {/* Top 3 summary */}
                  <div className="space-y-1.5 pt-1">
                    {candidates.slice(0, 3).map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between rounded-lg px-3 py-2"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="font-mono text-[10px] flex-shrink-0"
                            style={{ color: ORANGE }}
                          >
                            #{c.rank}
                          </span>
                          <div>
                            <div className="text-[11px] text-white/70 font-medium">
                              {copy.scoreLabel} {c.score}
                            </div>
                            <div className="text-[10px] text-white/30">{c.kwhPerYearEst} {copy.kwhLabel}</div>
                          </div>
                        </div>
                        <div
                          className="h-6 w-6 rounded-full"
                          style={{ background: `conic-gradient(${ORANGE} ${c.score}%, rgba(255,255,255,0.05) 0)` }}
                        />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-[12px] text-white/40 leading-snug">{copy.noResults}</p>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={onRunRanking}
                  className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-all duration-150"
                  style={{ background: ORANGE }}
                >
                  {copy.rerunBtn}
                </button>
                <button
                  type="button"
                  onClick={onBackToShape}
                  className="flex items-center justify-center rounded-lg px-3 py-2 text-xs font-medium text-white/40 transition-all duration-150"
                  style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {copy.newAreaBtn}
                </button>
              </div>
            </div>

            {/* Selected candidate detail */}
            {selectedCandidate && (
              <div
                className="rounded-xl p-4 space-y-3"
                style={{ background: DARK_CARD, border: `1px solid ${ACCENT_BORDER}` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[10px] text-white/30">Candidate #{selectedCandidate.rank}</span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-xl font-bold text-white">{selectedCandidate.score}</span>
                      <span className="text-xs text-white/35">{copy.scoreLabel.toLowerCase()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-white/30">{copy.kwhLabel}</div>
                    <div className="font-mono text-sm" style={{ color: ORANGE }}>
                      {selectedCandidate.kwhPerYearEst.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <FactorBar label={copy.annualFactor} value={selectedCandidate.factors.annual_irradiance} />
                  <FactorBar label={copy.winterFactor} value={selectedCandidate.factors.winter_irradiance} />
                  <FactorBar label={copy.shadingFactor} value={selectedCandidate.factors.shading_risk} />
                  <FactorBar label={copy.slopeLabel} value={selectedCandidate.factors.slope_suitability} />
                  <FactorBar label={copy.accessLabel} value={selectedCandidate.factors.access_score} />
                </div>

                <button
                  type="button"
                  onClick={onCloseCandidate}
                  className="w-full text-center text-[11px] text-white/25 hover:text-white/45 transition-colors py-1"
                >
                  ✕ close
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
