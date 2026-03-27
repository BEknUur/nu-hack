import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { SUN_EXPOSURE_CONFIG } from '@/config/map';
import { useDateTime } from '@/hooks/useDateTime';
import { useShadeMapSetup } from '@/hooks/useShadeMapSetup';
import { astanaLocalToDate } from '@/utils/astanaTime';
import type { ClickInfo } from '@/types/map';
import type { GeocodingResult } from '@/services/geocoding';
import MapView from '@/components/MapView';
import ControlPanel from '@/components/ControlPanel';
import TimeSliderBar from '@/components/TimeSliderBar';
import MapContextMenu from '@/components/MapContextMenu';
import SunInfoPopup from '@/components/SunInfoPopup';
import SearchBar from '@/components/SearchBar';

interface ContextMenuState {
  x: number;
  y: number;
  lat: number;
  lng: number;
  annualSunHours: number | null;
  dailySunHours: number | null;
  loadingInfo: boolean;
  error: string | null;
}

export default function MapPage() {
  const dt = useDateTime();
  const [sunExposure, setSunExposure] = useState(false);
  const [clickInfo, setClickInfo] = useState<ClickInfo | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const menuRequestIdRef = useRef(0);

  const { containerRef, mapRef, shadeMapRef, zoom } = useShadeMapSetup({
    initialDate: dt.date,
    onLoadingChange: setLoadingBuildings,
  });

  // Sync date/time → shade map
  useEffect(() => {
    shadeMapRef.current?.setDate(dt.date);
  }, [dt.date, shadeMapRef]);

  function getDefaultSunExposureRange(dateStr: string) {
    return {
      startDate: astanaLocalToDate(dateStr, SUN_EXPOSURE_CONFIG.startHour, 0),
      endDate: astanaLocalToDate(dateStr, SUN_EXPOSURE_CONFIG.endHour, 0),
      iterations: SUN_EXPOSURE_CONFIG.iterations,
    };
  }

  // Sync sun exposure mode → shade map
  useEffect(() => {
    const sm = shadeMapRef.current;
    if (!sm) return;

    sm.setSunExposure(sunExposure, {
      ...getDefaultSunExposureRange(dt.dateStr),
    });
  }, [sunExposure, dt.dateStr, shadeMapRef]);

  // Map click → check sun/shade at that pixel
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function handleClick(e: L.LeafletMouseEvent) {
      menuRequestIdRef.current += 1;
      setContextMenu(null);
      const sm = shadeMapRef.current;
      if (!sm) return;

      const { x, y } = map!.latLngToContainerPoint(e.latlng);
      setClickInfo({ lat: e.latlng.lat, lng: e.latlng.lng, inSun: null });

      sm.isPositionInSun(x, y)
        .then((inSun) => setClickInfo({ lat: e.latlng.lat, lng: e.latlng.lng, inSun }))
        .catch(() => setClickInfo(null));
    }

    async function handleContextMenu(e: L.LeafletMouseEvent) {
      const m = mapRef.current;
      const sm = shadeMapRef.current;
      if (!m || !sm) return;

      const requestId = menuRequestIdRef.current + 1;
      menuRequestIdRef.current = requestId;

      setClickInfo(null);
      const { x, y } = m.latLngToContainerPoint(e.latlng);
      setContextMenu({
        x: x + 8,
        y: y - 8,
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        annualSunHours: null,
        dailySunHours: null,
        loadingInfo: true,
        error: null,
      });

      const dayStart = astanaLocalToDate(dt.dateStr, 0, 0);
      const dayEnd = astanaLocalToDate(dt.dateStr, 23, 59);
      const [year] = dt.dateStr.split('-').map(Number);
      const yearStart = astanaLocalToDate(`${year}-01-01`, 0, 0);
      const yearEnd = astanaLocalToDate(`${year}-12-31`, 23, 59);

      try {
        await sm.setSunExposure(true, { startDate: dayStart, endDate: dayEnd, iterations: 48 });
        const dailySunHours = await sm.getHoursOfSun(x, y);

        await sm.setSunExposure(true, { startDate: yearStart, endDate: yearEnd, iterations: 96 });
        const annualSunHours = await sm.getHoursOfSun(x, y);

        if (menuRequestIdRef.current !== requestId) return;
        setContextMenu((prev) => (prev
          ? {
              ...prev,
              dailySunHours,
              annualSunHours,
              loadingInfo: false,
            }
          : null));
      } catch {
        if (menuRequestIdRef.current !== requestId) return;
        setContextMenu((prev) => (prev
          ? {
              ...prev,
              loadingInfo: false,
              error: 'Failed to load',
            }
          : null));
      } finally {
        await sm.setSunExposure(sunExposure, {
          ...getDefaultSunExposureRange(dt.dateStr),
        });
      }
    }

    map.on('click', handleClick);
    map.on('contextmenu', handleContextMenu);
    return () => {
      map.off('click', handleClick);
      map.off('contextmenu', handleContextMenu);
    };
  }, [mapRef, shadeMapRef, dt.dateStr, sunExposure]);

  // Search result → fly to location
  function handleSearchSelect(result: GeocodingResult) {
    const map = mapRef.current;
    if (!map) return;

    const [south, north, west, east] = result.boundingBox;
    map.flyToBounds(
      [[south, west], [north, east]],
      { duration: 1.2, padding: [40, 40] },
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <MapView containerRef={containerRef} />

      <SearchBar onSelect={handleSearchSelect} />

      <ControlPanel
        dateStr={dt.dateStr}
        onDateChange={dt.setDateStr}
        sunExposure={sunExposure}
        onModeChange={setSunExposure}
        zoom={zoom}
        loadingBuildings={loadingBuildings}
      />

      <TimeSliderBar
        sliderValue={dt.sliderValue}
        sliderPct={dt.sliderPct}
        timeLabel={dt.timeLabel}
        onSliderChange={dt.setSlider}
      />

      {contextMenu && (
        <MapContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          lat={contextMenu.lat}
          lng={contextMenu.lng}
          annualSunHours={contextMenu.annualSunHours}
          dailySunHours={contextMenu.dailySunHours}
          loadingInfo={contextMenu.loadingInfo}
          error={contextMenu.error}
          onShadows={() => {
            setSunExposure(false);
            menuRequestIdRef.current += 1;
            setContextMenu(null);
          }}
          onCenterMap={() => {
            mapRef.current?.panTo([contextMenu.lat, contextMenu.lng], { animate: true, duration: 0.5 });
            menuRequestIdRef.current += 1;
            setContextMenu(null);
          }}
          onClose={() => {
            menuRequestIdRef.current += 1;
            setContextMenu(null);
          }}
        />
      )}

      {clickInfo && (
        <SunInfoPopup info={clickInfo} onClose={() => setClickInfo(null)} />
      )}
    </div>
  );
}
