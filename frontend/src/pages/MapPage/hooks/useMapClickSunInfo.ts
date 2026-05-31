import { useEffect, type Dispatch, type MutableRefObject, type RefObject, type SetStateAction } from 'react';
import { getBuildingMetadata } from '@/services/buildingDetails';
import { predictBestSide } from '@/services/bestSidePrediction';
import { SUN_EXPOSURE_CONFIG } from '@/config/map';
import type { ClickInfo } from '@/types/map';
import type { SelectedBuilding } from '@/types/building';
import type { MapPoint } from '@/types/map-engine';
import type { ShadowEngineController } from '@/types/shadow-engine';
import { astanaLocalToDate } from '@/utils/astanaTime';
import { findBuildingAtPoint } from '@/utils/buildings';

interface MapEngineControllerLike {
  onClick: (handler: (point: MapPoint) => void) => () => void;
  getContainerPoint: (point: MapPoint) => { x: number; y: number } | null;
}

export interface UseMapClickSunInfoParams {
  shadow: ShadowEngineController | null;
  controller: MapEngineControllerLike;
  buildingsRef: RefObject<GeoJSON.Feature[]>;
  menuRequestIdRef: MutableRefObject<number>;
  suppressNextMapClickRef: MutableRefObject<boolean>;
  isTreeMode: boolean;
  isWorkerMode: boolean;
  workerDrawArmed: boolean;
  workerDrawing: boolean;
  sunExposure: boolean;
  dateStr: string;
  setSelectedBuilding: Dispatch<SetStateAction<SelectedBuilding | null>>;
  setClickInfo: Dispatch<SetStateAction<ClickInfo | null>>;
}

function getDailySunExposureRange(dateStr: string) {
  return {
    startDate: astanaLocalToDate(dateStr, SUN_EXPOSURE_CONFIG.startHour, 0),
    endDate: astanaLocalToDate(dateStr, SUN_EXPOSURE_CONFIG.endHour, 0),
    iterations: SUN_EXPOSURE_CONFIG.iterations,
  };
}

export function useMapClickSunInfo({
  shadow,
  controller,
  buildingsRef,
  menuRequestIdRef,
  suppressNextMapClickRef,
  isTreeMode,
  isWorkerMode,
  workerDrawArmed,
  workerDrawing,
  sunExposure,
  dateStr,
  setSelectedBuilding,
  setClickInfo,
}: UseMapClickSunInfoParams) {
  useEffect(() => {
    function handleClick(point: MapPoint) {
      if (isTreeMode) return;
      if (isWorkerMode && (workerDrawArmed || workerDrawing)) return;
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
        sunHours: null,
        sunHoursLoading: sunExposure,
        sunHoursAvailable: sunExposure,
      });

      if (pickedBuilding?.id) {
        getBuildingMetadata(pickedBuilding.id, point.lat, point.lng)
          .then((meta) => {
            if (menuRequestIdRef.current !== requestId) return;
            setClickInfo((prev) => (prev
              ? {
                  ...prev,
                  complexName: meta.complexName,
                  address: meta.address,
                  photoUrl: meta.photoUrl,
                  photoPlaceName: meta.photoPlaceName,
                  buildingInfoLoading: false,
                }
              : null));
          })
          .catch(() => {
            if (menuRequestIdRef.current !== requestId) return;
            setClickInfo((prev) => (prev
              ? {
                  ...prev,
                  buildingInfoLoading: false,
                }
              : null));
          });

        predictBestSide(pickedBuilding, dateStr)
          .then((prediction) => {
            if (menuRequestIdRef.current !== requestId) return;
            setClickInfo((prev) => (prev
              ? {
                  ...prev,
                  predictedBestSide: prediction.best_side,
                  predictedConfidence: prediction.confidence,
                  predictionLoading: false,
                }
              : null));
          })
          .catch(() => {
            if (menuRequestIdRef.current !== requestId) return;
            setClickInfo((prev) => (prev
              ? {
                  ...prev,
                  predictionLoading: false,
                }
              : null));
          });
      }

      shadow.isPositionInSun(screenPoint)
        .then((inSun: boolean) => {
          if (menuRequestIdRef.current !== requestId) return;
          setClickInfo((prev) => (prev
            ? {
                ...prev,
                inSun,
              }
            : null));
        })
        .catch(() => setClickInfo(null));

      if (sunExposure) {
        shadow.setSunExposure(true, getDailySunExposureRange(dateStr))
          .then(() => shadow.getHoursOfSun(screenPoint))
          .then((sunHours) => {
            if (menuRequestIdRef.current !== requestId) return;
            setClickInfo((prev) => (prev
              ? {
                  ...prev,
                  sunHours: Number.isFinite(sunHours) ? sunHours : null,
                  sunHoursLoading: false,
                  sunHoursAvailable: true,
                }
              : null));
          })
          .catch(() => {
            if (menuRequestIdRef.current !== requestId) return;
            setClickInfo((prev) => (prev
              ? {
                  ...prev,
                  sunHours: null,
                  sunHoursLoading: false,
                  sunHoursAvailable: true,
                }
              : null));
          });
      }
    }

    const unsubscribeClick = controller.onClick(handleClick);
    return () => {
      unsubscribeClick();
    };
  }, [shadow, controller, buildingsRef, dateStr, sunExposure, isTreeMode, isWorkerMode, workerDrawArmed, workerDrawing]);
}
