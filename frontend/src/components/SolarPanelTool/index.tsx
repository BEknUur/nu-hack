import { useMemo } from 'react';
import { Sun, X, Loader2, GripVertical } from 'lucide-react';
import type { Language } from '@/i18n';
import { SOLAR_PANEL_DND_TYPE } from '@/pages/MapPage/hooks/useSolarPanelTool';
import {
  SOLAR_PANEL_PRESETS,
  computeSolarEstimate,
  computePeriodExamples,
  computeAnnualExamples,
  type SolarPeriod,
  type SolarSample,
} from '@/utils/solarEnergy';

interface SolarPanelToolProps {
  language: Language;
  dateStr: string;
  onDateChange: (dateStr: string) => void;
  period: SolarPeriod;
  onPeriodChange: (period: SolarPeriod) => void;
  placed: boolean;
  sampling: boolean;
  samples: SolarSample[];
  presetId: string;
  onPresetChange: (id: string) => void;
  onClear: () => void;
}

const COPY: Record<Language, {
  title: string;
  subtitle: string;
  hint: string;
  dragLabel: string;
  date: string;
  period: string;
  periods: Record<SolarPeriod, string>;
  totals: Record<SolarPeriod, string>;
  powersOver: Record<SolarPeriod, string>;
  remove: string;
  dragHint: string;
  sampling: string;
  exposure: string;
  sunAvg: string;
  perYear: string;
  perYearLabel: string;
  noSun: string;
  hours: string;
}> = {
  en: {
    title: 'Solar Panel',
    subtitle: 'Drag a panel onto the map',
    hint: 'Grab the panel below and drop it on any roof or yard. We measure how much sun it actually gets — shadows from nearby buildings included.',
    dragLabel: 'Drag me onto the map',
    date: 'Date',
    period: 'Analyze over',
    periods: { day: 'Day', week: 'Week', month: 'Month' },
    totals: { day: 'Today', week: 'This week', month: 'This month' },
    powersOver: { day: 'What this powers in a day', week: 'What this powers in a week', month: 'What this powers in a month' },
    remove: 'Remove panel',
    dragHint: 'Drag the panel on the map to test a new spot.',
    sampling: 'Measuring sun exposure…',
    exposure: 'Sun exposure',
    sunAvg: 'Avg direct sun',
    perYear: 'Over a year that is',
    perYearLabel: 'Per year',
    noSun: 'This spot is fully shaded in this period — try another spot or change the date.',
    hours: 'h',
  },
  ru: {
    title: 'Солнечная панель',
    subtitle: 'Перетащите панель на карту',
    hint: 'Возьмите панель ниже и бросьте её на любую крышу или двор. Мы измерим, сколько солнца она реально получает — с учётом теней от соседних зданий.',
    dragLabel: 'Перетащите меня на карту',
    date: 'Дата',
    period: 'Анализ за',
    periods: { day: 'День', week: 'Неделя', month: 'Месяц' },
    totals: { day: 'Сегодня', week: 'За неделю', month: 'За месяц' },
    powersOver: { day: 'Что это питает за день', week: 'Что это питает за неделю', month: 'Что это питает за месяц' },
    remove: 'Убрать панель',
    dragHint: 'Перетащите панель по карте, чтобы проверить новую точку.',
    sampling: 'Измеряем освещённость…',
    exposure: 'Освещённость',
    sunAvg: 'Сред. прямое солнце',
    perYear: 'За год это',
    perYearLabel: 'За год',
    noSun: 'В этот период точка полностью в тени — выберите другое место или измените дату.',
    hours: 'ч',
  },
  kk: {
    title: 'Күн панелі',
    subtitle: 'Панельді картаға сүйреңіз',
    hint: 'Төмендегі панельді алып, кез келген шатырға немесе ауланы тастаңыз. Көрші ғимараттардың көлеңкесін ескере отырып, оның қанша күн алатынын өлшейміз.',
    dragLabel: 'Мені картаға сүйреңіз',
    date: 'Күні',
    period: 'Талдау кезеңі',
    periods: { day: 'Күн', week: 'Апта', month: 'Ай' },
    totals: { day: 'Бүгін', week: 'Осы апта', month: 'Осы ай' },
    powersOver: { day: 'Бұл бір күнде нені қуаттандырады', week: 'Бұл аптада нені қуаттандырады', month: 'Бұл айда нені қуаттандырады' },
    remove: 'Панельді алып тастау',
    dragHint: 'Жаңа орынды тексеру үшін панельді карта бойынша сүйреңіз.',
    sampling: 'Күн түсуін өлшеудеміз…',
    exposure: 'Күн түсуі',
    sunAvg: 'Орташа тікелей күн',
    perYear: 'Жыл бойы бұл',
    perYearLabel: 'Жылына',
    noSun: 'Бұл кезеңде нүкте толық көлеңкеде — басқа орын таңдаңыз немесе күнді өзгертіңіз.',
    hours: 'сағ',
  },
};

const PERIOD_ORDER: SolarPeriod[] = ['day', 'week', 'month'];

function fmtKwh(n: number): string {
  if (n >= 100) return Math.round(n).toLocaleString();
  if (n >= 10) return n.toFixed(0);
  return n.toFixed(1);
}

function handleDragStart(e: React.DragEvent) {
  e.dataTransfer.setData(SOLAR_PANEL_DND_TYPE, '1');
  e.dataTransfer.effectAllowed = 'copy';
}

export default function SolarPanelTool({
  language,
  dateStr,
  onDateChange,
  period,
  onPeriodChange,
  placed,
  sampling,
  samples,
  presetId,
  onPresetChange,
  onClear,
}: SolarPanelToolProps) {
  const c = COPY[language];
  const preset = SOLAR_PANEL_PRESETS.find((p) => p.id === presetId) ?? SOLAR_PANEL_PRESETS[0];

  const estimate = useMemo(
    () => computeSolarEstimate({ samples, dateStr, period, panelKwp: preset.kwp }),
    [samples, dateStr, period, preset.kwp],
  );
  const periodExamples = useMemo(
    () => (estimate.periodKwh != null ? computePeriodExamples(estimate.periodKwh, period, language) : []),
    [estimate.periodKwh, period, language],
  );
  const annualExamples = useMemo(
    () => (estimate.annualKwh != null ? computeAnnualExamples(estimate.annualKwh, language) : []),
    [estimate.annualKwh, language],
  );

  const exposurePct =
    estimate.shadingFactor != null ? Math.round(estimate.shadingFactor * 100) : null;
  const hasOutput = estimate.periodKwh != null && estimate.periodKwh > 0.001;

  return (
    <aside className="map-panel absolute right-4 top-4 z-[1000] hidden max-h-[calc(100vh-2rem)] w-[300px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg p-3 text-[var(--ink)] md:block">
      <div className="mb-2.5 flex items-start gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--yellow-strong)]/12 text-[var(--yellow-strong)]">
          <Sun className="h-4 w-4" />
        </div>
        <div>
          <div className="text-base font-semibold tracking-[-0.03em]">{c.title}</div>
          <div className="text-[11px] text-[var(--ink-soft)]">{c.subtitle}</div>
        </div>
      </div>

      {/* Date + analysis period + panel size */}
      <div className="mb-2.5 space-y-2">
        <label className="block">
          <span className="mb-1 block text-[11px] text-[var(--ink-soft)]">{c.date}</span>
          <input
            type="date"
            value={dateStr}
            onChange={(e) => onDateChange(e.target.value)}
            className="map-input date-picker w-full rounded-md px-2.5 py-2 text-[13px] text-[var(--ink)]"
          />
        </label>

        <div>
          <span className="mb-1 block text-[11px] text-[var(--ink-soft)]">{c.period}</span>
          <div className="grid grid-cols-3 gap-1.5">
            {PERIOD_ORDER.map((p) => (
              <button
                key={p}
                onClick={() => onPeriodChange(p)}
                className={`rounded-md border px-1 py-1.5 text-[12px] font-medium transition-colors ${
                  p === period
                    ? 'border-[var(--yellow-strong)] bg-[var(--yellow-strong)]/10 text-[var(--yellow-strong)]'
                    : 'border-[color:var(--line)] bg-white/70 text-[var(--ink-soft)] hover:text-[var(--ink)]'
                }`}
              >
                {c.periods[p]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {SOLAR_PANEL_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => onPresetChange(p.id)}
              className={`rounded-md border px-1 py-1.5 text-[11px] font-medium transition-colors ${
                p.id === preset.id
                  ? 'border-[var(--yellow-strong)] bg-[var(--yellow-strong)]/10 text-[var(--yellow-strong)]'
                  : 'border-[color:var(--line)] bg-white/70 text-[var(--ink-soft)] hover:text-[var(--ink)]'
              }`}
            >
              {p.kwp} kW
            </button>
          ))}
        </div>
      </div>

      {/* Draggable panel chip */}
      <div
        draggable
        onDragStart={handleDragStart}
        className="mb-2.5 flex cursor-grab items-center gap-2.5 rounded-lg border border-dashed border-[var(--yellow-strong)]/50 bg-[var(--yellow-strong)]/8 px-3 py-2.5 active:cursor-grabbing"
        title={c.dragLabel}
      >
        <div
          aria-hidden
          style={{
            width: 40, height: 27, borderRadius: 4,
            background: 'linear-gradient(135deg,#1e3a5f,#0f1f3a)',
            border: '1.5px solid #cfe0ff',
            display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gridTemplateRows: 'repeat(2,1fr)',
            gap: 1.5, padding: 2, transform: 'perspective(60px) rotateX(28deg)', flexShrink: 0,
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ background: '#3b6ea5', borderRadius: 1 }} />
          ))}
        </div>
        <span className="text-[12px] font-medium leading-4 text-[var(--yellow-strong)]">{c.dragLabel}</span>
        <GripVertical className="ml-auto h-4 w-4 text-[var(--yellow-strong)]/60" />
      </div>

      {!placed ? (
        <p className="text-[12px] leading-5 text-[var(--ink-soft)]">{c.hint}</p>
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] text-[var(--ink-soft)]">{c.dragHint}</span>
            <button
              onClick={onClear}
              className="ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--ink-soft)] hover:bg-black/5 hover:text-[var(--ink)]"
              title={c.remove}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {sampling ? (
            <div className="flex items-center gap-2 rounded-lg border border-[color:var(--line)] bg-white/70 px-3 py-4 text-[13px] text-[var(--ink-soft)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              {c.sampling}
            </div>
          ) : !hasOutput ? (
            <p className="rounded-lg border border-[color:var(--line)] bg-white/70 px-3 py-3 text-[12px] leading-5 text-[var(--ink-soft)]">
              {c.noSun}
            </p>
          ) : (
            <>
              {/* Exposure + avg sun hours */}
              <div className="mb-2 rounded-lg border border-[color:var(--line)] bg-white/70 p-2.5">
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-[11px] text-[var(--ink-soft)]">{c.exposure}</span>
                  <span className="text-lg font-semibold tracking-[-0.03em]">{exposurePct}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/8">
                  <div
                    className="h-full rounded-full bg-[var(--yellow-strong)]"
                    style={{ width: `${exposurePct}%` }}
                  />
                </div>
                <div className="mt-1.5 text-[11px] text-[var(--ink-soft)]">
                  {c.sunAvg}:{' '}
                  <span className="font-medium text-[var(--ink)]">
                    {estimate.avgSunHours?.toFixed(1)} {c.hours}
                  </span>{' '}
                  / {estimate.avgMaxSunHours.toFixed(0)} {c.hours}
                </div>
              </div>

              {/* Energy numbers: period total + annual */}
              <div className="mb-2 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-[color:var(--line)] bg-white/70 p-2.5">
                  <div className="text-[11px] text-[var(--ink-soft)]">{c.totals[period]}</div>
                  <div className="text-lg font-semibold tracking-[-0.03em] text-[var(--yellow-strong)]">
                    {fmtKwh(estimate.periodKwh!)}{' '}
                    <span className="text-[12px] font-medium text-[var(--ink-soft)]">kWh</span>
                  </div>
                </div>
                <div className="rounded-lg border border-[color:var(--line)] bg-white/70 p-2.5">
                  <div className="text-[11px] text-[var(--ink-soft)]">{c.perYearLabel}</div>
                  <div className="text-lg font-semibold tracking-[-0.03em] text-[var(--yellow-strong)]">
                    {fmtKwh(estimate.annualKwh!)}{' '}
                    <span className="text-[12px] font-medium text-[var(--ink-soft)]">kWh</span>
                  </div>
                </div>
              </div>

              {/* Relatable examples */}
              <div className="rounded-lg border border-[color:var(--line)] bg-white/70 p-2.5">
                <div className="mb-1.5 text-[11px] font-medium text-[var(--ink)]">{c.powersOver[period]}</div>
                <ul className="space-y-1">
                  {periodExamples.map((ex, i) => (
                    <li key={i} className="flex items-center gap-2 text-[12px] text-[var(--ink)]">
                      <span className="text-[14px]">{ex.emoji}</span>
                      {ex.text}
                    </li>
                  ))}
                </ul>
                <div className="mb-1.5 mt-2 border-t border-[color:var(--line)] pt-2 text-[11px] font-medium text-[var(--ink)]">
                  {c.perYear}
                </div>
                <ul className="space-y-1">
                  {annualExamples.map((ex, i) => (
                    <li key={i} className="flex items-center gap-2 text-[12px] text-[var(--ink)]">
                      <span className="text-[14px]">{ex.emoji}</span>
                      {ex.text}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </>
      )}
    </aside>
  );
}
