import { useCallback, useRef, useState } from 'react';
import L from 'leaflet';
import { useParams } from 'react-router-dom';
import SearchBar from '@/components/SearchBar';
import MapView from '@/components/MapView';
import TimeSliderBar from '@/components/TimeSliderBar';
import type { GeocodingResult } from '@/services/geocoding';
import type { ClickInfo } from '@/types/map';
import type { SelectedBuilding } from '@/types/building';
import type { MapBounds } from '@/types/map-engine';
import { useDateTime } from '@/hooks/useDateTime';
import { useMapEngine } from '@/hooks/useMapEngine';
import { useTranslation } from '@/i18n';
import { getScenarioMode } from '@/pages/MapPage/constants';
import { useTreeState } from '@/pages/MapPage/useTreeState';
import { useWorkerState } from '@/pages/MapPage/useWorkerState';
import { useMapPageEffects } from '@/pages/MapPage/useMapPageEffects';
import { MapPageStandardInfo } from '@/pages/MapPage/MapPageStandardInfo';
import { MapPageTreeMode } from '@/pages/MapPage/MapPageTreeMode';
import { MapPageWorkerMode } from '@/pages/MapPage/MapPageWorkerMode';

export default function MapPage() {
  const { messages, language } = useTranslation();
  const { caseId } = useParams();
  const scenarioMode = getScenarioMode(caseId);
  const isTreeMode = scenarioMode === 'trees';
  const isWorkerMode = scenarioMode === 'workers';
  const isStandardInfoMode = !isTreeMode && !isWorkerMode;

  const dt = useDateTime();
  const [sunExposure, setSunExposure] = useState(false);
  const [is3D, setIs3D] = useState(false);
  const [isSatellite, setIsSatellite] = useState(false);
  const [clickInfo, setClickInfo] = useState<ClickInfo | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<SelectedBuilding | null>(null);
  const [loadingBuildings, setLoadingBuildings] = useState(false);

  const staticDatasetLayerRef = useRef<L.GeoJSON | null>(null);
  const sunEdgesLayerRef = useRef<L.LayerGroup | null>(null);
  const selectedBuildingLayerRef = useRef<L.LayerGroup | null>(null);
  const suppressNextMapClickRef = useRef(false);

  const engineState = useMapEngine({
    initialDate: dt.date,
    onLoadingChange: setLoadingBuildings,
  });

  const tree = useTreeState({
    language,
    engine: engineState.engine,
    rawMapRef: engineState.rawMapRef,
    controller: engineState.controller,
    isTreeMode,
    keepState: isTreeMode || isWorkerMode,
  });

  const worker = useWorkerState({
    isWorkerMode,
    onSimulationStart: () => {
      setSunExposure(false);
      dt.setSlider(9 * 60);
    },
  });

  useMapPageEffects({
    engineState,
    dt: { ...dt, language },
    tree,
    worker,
    isTreeMode,
    isWorkerMode,
    sunExposure,
    is3D,
    isSatellite,
    clickInfo,
    selectedBuilding,
    setClickInfo,
    setSelectedBuilding,
    staticDatasetLayerRef,
    sunEdgesLayerRef,
    selectedBuildingLayerRef,
    suppressNextMapClickRef,
  });

  const handleSearchSelect = useCallback((result: GeocodingResult) => {
    const [south, north, west, east] = result.boundingBox;
    const bounds: MapBounds = { south, north, west, east };
    engineState.controller.flyToBounds(bounds, { duration: 1.2, padding: [40, 40] });
  }, [engineState.controller]);

  const handleTimeSliderChange = useCallback((value: number) => {
    if (sunExposure) {
      setSunExposure(false);
    }
    dt.setSlider(value);
  }, [dt, sunExposure]);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <MapView containerRef={engineState.containerRef} />
      <SearchBar onSelect={handleSearchSelect} />

      <MapPageStandardInfo
        visible={isStandardInfoMode}
        clickInfo={clickInfo}
        messages={messages}
        dateStr={dt.dateStr}
        onDateChange={dt.setDateStr}
        sunExposure={sunExposure}
        onSunExposureChange={setSunExposure}
        is3D={is3D}
        onViewModeChange={setIs3D}
        isSatellite={isSatellite}
        onBasemapChange={engineState.engine === 'maplibre' ? setIsSatellite : undefined}
        loadingBuildings={loadingBuildings}
        onCloseInfo={() => {
          setClickInfo(null);
          setSelectedBuilding(null);
        }}
      />

      <MapPageTreeMode
        visible={isTreeMode}
        tree={tree}
      />

      <MapPageWorkerMode
        visible={isWorkerMode}
        worker={worker}
      />

      {(isStandardInfoMode || isTreeMode || isWorkerMode) && (
        <TimeSliderBar
          sliderValue={dt.sliderValue}
          sliderPct={dt.sliderPct}
          timeLabel={dt.timeLabel}
          onSliderChange={handleTimeSliderChange}
        />
      )}
    </div>
  );
}
