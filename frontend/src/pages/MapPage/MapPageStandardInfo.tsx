import ControlPanel from '@/components/ControlPanel';
import SunInfoPopup from '@/components/SunInfoPopup';
import TimeSliderBar from '@/components/TimeSliderBar';
import { sideToLabel } from '@/pages/MapPage/helpers';
import type { ClickInfo } from '@/types/map';

interface MapPageStandardInfoProps {
  visible: boolean;
  clickInfo: ClickInfo | null;
  messages: {
    map: {
      north: string;
      east: string;
      south: string;
      west: string;
    };
  };
  dateStr: string;
  onDateChange: (value: string) => void;
  sunExposure: boolean;
  onSunExposureChange: (value: boolean) => void;
  is3D: boolean;
  onViewModeChange: (value: boolean) => void;
  isSatellite: boolean;
  onBasemapChange?: (value: boolean) => void;
  loadingBuildings: boolean;
  sliderValue: number;
  sliderPct: number;
  timeLabel: string;
  onSliderChange: (value: number) => void;
  onCloseInfo: () => void;
}

export function MapPageStandardInfo({
  visible,
  clickInfo,
  messages,
  dateStr,
  onDateChange,
  sunExposure,
  onSunExposureChange,
  is3D,
  onViewModeChange,
  isSatellite,
  onBasemapChange,
  loadingBuildings,
  sliderValue,
  sliderPct,
  timeLabel,
  onSliderChange,
  onCloseInfo,
}: MapPageStandardInfoProps) {
  if (!visible) return null;

  return (
    <>
      {clickInfo?.predictedBestSide && clickInfo.screenX != null && clickInfo.screenY != null && (
        <div
          className="pointer-events-none absolute z-[990] -translate-x-1/2 -translate-y-full rounded-lg border border-[color:var(--line)] bg-[rgba(251,248,241,0.96)] px-3 py-2 text-[11px] font-medium text-[var(--blue-strong)] shadow-[0_10px_20px_rgba(23,32,51,0.12)] backdrop-blur-md"
          style={{
            left: `${clickInfo.screenX}px`,
            top: `${clickInfo.screenY - 12}px`,
          }}
        >
          {sideToLabel(clickInfo.predictedBestSide, {
            north: messages.map.north,
            east: messages.map.east,
            south: messages.map.south,
            west: messages.map.west,
          }) ?? clickInfo.predictedBestSide}
          {clickInfo.predictedConfidence != null && (
            <span className="ml-2 ui-mono text-[var(--ink-soft)]">
              {Math.round(clickInfo.predictedConfidence * 100)}%
            </span>
          )}
        </div>
      )}

      <ControlPanel
        dateStr={dateStr}
        onDateChange={onDateChange}
        sunExposure={sunExposure}
        onModeChange={onSunExposureChange}
        is3D={is3D}
        onViewModeChange={onViewModeChange}
        isSatellite={isSatellite}
        onBasemapChange={onBasemapChange}
        loadingBuildings={loadingBuildings}
      />

      <TimeSliderBar
        sliderValue={sliderValue}
        sliderPct={sliderPct}
        timeLabel={timeLabel}
        onSliderChange={onSliderChange}
      />

      {clickInfo && <SunInfoPopup info={clickInfo} onClose={onCloseInfo} />}
    </>
  );
}
