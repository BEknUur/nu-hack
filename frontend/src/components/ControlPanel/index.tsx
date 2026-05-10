import type { ReactNode } from 'react';
import { CalendarDays, Cuboid, Layers3, LoaderCircle, SunMedium } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import { MAP_CONFIG } from '@/config/map';

interface ControlPanelProps {
  dateStr: string;
  onDateChange: (v: string) => void;
  sunExposure: boolean;
  onModeChange: (exposure: boolean) => void;
  is3D?: boolean;
  onViewModeChange?: (enabled: boolean) => void;
  isSatellite?: boolean;
  onBasemapChange?: (satellite: boolean) => void;
  zoom: number;
  loadingBuildings: boolean;
}

interface ToggleOption<T extends boolean> {
  label: string;
  value: T;
}

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
  zoom,
  loadingBuildings,
}: ControlPanelProps) {
  const buildingsActive = zoom >= MAP_CONFIG.buildingsMinZoom;
  const { messages, t } = useTranslation();

  return (
    <aside className="map-panel absolute right-4 top-[8.5rem] z-[1000] w-[320px] max-w-[calc(100vw-2rem)] rounded-xl p-4 text-[var(--ink)] md:top-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="ui-mono text-[11px] text-[var(--ink-soft)]">{messages.map.mapControlsTag}</div>
          <div className="mt-1 text-xl font-semibold tracking-[-0.04em]">{messages.map.shadowMapTitle}</div>
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
        <PanelSection icon={<CalendarDays className="h-4 w-4" />} title={messages.map.date}>
          <input
            type="date"
            className="map-input date-picker w-full rounded-lg px-3 py-2.5 text-sm text-[var(--ink)]"
            value={dateStr}
            onChange={(e) => onDateChange(e.target.value)}
          />
        </PanelSection>

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

        {onViewModeChange && (
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

        {onBasemapChange && (
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

        <section className="rounded-lg border border-[color:var(--line)] bg-white/70 p-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-[var(--ink)]">{messages.map.buildingCoverage}</span>
            <span className="ui-mono text-[11px] text-[var(--ink-soft)]">{messages.map.zoomLabel} {Math.round(zoom)}</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[rgba(31,79,156,0.1)]">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                buildingsActive ? 'bg-[var(--yellow-strong)]' : 'bg-[var(--blue-strong)]',
              )}
              style={{
                width: `${Math.min(100, Math.max(18, (zoom / MAP_CONFIG.buildingsMinZoom) * 100))}%`,
              }}
            />
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
            {buildingsActive
              ? messages.map.buildingsActive
              : t(messages.map.zoomToLoad, { zoom: MAP_CONFIG.buildingsMinZoom })}
          </p>
        </section>
      </div>
    </aside>
  );
}
