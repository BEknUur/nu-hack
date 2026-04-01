import type { CSSProperties } from 'react';
import { LoaderCircle, Sprout, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import type { SolarProfile } from '@/types/solar-flowers';
import type { TreeDrawMode } from '@/types/tree-optimizer';

export type SolarWizardStep = 'shape' | 'drawing' | 'settings' | 'results' | 'mission';

interface SolarFlowersWizardProps {
  step: SolarWizardStep;
  drawMode: TreeDrawMode;
  drawingInProgress: boolean;
  hasArea: boolean;
  areaKm2: number | null;
  profile: SolarProfile;
  dateStr: string;
  topK: number;
  loading: boolean;
  error: string | null;
  resultCount: number;
  missionScore: number;
  missionCombo: number;
  missionPicksCount: number;
  missionTarget: number;
  onDrawModeChange: (mode: TreeDrawMode) => void;
  onStartDrawing: () => void;
  onCancelDrawing: () => void;
  onContinueToSettings: () => void;
  onClearArea: () => void;
  onProfileChange: (profile: SolarProfile) => void;
  onDateChange: (value: string) => void;
  onTopKChange: (value: number) => void;
  onRunRanking: () => void;
  onStartMission: () => void;
  onBackToShape: () => void;
  onBackToSettings: () => void;
  onResetMission: () => void;
}

interface WizardCopy {
  panelTag: string;
  title: string;
  stepShape: string;
  stepDrawing: string;
  stepSettings: string;
  stepResults: string;
  stepMission: string;
  drawModeLabel: string;
  drawRectangle: string;
  drawCircle: string;
  drawPolygon: string;
  drawFreehand: string;
  drawAction: string;
  redrawAction: string;
  continueAction: string;
  clearAction: string;
  drawingHint: string;
  drawingSubHint: string;
  drawingActive: string;
  cancelDrawing: string;
  settingsTitle: string;
  areaLabel: string;
  profileLabel: string;
  dateLabel: string;
  profileFullSun: string;
  profilePartialShade: string;
  profileSolar: string;
  topN: string;
  run: string;
  running: string;
  backToShape: string;
  resultsTitle: string;
  resultCount: (count: number) => string;
  resultsHint: string;
  noResults: string;
  startMission: string;
  missionTitle: string;
  missionProgress: (picks: number, total: number) => string;
  missionScore: (score: number) => string;
  missionCombo: (combo: number) => string;
  missionHint: string;
  resetMission: string;
  rerun: string;
}

const WIZARD_COPY: Record<'ru' | 'kk' | 'en', WizardCopy> = {
  ru: {
    panelTag: 'Сценарий',
    title: 'Солнце и цветы',
    stepShape: 'Шаг 1 из 4 · Выбор области',
    stepDrawing: 'Шаг 1 из 4 · Рисование на карте',
    stepSettings: 'Шаг 2 из 4 · Настройка профиля',
    stepResults: 'Шаг 3 из 4 · Рекомендации',
    stepMission: 'Шаг 4 из 4 · Игровой режим',
    drawModeLabel: 'Фигура выделения',
    drawRectangle: 'Прямоугольник',
    drawCircle: 'Круг',
    drawPolygon: 'Полигон',
    drawFreehand: 'Свободно',
    drawAction: 'Начать рисование',
    redrawAction: 'Перерисовать область',
    continueAction: 'К настройке профиля',
    clearAction: 'Очистить',
    drawingHint: 'Выделите область мышью на карте.',
    drawingSubHint: 'Esc отменяет текущее рисование.',
    drawingActive: 'Рисование активно',
    cancelDrawing: 'Отмена',
    settingsTitle: 'Выберите профиль освещенности и запустите подбор точек',
    areaLabel: 'Площадь',
    profileLabel: 'Профиль',
    dateLabel: 'Дата',
    profileFullSun: 'Цветы: полное солнце',
    profilePartialShade: 'Цветы: полутень',
    profileSolar: 'Солнечные панели',
    topN: 'Количество точек',
    run: 'Найти лучшие точки',
    running: 'Ищу точки...',
    backToShape: 'Изменить область',
    resultsTitle: 'Рейтинг готов',
    resultCount: (count) => `Найдено точек: ${count}`,
    resultsHint: 'Нажмите на точку, чтобы открыть карточку и выбрать в миссию.',
    noResults: 'По выбранным параметрам подходящие точки не найдены.',
    startMission: 'Запустить миссию',
    missionTitle: 'Миссия: выберите 3 лучшие точки',
    missionProgress: (picks, total) => `Прогресс: ${picks}/${total}`,
    missionScore: (score) => `Счет: ${score}`,
    missionCombo: (combo) => `Комбо x${combo}`,
    missionHint: 'Выбирайте точки с высоким рейтингом подряд для комбо-бонуса.',
    resetMission: 'Сбросить миссию',
    rerun: 'Пересчитать',
  },
  kk: {
    panelTag: 'Сценарий',
    title: 'Күн және гүлдер',
    stepShape: '1 / 4-қадам · Аймақ таңдау',
    stepDrawing: '1 / 4-қадам · Картада сызу',
    stepSettings: '2 / 4-қадам · Профиль баптауы',
    stepResults: '3 / 4-қадам · Ұсыныстар',
    stepMission: '4 / 4-қадам · Ойын режимі',
    drawModeLabel: 'Аймақ пішіні',
    drawRectangle: 'Тіктөртбұрыш',
    drawCircle: 'Шеңбер',
    drawPolygon: 'Көпбұрыш',
    drawFreehand: 'Еркін',
    drawAction: 'Сызуды бастау',
    redrawAction: 'Аймақты қайта сызу',
    continueAction: 'Профильге өту',
    clearAction: 'Тазалау',
    drawingHint: 'Картада аймақты тінтуірмен сызыңыз.',
    drawingSubHint: 'Esc ағымдағы сызуды тоқтатады.',
    drawingActive: 'Сызу белсенді',
    cancelDrawing: 'Болдырмау',
    settingsTitle: 'Жарық профилін таңдап, нүктелерді есептеңіз',
    areaLabel: 'Аудан',
    profileLabel: 'Профиль',
    dateLabel: 'Күн',
    profileFullSun: 'Гүл: толық күн',
    profilePartialShade: 'Гүл: жартылай көлеңке',
    profileSolar: 'Күн панельдері',
    topN: 'Нүкте саны',
    run: 'Үздік нүктелерді табу',
    running: 'Нүктелер есептелуде...',
    backToShape: 'Аймақты өзгерту',
    resultsTitle: 'Рейтинг дайын',
    resultCount: (count) => `Табылған нүктелер: ${count}`,
    resultsHint: 'Картаның нүктесін басып, миссияға таңдаңыз.',
    noResults: 'Таңдалған параметрлер бойынша лайық нүкте табылмады.',
    startMission: 'Миссияны бастау',
    missionTitle: 'Миссия: ең жақсы 3 нүктені таңдаңыз',
    missionProgress: (picks, total) => `Прогресс: ${picks}/${total}`,
    missionScore: (score) => `Ұпай: ${score}`,
    missionCombo: (combo) => `Комбо x${combo}`,
    missionHint: 'Жоғары баллды нүктелерді қатарынан таңдап, комбо алыңыз.',
    resetMission: 'Миссияны тазалау',
    rerun: 'Қайта есептеу',
  },
  en: {
    panelTag: 'Scenario',
    title: 'Solar and Flowers',
    stepShape: 'Step 1 of 4 · Select area',
    stepDrawing: 'Step 1 of 4 · Draw on map',
    stepSettings: 'Step 2 of 4 · Profile setup',
    stepResults: 'Step 3 of 4 · Recommendations',
    stepMission: 'Step 4 of 4 · Game mode',
    drawModeLabel: 'Selection shape',
    drawRectangle: 'Rectangle',
    drawCircle: 'Circle',
    drawPolygon: 'Polygon',
    drawFreehand: 'Free draw',
    drawAction: 'Start drawing',
    redrawAction: 'Redraw area',
    continueAction: 'Continue to profile',
    clearAction: 'Clear',
    drawingHint: 'Draw the target zone directly on the map.',
    drawingSubHint: 'Press Esc to cancel current drawing.',
    drawingActive: 'Drawing active',
    cancelDrawing: 'Cancel',
    settingsTitle: 'Choose a light profile and run point ranking',
    areaLabel: 'Area',
    profileLabel: 'Profile',
    dateLabel: 'Date',
    profileFullSun: 'Flowers: full sun',
    profilePartialShade: 'Flowers: partial shade',
    profileSolar: 'Solar panels',
    topN: 'Number of spots',
    run: 'Find best spots',
    running: 'Ranking spots...',
    backToShape: 'Change area',
    resultsTitle: 'Ranking complete',
    resultCount: (count) => `Spots found: ${count}`,
    resultsHint: 'Click map points to open cards and select mission picks.',
    noResults: 'No suitable points found for the current parameters.',
    startMission: 'Start mission',
    missionTitle: 'Mission: pick the best 3 spots',
    missionProgress: (picks, total) => `Progress: ${picks}/${total}`,
    missionScore: (score) => `Score: ${score}`,
    missionCombo: (combo) => `Combo x${combo}`,
    missionHint: 'Chain high-score picks for combo bonuses.',
    resetMission: 'Reset mission',
    rerun: 'Re-run ranking',
  },
};

export default function SolarFlowersWizard({
  step,
  drawMode,
  drawingInProgress,
  hasArea,
  areaKm2,
  profile,
  dateStr,
  topK,
  loading,
  error,
  resultCount,
  missionScore,
  missionCombo,
  missionPicksCount,
  missionTarget,
  onDrawModeChange,
  onStartDrawing,
  onCancelDrawing,
  onContinueToSettings,
  onClearArea,
  onProfileChange,
  onDateChange,
  onTopKChange,
  onRunRanking,
  onStartMission,
  onBackToShape,
  onBackToSettings,
  onResetMission,
}: SolarFlowersWizardProps) {
  const { language } = useTranslation();
  const copy = WIZARD_COPY[language];

  const drawModes: Array<{ mode: TreeDrawMode; label: string }> = [
    { mode: 'rectangle', label: copy.drawRectangle },
    { mode: 'circle', label: copy.drawCircle },
    { mode: 'polygon', label: copy.drawPolygon },
    { mode: 'freehand', label: copy.drawFreehand },
  ];

  const profiles: Array<{ id: SolarProfile; label: string }> = [
    { id: 'flower_full_sun', label: copy.profileFullSun },
    { id: 'flower_partial_shade', label: copy.profilePartialShade },
    { id: 'solar_panel', label: copy.profileSolar },
  ];

  return (
    <aside
      data-solar-wizard-panel="true"
      className="absolute left-4 top-4 z-[1100] w-[360px] max-w-[calc(100vw-1.5rem)] text-[var(--ink)]"
    >
      <div className="map-panel rounded-2xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="ui-mono text-[11px] text-[var(--ink-soft)]">{copy.panelTag}</div>
            <div className="mt-1 text-xl font-semibold tracking-[-0.04em]">{copy.title}</div>
          </div>
          <div className="map-chip flex h-10 w-10 items-center justify-center rounded-lg">
            <Sun className="h-4 w-4 text-[var(--yellow-strong)]" />
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-[color:var(--line)] bg-white/80 px-3 py-2 text-sm text-[var(--ink-soft)]">
          {step === 'shape' && copy.stepShape}
          {step === 'drawing' && copy.stepDrawing}
          {step === 'settings' && copy.stepSettings}
          {step === 'results' && copy.stepResults}
          {step === 'mission' && copy.stepMission}
        </div>

        {step === 'shape' && (
          <div className="mt-3 space-y-3">
            <div>
              <div className="text-sm text-[var(--ink-soft)]">{copy.drawModeLabel}</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {drawModes.map((item) => (
                  <button
                    key={item.mode}
                    type="button"
                    onClick={() => onDrawModeChange(item.mode)}
                    className={cn('map-segment rounded-lg px-3 py-2 text-sm font-medium', drawMode === item.mode && 'is-active')}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={onStartDrawing}
              className="inline-flex w-full items-center justify-center rounded-lg border border-[color:var(--blue-strong)] bg-[var(--blue-strong)] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--blue)]"
            >
              {hasArea ? copy.redrawAction : copy.drawAction}
            </button>

            {hasArea && areaKm2 !== null && (
              <div className="rounded-lg border border-[color:var(--line)] bg-white/80 p-3 text-sm text-[var(--ink)]">
                {copy.areaLabel}: {areaKm2.toFixed(2)} km2
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onContinueToSettings}
                disabled={!hasArea}
                className="inline-flex items-center justify-center rounded-lg border border-[color:var(--line)] bg-white/80 px-3 py-2 text-sm font-medium text-[var(--ink)] transition-colors enabled:hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {copy.continueAction}
              </button>
              <button
                type="button"
                onClick={onClearArea}
                className="inline-flex items-center justify-center rounded-lg border border-[color:var(--line)] bg-white/80 px-3 py-2 text-sm font-medium text-[var(--ink)] transition-colors hover:bg-white"
              >
                {copy.clearAction}
              </button>
            </div>
          </div>
        )}

        {step === 'drawing' && (
          <div className="mt-3 rounded-lg border border-[color:var(--line)] bg-white/80 p-3 text-sm text-[var(--ink)]">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--ink-soft)]">
              <span className="h-2 w-2 rounded-full bg-[var(--yellow)]" />
              {copy.drawingActive}
            </div>
            <p className="mt-3">{copy.drawingHint}</p>
            <p className="mt-2 text-[var(--ink-soft)]">{copy.drawingSubHint}</p>
            <button
              type="button"
              onClick={onCancelDrawing}
              className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-[color:var(--line)] bg-white px-3 py-2 text-sm font-medium text-[var(--ink)] transition-colors hover:bg-[var(--surface)]"
            >
              {copy.cancelDrawing}
            </button>
          </div>
        )}

        {step === 'settings' && (
          <div className="mt-3 space-y-3">
            <p className="text-sm leading-6 text-[var(--ink-soft)]">{copy.settingsTitle}</p>
            {areaKm2 !== null && (
              <div className="rounded-lg border border-[color:var(--line)] bg-white/80 px-3 py-2 text-sm text-[var(--ink)]">
                {copy.areaLabel}: {areaKm2.toFixed(2)} km2
              </div>
            )}
            <div>
              <div className="mb-2 text-sm text-[var(--ink-soft)]">{copy.dateLabel}</div>
              <input
                type="date"
                value={dateStr}
                onChange={(event) => onDateChange(event.target.value)}
                className="map-input date-picker w-full rounded-lg px-3 py-2.5 text-sm text-[var(--ink)]"
              />
            </div>

            <div>
              <div className="text-sm text-[var(--ink-soft)]">{copy.profileLabel}</div>
              <div className="mt-2 space-y-2">
                {profiles.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onProfileChange(item.id)}
                    className={cn('map-segment w-full rounded-lg px-3 py-2 text-left text-sm font-medium', profile === item.id && 'is-active')}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm text-[var(--ink-soft)]">{copy.topN}: {topK}</div>
              <input
                type="range"
                min={5}
                max={60}
                step={1}
                value={topK}
                onChange={(event) => onTopKChange(Number(event.target.value))}
                className="time-slider"
                style={{ '--pct': `${((topK - 5) / 55) * 100}%` } as CSSProperties}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onBackToShape}
                className="inline-flex items-center justify-center rounded-lg border border-[color:var(--line)] bg-white/80 px-3 py-2 text-sm font-medium text-[var(--ink)] transition-colors hover:bg-white"
              >
                {copy.backToShape}
              </button>
              <button
                type="button"
                onClick={onRunRanking}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[color:var(--blue-strong)] bg-[var(--blue-strong)] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--blue)]"
              >
                {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sprout className="h-4 w-4" />}
                {loading ? copy.running : copy.run}
              </button>
            </div>
          </div>
        )}

        {step === 'results' && (
          <div className="mt-3 space-y-3">
            <div className="rounded-lg border border-[color:var(--line)] bg-white/80 p-3 text-sm text-[var(--ink)]">
              <div className="font-medium">{copy.resultsTitle}</div>
              <div className="mt-1 text-[var(--ink-soft)]">{copy.resultCount(resultCount)}</div>
              <p className="mt-2 text-[var(--ink-soft)]">{resultCount > 0 ? copy.resultsHint : copy.noResults}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onBackToSettings}
                className="inline-flex items-center justify-center rounded-lg border border-[color:var(--line)] bg-white/80 px-3 py-2 text-sm font-medium text-[var(--ink)] transition-colors hover:bg-white"
              >
                {copy.rerun}
              </button>
              <button
                type="button"
                disabled={resultCount === 0}
                onClick={onStartMission}
                className="inline-flex items-center justify-center rounded-lg border border-[color:var(--yellow-strong)] bg-[var(--yellow)] px-3 py-2 text-sm font-medium text-[#3b2a06] transition-colors enabled:hover:bg-[#f4cc60] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {copy.startMission}
              </button>
            </div>
          </div>
        )}

        {step === 'mission' && (
          <div className="mt-3 space-y-3">
            <div className="rounded-lg border border-[color:var(--line)] bg-white/80 p-3 text-sm text-[var(--ink)]">
              <div className="font-medium">{copy.missionTitle}</div>
              <div className="mt-2 text-[var(--ink-soft)]">{copy.missionProgress(missionPicksCount, missionTarget)}</div>
              <div className="mt-1 text-[var(--ink-soft)]">{copy.missionScore(missionScore)}</div>
              <div className="mt-1 text-[var(--ink-soft)]">{copy.missionCombo(missionCombo)}</div>
              <p className="mt-2 text-[var(--ink-soft)]">{copy.missionHint}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onResetMission}
                className="inline-flex items-center justify-center rounded-lg border border-[color:var(--line)] bg-white/80 px-3 py-2 text-sm font-medium text-[var(--ink)] transition-colors hover:bg-white"
              >
                {copy.resetMission}
              </button>
              <button
                type="button"
                onClick={onBackToSettings}
                className="inline-flex items-center justify-center rounded-lg border border-[color:var(--line)] bg-white/80 px-3 py-2 text-sm font-medium text-[var(--ink)] transition-colors hover:bg-white"
              >
                {copy.rerun}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-lg border border-[rgba(153,27,27,0.24)] bg-[rgba(254,226,226,0.62)] px-3 py-2 text-sm text-[#991b1b]">
            {error}
          </div>
        )}

        {drawingInProgress && step !== 'drawing' && (
          <div className="mt-3 text-xs text-[var(--ink-soft)]">{copy.drawingActive}</div>
        )}
      </div>
    </aside>
  );
}
