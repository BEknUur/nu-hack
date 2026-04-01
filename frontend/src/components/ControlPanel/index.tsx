import type { CSSProperties, ReactNode } from 'react';
import { CalendarDays, Cuboid, Layers3, LoaderCircle, Sprout, SunMedium } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import type { TreeDrawMode } from '@/types/tree-optimizer';

interface TreeOptimizerControls {
  enabled: boolean;
  drawMode: TreeDrawMode;
  hasArea: boolean;
  areaKm2: number | null;
  drawingArmed: boolean;
  drawingInProgress: boolean;
  summerWeight: number;
  topK: number;
  minWinterLight: number;
  resultsCount: number;
  loading: boolean;
  error: string | null;
  onDrawModeChange: (mode: TreeDrawMode) => void;
  onStartDraw: () => void;
  onClearArea: () => void;
  onSummerWeightChange: (value: number) => void;
  onTopKChange: (value: number) => void;
  onMinWinterLightChange: (value: number) => void;
  onRun: () => void;
}

interface ControlPanelProps {
  dateStr: string;
  onDateChange: (v: string) => void;
  sunExposure: boolean;
  onModeChange: (exposure: boolean) => void;
  is3D?: boolean;
  onViewModeChange?: (enabled: boolean) => void;
  isSatellite?: boolean;
  onBasemapChange?: (satellite: boolean) => void;
  loadingBuildings: boolean;
  treeOptimizer?: TreeOptimizerControls;
}

interface ToggleOption<T extends boolean> {
  label: string;
  value: T;
}

interface TreeCopy {
  panelTag: string;
  panelTitle: string;
  sectionTitle: string;
  intro: string;
  areaStepTitle: string;
  shapeLabel: string;
  drawRectangle: string;
  drawCircle: string;
  drawPolygon: string;
  drawFreehand: string;
  drawAction: string;
  redrawAction: string;
  drawingHint: string;
  clearArea: string;
  areaReady: (km2: string) => string;
  areaMissing: string;
  rankStepTitle: string;
  priority: string;
  seasonShare: (summer: number, winter: number) => string;
  summerHint: string;
  winterHint: string;
  topN: string;
  minWinterLight: string;
  run: string;
  running: string;
  resultCount: (count: number) => string;
  resultHint: string;
  emptyHint: string;
}

const TREE_COPY: Record<'ru' | 'kk' | 'en', TreeCopy> = {
  ru: {
    panelTag: 'Сценарий',
    panelTitle: 'Посадка деревьев',
    sectionTitle: 'Подбор точек',
    intro: '1) Настройте баланс летней прохлады и зимнего света  2) Нажмите «Подобрать точки».',
    areaStepTitle: 'Шаг 1. Выберите область',
    shapeLabel: 'Фигура выделения',
    drawRectangle: 'Прямоугольник',
    drawCircle: 'Круг',
    drawPolygon: 'Полигон',
    drawFreehand: 'Свободно',
    drawAction: 'Нарисовать область',
    redrawAction: 'Нарисовать заново',
    drawingHint: 'Рисование активно: выделите область на карте.',
    clearArea: 'Очистить область',
    areaReady: (km2) => `Область выбрана: ${km2} км²`,
    areaMissing: 'Сначала выделите область на карте, затем запускайте подбор.',
    rankStepTitle: 'Шаг 2. Запустите подбор точек',
    priority: 'Баланс приоритета',
    seasonShare: (summer, winter) => `Лето ${summer}% · Зима ${winter}%`,
    summerHint: 'Больше прохлады летом',
    winterHint: 'Больше света зимой',
    topN: 'Количество точек',
    minWinterLight: 'Мин. зимний свет',
    run: 'Подобрать точки',
    running: 'Подбираю точки...',
    resultCount: (count) => `Показано точек: ${count}`,
    resultHint: 'Нажмите на точку на карте, чтобы увидеть объяснение и причины выбора.',
    emptyHint: 'Нажмите «Подобрать точки», чтобы получить лучшие варианты в текущей области карты.',
  },
  kk: {
    panelTag: 'Сценарий',
    panelTitle: 'Ағаш отырғызу',
    sectionTitle: 'Нүктелерді таңдау',
    intro: '1) Жазғы салқындық пен қысқы жарық балансын таңдаңыз  2) «Нүктелерді табу» батырмасын басыңыз.',
    areaStepTitle: '1-қадам. Аймақты таңдаңыз',
    shapeLabel: 'Аймақ пішіні',
    drawRectangle: 'Тіктөртбұрыш',
    drawCircle: 'Шеңбер',
    drawPolygon: 'Көпбұрыш',
    drawFreehand: 'Еркін',
    drawAction: 'Аймақты сызу',
    redrawAction: 'Қайта сызу',
    drawingHint: 'Сызу белсенді: картада аймақты белгілеңіз.',
    clearArea: 'Аймақты тазалау',
    areaReady: (km2) => `Аймақ таңдалды: ${km2} км²`,
    areaMissing: 'Алдымен картадан аймақты таңдаңыз, содан кейін есептеуді іске қосыңыз.',
    rankStepTitle: '2-қадам. Нүктелерді есептеу',
    priority: 'Басымдық балансы',
    seasonShare: (summer, winter) => `Жаз ${summer}% · Қыс ${winter}%`,
    summerHint: 'Жазда көбірек салқындық',
    winterHint: 'Қыста көбірек жарық',
    topN: 'Нүкте саны',
    minWinterLight: 'Қысқы жарық мин.',
    run: 'Нүктелерді табу',
    running: 'Нүктелер есептелуде...',
    resultCount: (count) => `Көрсетілген нүкте саны: ${count}`,
    resultHint: 'Таңдалған нүктені басып, түсіндірме мен себептерді көріңіз.',
    emptyHint: 'Ағымдағы карта аумағы үшін үздік нүктелерді алу үшін «Нүктелерді табу» батырмасын басыңыз.',
  },
  en: {
    panelTag: 'Scenario',
    panelTitle: 'Tree Planting',
    sectionTitle: 'Point Ranking',
    intro: '1) Set summer vs winter priority  2) Click “Find best spots”.',
    areaStepTitle: 'Step 1. Select area',
    shapeLabel: 'Selection shape',
    drawRectangle: 'Rectangle',
    drawCircle: 'Circle',
    drawPolygon: 'Polygon',
    drawFreehand: 'Free draw',
    drawAction: 'Draw area',
    redrawAction: 'Redraw area',
    drawingHint: 'Drawing is active: select an area on the map.',
    clearArea: 'Clear area',
    areaReady: (km2) => `Area selected: ${km2} km²`,
    areaMissing: 'Select an area on the map first, then run ranking.',
    rankStepTitle: 'Step 2. Run point ranking',
    priority: 'Priority balance',
    seasonShare: (summer, winter) => `Summer ${summer}% · Winter ${winter}%`,
    summerHint: 'More summer cooling',
    winterHint: 'More winter light',
    topN: 'Number of spots',
    minWinterLight: 'Min winter light',
    run: 'Find best spots',
    running: 'Ranking spots...',
    resultCount: (count) => `Spots shown: ${count}`,
    resultHint: 'Click a map point to view explanation and decision factors.',
    emptyHint: 'Click “Find best spots” to generate recommended points for the current map area.',
  },
};

function ToggleGroup<T extends boolean>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: ToggleOption<T>[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((option) => (
        <button
          key={option.label}
          onClick={() => onChange(option.value)}
          className={cn(
            'map-segment rounded-lg px-3 py-2 text-sm font-medium',
            value === option.value && 'is-active',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function PanelSection({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2.5 border-t border-[color:var(--line)] pt-4 first:border-t-0 first:pt-0">
      <div className="flex items-center gap-2 text-sm font-medium text-[var(--ink)]">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--line)] bg-white/80 text-[var(--blue-strong)]">
          {icon}
        </span>
        <span>{title}</span>
      </div>
      {children}
    </section>
  );
}

export default function ControlPanel({
  dateStr,
  onDateChange,
  sunExposure,
  onModeChange,
  is3D,
  onViewModeChange,
  isSatellite,
  onBasemapChange,
  loadingBuildings,
  treeOptimizer,
}: ControlPanelProps) {
  const { messages, language } = useTranslation();
  const isTreeMode = Boolean(treeOptimizer?.enabled);
  const treeCopy = TREE_COPY[language];
  const summerPct = Math.round((treeOptimizer?.summerWeight ?? 0.55) * 100);
  const winterPct = 100 - summerPct;

  const drawModeOptions: Array<{ mode: TreeDrawMode; label: string }> = [
    { mode: 'rectangle', label: treeCopy.drawRectangle },
    { mode: 'circle', label: treeCopy.drawCircle },
    { mode: 'polygon', label: treeCopy.drawPolygon },
    { mode: 'freehand', label: treeCopy.drawFreehand },
  ];

  return (
    <aside className="map-panel absolute right-4 top-[8.5rem] z-[1000] w-[320px] max-w-[calc(100vw-2rem)] rounded-xl p-4 text-[var(--ink)] md:top-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="ui-mono text-[11px] text-[var(--ink-soft)]">
            {isTreeMode ? treeCopy.panelTag : messages.map.mapControlsTag}
          </div>
          <div className="mt-1 text-xl font-semibold tracking-[-0.04em]">
            {isTreeMode ? treeCopy.panelTitle : messages.map.shadowMapTitle}
          </div>
        </div>

        <div className="map-chip flex min-h-10 min-w-10 items-center justify-center rounded-lg px-3">
          {loadingBuildings ? (
            <LoaderCircle className="h-4 w-4 animate-spin text-[var(--blue-strong)]" />
          ) : (
            <SunMedium className="h-4 w-4 text-[var(--yellow-strong)]" />
          )}
        </div>
      </div>

      <div className="space-y-4">
        {!isTreeMode && (
          <PanelSection icon={<CalendarDays className="h-4 w-4" />} title={messages.map.date}>
            <input
              type="date"
              className="map-input date-picker w-full rounded-lg px-3 py-2.5 text-sm text-[var(--ink)]"
              value={dateStr}
              onChange={(e) => onDateChange(e.target.value)}
            />
          </PanelSection>
        )}

        {!isTreeMode && (
          <PanelSection icon={<SunMedium className="h-4 w-4" />} title={messages.map.analysisMode}>
            <ToggleGroup
              value={sunExposure}
              onChange={onModeChange}
              options={[
                { label: messages.map.shadows, value: false },
                { label: messages.map.exposure, value: true },
              ]}
            />
          </PanelSection>
        )}

        {onViewModeChange && !isTreeMode && (
          <PanelSection icon={<Cuboid className="h-4 w-4" />} title={messages.map.view}>
            <ToggleGroup
              value={Boolean(is3D)}
              onChange={onViewModeChange}
              options={[
                { label: '2D', value: false },
                { label: '3D', value: true },
              ]}
            />
          </PanelSection>
        )}

        {onBasemapChange && !isTreeMode && (
          <PanelSection icon={<Layers3 className="h-4 w-4" />} title={messages.map.baseMap}>
            <ToggleGroup
              value={Boolean(isSatellite)}
              onChange={onBasemapChange}
              options={[
                { label: messages.map.standard, value: false },
                { label: messages.map.satellite, value: true },
              ]}
            />
          </PanelSection>
        )}

        {treeOptimizer?.enabled && (
          <PanelSection icon={<Sprout className="h-4 w-4" />} title={treeCopy.sectionTitle}>
            <div className="space-y-3 rounded-lg border border-[color:var(--line)] bg-white/70 p-3">
              <p className="text-sm leading-6 text-[var(--ink-soft)]">{treeCopy.intro}</p>

              <div className="rounded-lg border border-[color:var(--line)] bg-white/80 p-3">
                <div className="text-sm font-medium text-[var(--ink)]">{treeCopy.areaStepTitle}</div>
                <div className="mt-2 text-sm text-[var(--ink-soft)]">{treeCopy.shapeLabel}</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {drawModeOptions.map((option) => (
                    <button
                      key={option.mode}
                      type="button"
                      onClick={() => treeOptimizer.onDrawModeChange(option.mode)}
                      className={cn(
                        'map-segment rounded-lg px-2.5 py-2 text-sm font-medium',
                        treeOptimizer.drawMode === option.mode && 'is-active',
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={treeOptimizer.onStartDraw}
                    className="inline-flex flex-1 items-center justify-center rounded-lg border border-[color:var(--blue-strong)] bg-[var(--blue-strong)] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--blue)]"
                  >
                    {treeOptimizer.hasArea ? treeCopy.redrawAction : treeCopy.drawAction}
                  </button>
                  <button
                    onClick={treeOptimizer.onClearArea}
                    className="inline-flex items-center justify-center rounded-lg border border-[color:var(--line)] bg-white px-3 py-2 text-sm font-medium text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
                    disabled={!treeOptimizer.hasArea && !treeOptimizer.drawingArmed}
                  >
                    {treeCopy.clearArea}
                  </button>
                </div>

                {(treeOptimizer.drawingArmed || treeOptimizer.drawingInProgress) && (
                  <p className="mt-2 text-sm text-[var(--blue-strong)]">{treeCopy.drawingHint}</p>
                )}

                {treeOptimizer.hasArea && treeOptimizer.areaKm2 !== null ? (
                  <p className="mt-2 text-sm text-[var(--ink)]">
                    {treeCopy.areaReady(treeOptimizer.areaKm2.toFixed(2))}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-[var(--ink-soft)]">{treeCopy.areaMissing}</p>
                )}
              </div>

              <div className="rounded-lg border border-[color:var(--line)] bg-white/80 p-3">
                <div className="text-sm font-medium text-[var(--ink)]">{treeCopy.rankStepTitle}</div>

                <div className="mt-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[var(--ink)]">{treeCopy.priority}</span>
                    <span className="ui-mono text-[11px] text-[var(--ink-soft)]">
                      {treeCopy.seasonShare(summerPct, winterPct)}
                    </span>
                  </div>
                  <input
                    type="range"
                    className="time-slider mt-2"
                    min={0}
                    max={100}
                    step={1}
                    value={summerPct}
                    style={{ '--pct': `${summerPct}%` } as CSSProperties}
                    onChange={(event) => treeOptimizer.onSummerWeightChange(Number(event.target.value) / 100)}
                    disabled={!treeOptimizer.hasArea || treeOptimizer.drawingArmed || treeOptimizer.drawingInProgress}
                  />
                  <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--ink-soft)]">
                    <span>{treeCopy.summerHint}</span>
                    <span>{treeCopy.winterHint}</span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="text-sm text-[var(--ink-soft)]">
                    {treeCopy.topN}
                    <select
                      className="map-input mt-1 w-full rounded-lg px-2 py-1.5 text-sm text-[var(--ink)]"
                      value={treeOptimizer.topK}
                      onChange={(event) => treeOptimizer.onTopKChange(Number(event.target.value))}
                      disabled={!treeOptimizer.hasArea || treeOptimizer.drawingArmed || treeOptimizer.drawingInProgress}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </label>

                  <label className="text-sm text-[var(--ink-soft)]">
                    {treeCopy.minWinterLight}
                    <select
                      className="map-input mt-1 w-full rounded-lg px-2 py-1.5 text-sm text-[var(--ink)]"
                      value={treeOptimizer.minWinterLight}
                      onChange={(event) => treeOptimizer.onMinWinterLightChange(Number(event.target.value))}
                      disabled={!treeOptimizer.hasArea || treeOptimizer.drawingArmed || treeOptimizer.drawingInProgress}
                    >
                      <option value={0.2}>20%</option>
                      <option value={0.3}>30%</option>
                      <option value={0.4}>40%</option>
                      <option value={0.5}>50%</option>
                    </select>
                  </label>
                </div>

                <button
                  onClick={treeOptimizer.onRun}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[color:var(--blue-strong)] bg-[var(--blue-strong)] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--blue)] disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={
                    treeOptimizer.loading
                    || !treeOptimizer.hasArea
                    || treeOptimizer.drawingArmed
                    || treeOptimizer.drawingInProgress
                  }
                >
                  {treeOptimizer.loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  {treeOptimizer.loading ? treeCopy.running : treeCopy.run}
                </button>
              </div>

              {treeOptimizer.error && (
                <p className="text-sm text-[#9c3b2a]">{treeOptimizer.error}</p>
              )}

              {!treeOptimizer.error && treeOptimizer.resultsCount > 0 && (
                <div className="rounded-lg border border-[color:var(--line)] bg-white/80 p-2.5">
                  <p className="text-sm font-medium text-[var(--ink)]">
                    {treeCopy.resultCount(treeOptimizer.resultsCount)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--ink-soft)]">
                    {treeCopy.resultHint}
                  </p>
                </div>
              )}

              {!treeOptimizer.error && treeOptimizer.resultsCount === 0 && !treeOptimizer.loading && (
                <p className="text-sm text-[var(--ink-soft)]">{treeCopy.emptyHint}</p>
              )}
            </div>
          </PanelSection>
        )}
      </div>
    </aside>
  );
}
