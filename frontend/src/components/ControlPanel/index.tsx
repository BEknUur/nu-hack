import { CalendarDays, Cuboid, Layers3, LoaderCircle, Sprout, SunMedium } from 'lucide-react';
import { useTranslation } from '@/i18n';
import type { TreeDrawMode } from '@/types/tree-optimizer';
import { PanelSection, SegmentedOptionGroup } from '@/components/mapControls/primitives';
import { TreeAreaDrawControls } from '@/components/treeShared/TreeAreaDrawControls';
import { TreeRankingControls } from '@/components/treeShared/TreeRankingControls';

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
            <SegmentedOptionGroup
              value={sunExposure}
              onChange={(value) => onModeChange(value as boolean)}
              options={[
                { label: messages.map.shadows, value: false },
                { label: messages.map.exposure, value: true },
              ]}
            />
          </PanelSection>
        )}

        {onViewModeChange && !isTreeMode && (
          <PanelSection icon={<Cuboid className="h-4 w-4" />} title={messages.map.view}>
            <SegmentedOptionGroup
              value={Boolean(is3D)}
              onChange={(value) => onViewModeChange(value as boolean)}
              options={[
                { label: '2D', value: false },
                { label: '3D', value: true },
              ]}
            />
          </PanelSection>
        )}

        {onBasemapChange && !isTreeMode && (
          <PanelSection icon={<Layers3 className="h-4 w-4" />} title={messages.map.baseMap}>
            <SegmentedOptionGroup
              value={Boolean(isSatellite)}
              onChange={(value) => onBasemapChange(value as boolean)}
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
                <TreeAreaDrawControls
                  variant="panel"
                  shapeLabel={treeCopy.shapeLabel}
                  drawMode={treeOptimizer.drawMode}
                  drawModeOptions={drawModeOptions}
                  onDrawModeChange={treeOptimizer.onDrawModeChange}
                  hasArea={treeOptimizer.hasArea}
                  isDrawing={treeOptimizer.drawingArmed || treeOptimizer.drawingInProgress}
                  onStartDrawing={treeOptimizer.onStartDraw}
                  onClearArea={treeOptimizer.onClearArea}
                  drawActionLabel={treeCopy.drawAction}
                  redrawActionLabel={treeCopy.redrawAction}
                  clearActionLabel={treeCopy.clearArea}
                  clearDisabled={!treeOptimizer.hasArea && !treeOptimizer.drawingArmed}
                  postActionsContent={(
                    <>
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
                    </>
                  )}
                />
              </div>

              <div className="rounded-lg border border-[color:var(--line)] bg-white/80 p-3">
                <div className="text-sm font-medium text-[var(--ink)]">{treeCopy.rankStepTitle}</div>

                <TreeRankingControls
                  variant="panel"
                  balanceLabel={treeCopy.priority}
                  seasonShareLabel={treeCopy.seasonShare(summerPct, winterPct)}
                  summerHint={treeCopy.summerHint}
                  winterHint={treeCopy.winterHint}
                  topNLabel={treeCopy.topN}
                  minWinterLightLabel={treeCopy.minWinterLight}
                  summerPct={summerPct}
                  topK={treeOptimizer.topK}
                  minWinterLight={treeOptimizer.minWinterLight}
                  onSummerWeightChange={treeOptimizer.onSummerWeightChange}
                  onTopKChange={treeOptimizer.onTopKChange}
                  onMinWinterLightChange={treeOptimizer.onMinWinterLightChange}
                  controlsDisabled={!treeOptimizer.hasArea || treeOptimizer.drawingArmed || treeOptimizer.drawingInProgress}
                  loading={treeOptimizer.loading}
                  runLabel={treeCopy.run}
                  runningLabel={treeCopy.running}
                  onRun={treeOptimizer.onRun}
                  runDisabled={
                    treeOptimizer.loading
                    || !treeOptimizer.hasArea
                    || treeOptimizer.drawingArmed
                    || treeOptimizer.drawingInProgress
                  }
                />
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
