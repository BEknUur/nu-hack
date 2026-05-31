// Solar energy estimation model for Astana (~51°N).
//
// We turn the shadow-simulator's "hours of direct sun on a date" at a point into
// an electricity estimate. The shadow value captures *local shading* (buildings,
// terrain); we combine it with Astana's solar resource to get kWh. For week/month
// periods we sample several dates and average, because the sun path (and so the
// shading at a fixed spot) changes through the season.

import type { Language } from '@/i18n';

export type SolarPeriod = 'day' | 'week' | 'month';

/** One sampled date and the hours of direct sun measured there. */
export interface SolarSample {
  dateStr: string;
  sunHours: number | null;
}

/** Standard residential panel/array presets. kWp = rated DC power at STC. */
export interface SolarPanelPreset {
  id: string;
  kwp: number;
  areaM2: number;
  labels: Record<Language, string>;
}

export const SOLAR_PANEL_PRESETS: SolarPanelPreset[] = [
  {
    id: 'single',
    kwp: 0.45,
    areaM2: 2.0,
    labels: { en: '1 panel · 0.45 kW', ru: '1 панель · 0.45 кВт', kk: '1 панель · 0.45 кВт' },
  },
  {
    id: 'balcony',
    kwp: 2.0,
    areaM2: 9,
    labels: { en: 'Balcony array · 2 kW', ru: 'Балконная сборка · 2 кВт', kk: 'Балкон жинағы · 2 кВт' },
  },
  {
    id: 'rooftop',
    kwp: 5.0,
    areaM2: 22,
    labels: { en: 'Rooftop · 5 kW', ru: 'Крыша · 5 кВт', kk: 'Шатыр · 5 кВт' },
  },
];

// Peak sun hours per day for Astana by month (kWh/m²/day of usable irradiance).
const ASTANA_PSH_BY_MONTH = [1.2, 2.1, 3.4, 4.6, 5.9, 6.6, 6.5, 5.5, 4.0, 2.4, 1.3, 0.9];
// Average daylight length (hours) by month — the unobstructed ceiling for sun hours.
const ASTANA_DAYLIGHT_BY_MONTH = [8.3, 9.8, 11.7, 13.6, 15.3, 16.4, 15.9, 14.3, 12.4, 10.4, 8.7, 7.7];

// getHoursOfSun is sampled inside the 06:00–20:00 window (14h).
const EXPOSURE_WINDOW_HOURS = 14;
// Performance ratio: real-world losses (inverter, temperature, wiring, dust).
const PERFORMANCE_RATIO = 0.78;

const ANNUAL_AVG_PSH =
  ASTANA_PSH_BY_MONTH.reduce((a, b) => a + b, 0) / ASTANA_PSH_BY_MONTH.length;

function monthIdxOf(dateStr: string): number {
  return Math.max(0, Math.min(11, (Number(dateStr.slice(5, 7)) || 1) - 1));
}

function daysInMonthOf(dateStr: string): number {
  const y = Number(dateStr.slice(0, 4)) || 2026;
  const m = Number(dateStr.slice(5, 7)) || 1;
  return new Date(y, m, 0).getDate();
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** Add `days` to a YYYY-MM-DD string, returning YYYY-MM-DD. */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/**
 * Dates to sample for a given period. We spread a handful of probes across the
 * period rather than every single day (each probe is an exposure recompute).
 */
export function sampleDatesForPeriod(dateStr: string, period: SolarPeriod): string[] {
  if (period === 'day') return [dateStr];
  if (period === 'week') return [dateStr, addDays(dateStr, 3), addDays(dateStr, 6)];
  // month: probe across the selected calendar month
  const ym = dateStr.slice(0, 7);
  return [1, 8, 15, 22].map((d) => `${ym}-${String(d).padStart(2, '0')}`);
}

export function periodDays(dateStr: string, period: SolarPeriod): number {
  if (period === 'day') return 1;
  if (period === 'week') return 7;
  return daysInMonthOf(dateStr);
}

export interface SolarEstimate {
  period: SolarPeriod;
  /** Number of probes that returned data. */
  validSamples: number;
  /** Average hours of direct sun across probes. */
  avgSunHours: number | null;
  /** Unobstructed ceiling of sun hours (avg across probes). */
  avgMaxSunHours: number;
  /** 0..1 — average fraction of the open-sky sun this spot receives. */
  shadingFactor: number | null;
  /** kWh produced over the selected period (day / week / month). */
  periodKwh: number | null;
  periodDays: number;
  /** Estimated kWh over a full year (assuming similar shading). */
  annualKwh: number | null;
  panelKwp: number;
}

export function computeSolarEstimate(params: {
  samples: SolarSample[];
  dateStr: string;
  period: SolarPeriod;
  panelKwp: number;
}): SolarEstimate {
  const { samples, dateStr, period, panelKwp } = params;
  const repPsh = ASTANA_PSH_BY_MONTH[monthIdxOf(dateStr)];
  const days = periodDays(dateStr, period);
  const refMonthMax = Math.min(ASTANA_DAYLIGHT_BY_MONTH[monthIdxOf(dateStr)], EXPOSURE_WINDOW_HOURS);

  const valid = samples.filter((s) => s.sunHours != null) as { dateStr: string; sunHours: number }[];

  if (valid.length === 0) {
    return {
      period, validSamples: 0, avgSunHours: null, avgMaxSunHours: refMonthMax,
      shadingFactor: null, periodKwh: null, periodDays: days, annualKwh: null, panelKwp,
    };
  }

  let sumSun = 0;
  let sumMax = 0;
  let sumShading = 0;
  for (const s of valid) {
    const maxSun = Math.min(ASTANA_DAYLIGHT_BY_MONTH[monthIdxOf(s.dateStr)], EXPOSURE_WINDOW_HOURS);
    sumSun += s.sunHours;
    sumMax += maxSun;
    sumShading += clamp01(s.sunHours / maxSun);
  }
  const avgSunHours = sumSun / valid.length;
  const avgMaxSunHours = sumMax / valid.length;
  const shadingFactor = sumShading / valid.length;

  const periodKwh = panelKwp * repPsh * PERFORMANCE_RATIO * shadingFactor * days;
  const annualKwh = panelKwp * ANNUAL_AVG_PSH * 365 * PERFORMANCE_RATIO * shadingFactor;

  return {
    period, validSamples: valid.length, avgSunHours, avgMaxSunHours,
    shadingFactor, periodKwh, periodDays: days, annualKwh, panelKwp,
  };
}

// ── Relatable "what can this power?" examples ────────────────────────────────

const PHONE_CHARGE_KWH = 0.012;
const LED_BULB_W = 10;
const FRIDGE_KWH_DAY = 1.3;
const HOUSEHOLD_KWH_DAY = 8; // typical Kazakhstan apartment
const EV_KWH_PER_KM = 0.18;
const KETTLE_BOIL_KWH = 0.11;

export interface PowerExample {
  emoji: string;
  text: string;
}

function fmt(n: number): string {
  if (n >= 100) return Math.round(n).toLocaleString();
  if (n >= 10) return n.toFixed(0);
  if (n >= 1) return n.toFixed(1);
  return n.toFixed(2);
}

const T: Record<string, Record<Language, (v: string) => string>> = {
  phone: {
    en: (v) => `Charge a phone ${v} times`,
    ru: (v) => `Зарядить телефон ${v} раз`,
    kk: (v) => `Телефонды ${v} рет зарядтау`,
  },
  bulb: {
    en: (v) => `Run a 10 W LED bulb for ${v} h`,
    ru: (v) => `10 Вт LED-лампа на ${v} ч`,
    kk: (v) => `10 Вт LED шамы ${v} сағ`,
  },
  fridge: {
    en: (v) => `Power a fridge for ${v} days`,
    ru: (v) => `Питать холодильник ${v} дней`,
    kk: (v) => `Тоңазытқышты ${v} күн қоректендіру`,
  },
  householdPct: {
    en: (v) => `${v}% of an apartment's daily electricity`,
    ru: (v) => `${v}% дневного электричества квартиры`,
    kk: (v) => `Пәтердің тәуліктік электрінің ${v}%`,
  },
  householdDays: {
    en: (v) => `Power an apartment for ${v} days`,
    ru: (v) => `Обеспечить квартиру на ${v} дней`,
    kk: (v) => `Пәтерді ${v} күн қамтамасыз ету`,
  },
  ev: {
    en: (v) => `Drive an EV ${v} km`,
    ru: (v) => `Проехать на электромобиле ${v} км`,
    kk: (v) => `Электромобильмен ${v} км жүру`,
  },
  kettle: {
    en: (v) => `Boil ${v} kettles of water`,
    ru: (v) => `Вскипятить ${v} чайников воды`,
    kk: (v) => `${v} шәйнек суды қайнату`,
  },
};

/** Tangible examples scaled to the selected period's energy. */
export function computePeriodExamples(
  periodKwh: number,
  period: SolarPeriod,
  language: Language,
): PowerExample[] {
  const e = periodKwh;
  const household: PowerExample = period === 'day'
    ? { emoji: '🏠', text: T.householdPct[language](fmt(Math.min(999, (e / HOUSEHOLD_KWH_DAY) * 100))) }
    : { emoji: '🏠', text: T.householdDays[language](fmt(e / HOUSEHOLD_KWH_DAY)) };
  return [
    household,
    { emoji: '📱', text: T.phone[language](fmt(e / PHONE_CHARGE_KWH)) },
    { emoji: '💡', text: T.bulb[language](fmt((e * 1000) / LED_BULB_W)) },
    { emoji: '🫖', text: T.kettle[language](fmt(e / KETTLE_BOIL_KWH)) },
  ];
}

/** Bigger-picture examples derived from the annual energy. */
export function computeAnnualExamples(annualKwh: number, language: Language): PowerExample[] {
  return [
    { emoji: '❄️', text: T.fridge[language](fmt(annualKwh / FRIDGE_KWH_DAY)) },
    { emoji: '🚗', text: T.ev[language](fmt(annualKwh / EV_KWH_PER_KM)) },
  ];
}
