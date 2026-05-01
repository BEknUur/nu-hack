import { useEffect, useState } from 'react';
import L from 'leaflet';
import { SUN_EXPOSURE_CONFIG } from '@/config/map';
import { useDateTime } from '@/hooks/useDateTime';
import { useShadeMapSetup } from '@/hooks/useShadeMapSetup';
import type { ClickInfo } from '@/types/map';
import MapView from '@/components/MapView';
import ControlPanel from '@/components/ControlPanel';
import SunInfoPopup from '@/components/SunInfoPopup';

export default function MapPage() {
  const dt = useDateTime();
  const [sunExposure, setSunExposure] = useState(false);
  const [clickInfo, setClickInfo] = useState<ClickInfo | null>(null);
  const [loadingBuildings, setLoadingBuildings] = useState(false);

  const { containerRef, mapRef, shadeMapRef, zoom } = useShadeMapSetup({
    initialDate: dt.date,
    onLoadingChange: setLoadingBuildings,
  });

  // Sync date/time → shade map
  useEffect(() => {
    shadeMapRef.current?.setDate(dt.date);
  }, [dt.date, shadeMapRef]);

  // Sync sun exposure mode → shade map
  useEffect(() => {
    const sm = shadeMapRef.current;
    if (!sm) return;

    const start = new Date(`${dt.dateStr}T00:00:00`);
    start.setHours(SUN_EXPOSURE_CONFIG.startHour, 0, 0, 0);
    const end = new Date(`${dt.dateStr}T00:00:00`);
    end.setHours(SUN_EXPOSURE_CONFIG.endHour, 0, 0, 0);

    sm.setSunExposure(sunExposure, {
      startDate: start,
      endDate: end,
      iterations: SUN_EXPOSURE_CONFIG.iterations,
    });
  }, [sunExposure, dt.dateStr, shadeMapRef]);

  // Map click → check sun/shade at that pixel
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function handleClick(e: L.LeafletMouseEvent) {
      const sm = shadeMapRef.current;
      if (!sm) return;

      const { x, y } = map!.latLngToContainerPoint(e.latlng);
      setClickInfo({ lat: e.latlng.lat, lng: e.latlng.lng, inSun: null });

      sm.isPositionInSun(x, y)
        .then((inSun) => setClickInfo({ lat: e.latlng.lat, lng: e.latlng.lng, inSun }))
        .catch(() => setClickInfo(null));
    }

    map.on('click', handleClick);
    return () => { map.off('click', handleClick); };
  }, [mapRef, shadeMapRef]);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <MapView containerRef={containerRef} />

      <ControlPanel
        dateStr={dt.dateStr}
        onDateChange={dt.setDateStr}
        sliderValue={dt.sliderValue}
        sliderPct={dt.sliderPct}
        timeLabel={dt.timeLabel}
        onSliderChange={dt.setSlider}
        sunExposure={sunExposure}
        onModeChange={setSunExposure}
        zoom={zoom}
        loadingBuildings={loadingBuildings}
      />

      {clickInfo && (
        <SunInfoPopup info={clickInfo} onClose={() => setClickInfo(null)} />
      )}
    </div>
  );
}
