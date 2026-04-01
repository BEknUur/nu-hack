import { useEffect, useRef } from 'react';
import { getBuildingMetadata } from '@/services/buildingDetails';
import { predictBestSide } from '@/services/bestSidePrediction';
import { findBuildingAtPoint } from '@/utils/buildings';
import type { SelectedBuilding } from '@/types/building';
import type { ClickInfo } from '@/types/map';
import type { MapEngineController } from '@/types/map-engine';
import type { ShadowEngineController } from '@/types/shadow-engine';

interface UseMapInfoClickArgs {
  enabled: boolean;
  buildingsRef: React.RefObject<GeoJSON.Feature[]>;
  controller: MapEngineController;
  shadow: ShadowEngineController | null;
  dateStr: string;
  setClickInfo: React.Dispatch<React.SetStateAction<ClickInfo | null>>;
  setSelectedBuilding: React.Dispatch<React.SetStateAction<SelectedBuilding | null>>;
  suppressNextMapClickRef: React.RefObject<boolean>;
}

export function useMapInfoClick({
  enabled,
  buildingsRef,
  controller,
  shadow,
  dateStr,
  setClickInfo,
  setSelectedBuilding,
  suppressNextMapClickRef,
}: UseMapInfoClickArgs) {
  const menuRequestIdRef = useRef(0);

  useEffect(() => {
    const handleClick = (point: { lat: number; lng: number }) => {
      if (!enabled) return;
      if (suppressNextMapClickRef.current) {
        suppressNextMapClickRef.current = false;
        return;
      }

      const requestId = menuRequestIdRef.current + 1;
      menuRequestIdRef.current = requestId;
      const pickedBuilding = findBuildingAtPoint(buildingsRef.current, point);
      setSelectedBuilding(pickedBuilding);
      if (!shadow) return;
      const screenPoint = controller.getContainerPoint(point);
      if (!screenPoint) return;

      setClickInfo({
        lat: point.lat,
        lng: point.lng,
        screenX: screenPoint.x,
        screenY: screenPoint.y,
        inSun: null,
        buildingId: pickedBuilding?.id ?? null,
        buildingLabel: pickedBuilding?.label ?? null,
        complexName: null,
        address: null,
        buildingInfoLoading: Boolean(pickedBuilding?.id),
        photoUrl: null,
        photoPlaceName: null,
        predictedBestSide: null,
        predictedConfidence: null,
        predictionLoading: Boolean(pickedBuilding?.id),
      });

      if (pickedBuilding?.id) {
        getBuildingMetadata(pickedBuilding.id, point.lat, point.lng)
          .then((meta) => {
            if (menuRequestIdRef.current !== requestId) return;
            setClickInfo((prev) => (prev ? {
              ...prev,
              complexName: meta.complexName,
              address: meta.address,
              photoUrl: meta.photoUrl,
              photoPlaceName: meta.photoPlaceName,
              buildingInfoLoading: false,
            } : null));
          })
          .catch(() => {
            if (menuRequestIdRef.current !== requestId) return;
            setClickInfo((prev) => (prev ? { ...prev, buildingInfoLoading: false } : null));
          });

        predictBestSide(pickedBuilding, dateStr)
          .then((prediction) => {
            if (menuRequestIdRef.current !== requestId) return;
            setClickInfo((prev) => (prev ? {
              ...prev,
              predictedBestSide: prediction.best_side,
              predictedConfidence: prediction.confidence,
              predictionLoading: false,
            } : null));
          })
          .catch(() => {
            if (menuRequestIdRef.current !== requestId) return;
            setClickInfo((prev) => (prev ? { ...prev, predictionLoading: false } : null));
          });
      }

      shadow.isPositionInSun(screenPoint)
        .then((inSun: boolean) => {
          if (menuRequestIdRef.current !== requestId) return;
          setClickInfo((prev) => (prev ? { ...prev, inSun } : null));
        })
        .catch(() => setClickInfo(null));
    };

    const unsubscribeClick = controller.onClick(handleClick);
    return () => {
      unsubscribeClick();
    };
  }, [
    buildingsRef,
    controller,
    dateStr,
    enabled,
    setClickInfo,
    setSelectedBuilding,
    shadow,
    suppressNextMapClickRef,
  ]);
}
