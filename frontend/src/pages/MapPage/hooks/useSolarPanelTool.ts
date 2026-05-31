import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { SUN_EXPOSURE_CONFIG } from '@/config/map';
import { astanaLocalToDate } from '@/utils/astanaTime';
import { sampleDatesForPeriod, type SolarPeriod, type SolarSample } from '@/utils/solarEnergy';
import type { MapEngineKind } from '@/types/map-engine';
import type { ShadowEngineController } from '@/types/shadow-engine';

/** dataTransfer type used to recognise a panel being dragged onto the map. */
export const SOLAR_PANEL_DND_TYPE = 'application/x-solar-panel';

const SAMPLE_TIMEOUT_MS = 9000;

interface UseSolarPanelToolParams {
  engine: MapEngineKind;
  rawMapRef: React.RefObject<unknown>;
  isActive: boolean;
  placed: boolean;
  shadow: ShadowEngineController | null;
  dateStr: string;
  /** Full datetime (date + slider time) to restore the live shadows to after sampling. */
  date: Date;
  period: SolarPeriod;
  onPlace: () => void;
  onSample: (samples: SolarSample[]) => void;
  onSamplingChange: (sampling: boolean) => void;
}

function exposureRange(dateStr: string) {
  return {
    startDate: astanaLocalToDate(dateStr, SUN_EXPOSURE_CONFIG.startHour, 0),
    endDate: astanaLocalToDate(dateStr, SUN_EXPOSURE_CONFIG.endHour, 0),
    iterations: SUN_EXPOSURE_CONFIG.iterations,
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    let done = false;
    const timer = window.setTimeout(() => {
      if (!done) { done = true; resolve(fallback); }
    }, ms);
    promise.then(
      (v) => { if (!done) { done = true; window.clearTimeout(timer); resolve(v); } },
      () => { if (!done) { done = true; window.clearTimeout(timer); resolve(fallback); } },
    );
  });
}

function createPanelElement(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = 'cursor:grab;filter:drop-shadow(0 6px 10px rgba(0,0,0,.45));';
  el.innerHTML = `
    <div style="width:46px;height:31px;border-radius:4px;background:linear-gradient(135deg,#1e3a5f,#0f1f3a);
      border:1.5px solid #cfe0ff;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(2,1fr);
      gap:1.5px;padding:2px;transform:perspective(60px) rotateX(28deg);">
      ${Array.from({ length: 6 }).map(() => '<div style="background:#3b6ea5;border-radius:1px;"></div>').join('')}
    </div>
    <div style="width:2px;height:11px;background:#cfe0ff;margin:0 auto;"></div>`;
  return el;
}

/**
 * Lets the user drag a solar panel from the side panel and drop it anywhere on
 * the map. On drop (and on marker drags / period changes) it samples how many
 * hours of direct sun the spot gets across the selected period (day = 1 probe,
 * week / month = several probes spread across the period) via the shadow sim.
 *
 * The page is expected to keep sun-exposure mode ON while this tool is active so
 * the shadow engine's exposure data is ready and `getHoursOfSun` resolves.
 */
export function useSolarPanelTool({
  engine,
  rawMapRef,
  isActive,
  placed,
  shadow,
  dateStr,
  date,
  period,
  onPlace,
  onSample,
  onSamplingChange,
}: UseSolarPanelToolParams) {
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const shadowRef = useRef(shadow);
  const dateStrRef = useRef(dateStr);
  const dateRef = useRef(date);
  const periodRef = useRef(period);
  const cbRef = useRef({ onPlace, onSample, onSamplingChange });
  const sampleTokenRef = useRef(0);

  useEffect(() => {
    shadowRef.current = shadow;
    dateStrRef.current = dateStr;
    dateRef.current = date;
    periodRef.current = period;
    cbRef.current = { onPlace, onSample, onSamplingChange };
  });

  const sampleRef = useRef(async (lat: number, lng: number) => {
    const map = rawMapRef.current as maplibregl.Map | null;
    const activeShadow = shadowRef.current;
    if (!map || !activeShadow) { cbRef.current.onSample([]); return; }

    const token = ++sampleTokenRef.current;
    const selectedDate = dateStrRef.current;
    const dates = sampleDatesForPeriod(selectedDate, periodRef.current);
    cbRef.current.onSamplingChange(true);

    const samples: SolarSample[] = [];
    try {
      const pt = map.project([lng, lat]);
      for (const d of dates) {
        await withTimeout(activeShadow.setSunExposure(true, exposureRange(d)), SAMPLE_TIMEOUT_MS, undefined);
        if (token !== sampleTokenRef.current) return;
        const hours = await withTimeout(activeShadow.getHoursOfSun({ x: pt.x, y: pt.y }), SAMPLE_TIMEOUT_MS, NaN);
        if (token !== sampleTokenRef.current) return;
        samples.push({ dateStr: d, sunHours: Number.isFinite(hours) ? hours : null });
      }
      cbRef.current.onSample(samples);
    } catch {
      if (token === sampleTokenRef.current) cbRef.current.onSample(samples);
    } finally {
      // Restore the live, time-of-day shadow regions (turn the exposure heatmap
      // back off and re-apply the current datetime). A superseded sample leaves
      // restoration to the newer one.
      if (token === sampleTokenRef.current) {
        activeShadow.setSunExposure(false, exposureRange(selectedDate)).catch(() => {});
        try { activeShadow.setDate(dateRef.current); } catch { /* map not ready */ }
        cbRef.current.onSamplingChange(false);
      }
    }
  });

  const placeOrMoveRef = useRef((lat: number, lng: number) => {
    const map = rawMapRef.current as maplibregl.Map | null;
    if (!map) return;
    let marker = markerRef.current;
    if (!marker) {
      const el = createPanelElement();
      marker = new maplibregl.Marker({ element: el, draggable: true, anchor: 'bottom' });
      marker.on('dragstart', () => { el.style.cursor = 'grabbing'; });
      marker.on('dragend', () => {
        el.style.cursor = 'grab';
        const ll = marker!.getLngLat();
        void sampleRef.current(ll.lat, ll.lng);
      });
      markerRef.current = marker;
    }
    marker.setLngLat([lng, lat]).addTo(map);
    cbRef.current.onPlace();
    void sampleRef.current(lat, lng);
  });

  // Drop target: accept a panel dropped from the side panel.
  useEffect(() => {
    if (engine !== 'maplibre' || !isActive) return;
    const map = rawMapRef.current as maplibregl.Map | null;
    if (!map) return;
    const container = map.getContainer();

    const hasPanel = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types ?? []).includes(SOLAR_PANEL_DND_TYPE);

    const onDragOver = (e: DragEvent) => {
      if (!hasPanel(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };
    const onDrop = (e: DragEvent) => {
      if (!hasPanel(e)) return;
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const ll = map.unproject([e.clientX - rect.left, e.clientY - rect.top]);
      placeOrMoveRef.current(ll.lat, ll.lng);
    };

    container.addEventListener('dragover', onDragOver);
    container.addEventListener('drop', onDrop);
    return () => {
      container.removeEventListener('dragover', onDragOver);
      container.removeEventListener('drop', onDrop);
    };
  }, [engine, isActive, rawMapRef]);

  // Remove the marker when the tool is cleared or the mode is left.
  useEffect(() => {
    if (isActive && placed) return;
    markerRef.current?.remove();
    markerRef.current = null;
  }, [isActive, placed]);

  // Re-sample when the date or period changes.
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker || !isActive || !placed) return;
    const ll = marker.getLngLat();
    void sampleRef.current(ll.lat, ll.lng);
  }, [dateStr, period, isActive, placed]);
}
