import { useEffect, type Dispatch, type RefObject, type SetStateAction } from 'react';
import maplibregl from 'maplibre-gl';
import type { RankAreaGeometry, TreeDrawMode } from '@/types/tree-optimizer';
import {
  circleToPolygon,
  ensureWorkerZoneGeometry,
  estimateGeometryAreaKm2,
  freehandToPolygon,
  polygonFromVertices,
  rectangleToPolygon,
} from '@/utils/treeArea';

export interface UseMapLibreWorkerAreaDrawingParams {
  engine: string;
  enabled: boolean;
  rawMapRef: RefObject<unknown>;
  drawMode: TreeDrawMode;
  setWorkerDrawing: Dispatch<SetStateAction<boolean>>;
  setWorkerDraftGeometry: Dispatch<SetStateAction<RankAreaGeometry | null>>;
  setWorkerAreaGeometry: Dispatch<SetStateAction<RankAreaGeometry | null>>;
  setWorkerAreaKm2: Dispatch<SetStateAction<number | null>>;
  setWorkerDrawArmed: Dispatch<SetStateAction<boolean>>;
  setWorkerAreaStep: Dispatch<SetStateAction<'shape' | 'drawing'>>;
}

export function useMapLibreWorkerAreaDrawing({
  engine,
  enabled,
  rawMapRef,
  drawMode,
  setWorkerDrawing,
  setWorkerDraftGeometry,
  setWorkerAreaGeometry,
  setWorkerAreaKm2,
  setWorkerDrawArmed,
  setWorkerAreaStep,
}: UseMapLibreWorkerAreaDrawingParams) {
  useEffect(() => {
    if (engine !== 'maplibre' || !enabled) return;
    const map = rawMapRef.current as maplibregl.Map | null;
    if (!map) return;

    let isMouseDown = false;
    let startPoint: [number, number] | null = null;
    let polygonPoints: [number, number][] = [];
    let freehandPoints: [number, number][] = [];

    map.getCanvas().style.cursor = 'crosshair';

    const beginDrawing = () => {
      setWorkerDrawing(true);
      setWorkerDraftGeometry(null);
      map.dragPan.disable();
      map.doubleClickZoom.disable();
    };

    const finishDrawing = (geometry: RankAreaGeometry | null, cancelled = false) => {
      if (geometry) {
        const fixed = ensureWorkerZoneGeometry(geometry);
        setWorkerAreaGeometry(fixed);
        setWorkerAreaKm2(estimateGeometryAreaKm2(fixed));
      } else if (!cancelled) {
        setWorkerAreaGeometry(null);
        setWorkerAreaKm2(null);
      }
      setWorkerDraftGeometry(null);
      setWorkerDrawArmed(false);
      setWorkerDrawing(false);
      setWorkerAreaStep('shape');
      map.dragPan.enable();
      map.doubleClickZoom.enable();
      map.getCanvas().style.cursor = '';
    };

    const onMouseDown = (event: maplibregl.MapMouseEvent) => {
      if (drawMode !== 'rectangle' && drawMode !== 'circle' && drawMode !== 'freehand') return;

      if (drawMode === 'freehand') {
        beginDrawing();
        isMouseDown = true;
        const p: [number, number] = [event.lngLat.lng, event.lngLat.lat];
        freehandPoints = [p];
        return;
      }

      beginDrawing();
      isMouseDown = true;
      startPoint = [event.lngLat.lng, event.lngLat.lat];
      setWorkerDraftGeometry(null);
    };

    const onMouseMove = (event: maplibregl.MapMouseEvent) => {
      if (!isMouseDown) {
        if (drawMode === 'polygon' && polygonPoints.length >= 2) {
          const preview = polygonFromVertices([
            ...polygonPoints,
            [event.lngLat.lng, event.lngLat.lat],
          ]);
          if (preview) setWorkerDraftGeometry(preview);
        }
        return;
      }

      if (drawMode === 'rectangle' && startPoint) {
        const geometry = rectangleToPolygon(startPoint, [event.lngLat.lng, event.lngLat.lat]);
        setWorkerDraftGeometry(geometry);
      }

      if (drawMode === 'circle' && startPoint) {
        const current: [number, number] = [event.lngLat.lng, event.lngLat.lat];
        const radiusMeters = maplibregl.LngLat.convert(startPoint).distanceTo(maplibregl.LngLat.convert(current));
        const geometry = circleToPolygon(startPoint, Math.max(4, radiusMeters));
        setWorkerDraftGeometry(geometry);
      }

      if (drawMode === 'freehand') {
        const point: [number, number] = [event.lngLat.lng, event.lngLat.lat];
        const last = freehandPoints[freehandPoints.length - 1];
        if (!last || maplibregl.LngLat.convert(last).distanceTo(maplibregl.LngLat.convert(point)) > 4) {
          freehandPoints.push(point);
          const geometry = freehandToPolygon(freehandPoints);
          if (geometry) setWorkerDraftGeometry(geometry);
        }
      }
    };

    const onMouseUp = (event: maplibregl.MapMouseEvent) => {
      if (!isMouseDown) return;
      isMouseDown = false;

      if (drawMode === 'rectangle' && startPoint) {
        const geometry = rectangleToPolygon(startPoint, [event.lngLat.lng, event.lngLat.lat]);
        finishDrawing(geometry);
        startPoint = null;
        return;
      }

      if (drawMode === 'circle' && startPoint) {
        const current: [number, number] = [event.lngLat.lng, event.lngLat.lat];
        const radiusMeters = maplibregl.LngLat.convert(startPoint).distanceTo(maplibregl.LngLat.convert(current));
        const geometry = circleToPolygon(startPoint, Math.max(4, radiusMeters));
        finishDrawing(geometry);
        startPoint = null;
        return;
      }

      if (drawMode === 'freehand') {
        const geometry = freehandToPolygon(freehandPoints);
        finishDrawing(geometry);
        freehandPoints = [];
      }
    };

    const onClick = (event: maplibregl.MapMouseEvent) => {
      if (drawMode !== 'polygon') return;
      if (polygonPoints.length === 0) {
        beginDrawing();
      }
      polygonPoints = [...polygonPoints, [event.lngLat.lng, event.lngLat.lat]];
      const geometry = polygonFromVertices(polygonPoints);
      if (geometry) setWorkerDraftGeometry(geometry);
    };

    const onDoubleClick = (event: maplibregl.MapMouseEvent & { originalEvent?: Event }) => {
      if (drawMode !== 'polygon') return;
      event.originalEvent?.preventDefault();
      const geometry = polygonFromVertices(polygonPoints);
      finishDrawing(geometry);
      polygonPoints = [];
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      isMouseDown = false;
      polygonPoints = [];
      freehandPoints = [];
      startPoint = null;
      finishDrawing(null, true);
    };

    map.on('mousedown', onMouseDown);
    map.on('mousemove', onMouseMove);
    map.on('mouseup', onMouseUp);
    map.on('click', onClick);
    map.on('dblclick', onDoubleClick);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      map.off('mousedown', onMouseDown);
      map.off('mousemove', onMouseMove);
      map.off('mouseup', onMouseUp);
      map.off('click', onClick);
      map.off('dblclick', onDoubleClick);
      window.removeEventListener('keydown', onKeyDown);
      map.dragPan.enable();
      map.doubleClickZoom.enable();
      map.getCanvas().style.cursor = '';
      setWorkerDrawing(false);
      setWorkerDraftGeometry(null);
    };
  }, [
    engine,
    enabled,
    rawMapRef,
    drawMode,
    setWorkerDrawing,
    setWorkerDraftGeometry,
    setWorkerAreaGeometry,
    setWorkerAreaKm2,
    setWorkerDrawArmed,
    setWorkerAreaStep,
  ]);
}
