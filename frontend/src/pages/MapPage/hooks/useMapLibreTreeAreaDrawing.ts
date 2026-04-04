import { useEffect, type Dispatch, type RefObject, type SetStateAction } from 'react';
import maplibregl from 'maplibre-gl';
import type { TreeWizardStep } from '@/components/TreeOptimizerWizard';
import type { RankAreaGeometry, TreeDrawMode } from '@/types/tree-optimizer';
import {
  circleToPolygon,
  freehandToPolygon,
  polygonFromVertices,
  rectangleToPolygon,
} from '@/utils/treeArea';

export interface UseMapLibreTreeAreaDrawingParams {
  engine: string;
  enabled: boolean;
  rawMapRef: RefObject<unknown>;
  drawMode: TreeDrawMode;
  applyTreeAreaGeometry: (geometry: RankAreaGeometry | null) => void;
  areaMissingMessage: string;
  setTreeDrawing: Dispatch<SetStateAction<boolean>>;
  setTreeDraftGeometry: Dispatch<SetStateAction<RankAreaGeometry | null>>;
  setTreeExplainError: Dispatch<SetStateAction<string | null>>;
  setTreeError: Dispatch<SetStateAction<string | null>>;
  setTreeDrawArmed: Dispatch<SetStateAction<boolean>>;
  setTreeWizardStep: Dispatch<SetStateAction<TreeWizardStep>>;
}

export function useMapLibreTreeAreaDrawing({
  engine,
  enabled,
  rawMapRef,
  drawMode,
  applyTreeAreaGeometry,
  areaMissingMessage,
  setTreeDrawing,
  setTreeDraftGeometry,
  setTreeExplainError,
  setTreeError,
  setTreeDrawArmed,
  setTreeWizardStep,
}: UseMapLibreTreeAreaDrawingParams) {
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
      setTreeDrawing(true);
      setTreeDraftGeometry(null);
      setTreeExplainError(null);
      map.dragPan.disable();
      map.doubleClickZoom.disable();
    };

    const finishDrawing = (geometry: RankAreaGeometry | null, cancelled = false) => {
      if (geometry) {
        applyTreeAreaGeometry(geometry);
        setTreeWizardStep('settings');
      } else if (!cancelled) {
        setTreeError(areaMissingMessage);
        setTreeWizardStep('shape');
      }
      setTreeDraftGeometry(null);
      setTreeDrawArmed(false);
      setTreeDrawing(false);
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
      setTreeDraftGeometry(null);
    };

    const onMouseMove = (event: maplibregl.MapMouseEvent) => {
      if (!isMouseDown) {
        if (drawMode === 'polygon' && polygonPoints.length >= 2) {
          const preview = polygonFromVertices([
            ...polygonPoints,
            [event.lngLat.lng, event.lngLat.lat],
          ]);
          if (preview) setTreeDraftGeometry(preview);
        }
        return;
      }

      if (drawMode === 'rectangle' && startPoint) {
        const geometry = rectangleToPolygon(startPoint, [event.lngLat.lng, event.lngLat.lat]);
        setTreeDraftGeometry(geometry);
      }

      if (drawMode === 'circle' && startPoint) {
        const current: [number, number] = [event.lngLat.lng, event.lngLat.lat];
        const radiusMeters = maplibregl.LngLat.convert(startPoint).distanceTo(maplibregl.LngLat.convert(current));
        const geometry = circleToPolygon(startPoint, Math.max(4, radiusMeters));
        setTreeDraftGeometry(geometry);
      }

      if (drawMode === 'freehand') {
        const point: [number, number] = [event.lngLat.lng, event.lngLat.lat];
        const last = freehandPoints[freehandPoints.length - 1];
        if (!last || maplibregl.LngLat.convert(last).distanceTo(maplibregl.LngLat.convert(point)) > 4) {
          freehandPoints.push(point);
          const geometry = freehandToPolygon(freehandPoints);
          if (geometry) setTreeDraftGeometry(geometry);
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
      if (geometry) setTreeDraftGeometry(geometry);
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
      polygonPoints = [];
      freehandPoints = [];
      startPoint = null;
      finishDrawing(null, true);
      setTreeWizardStep('shape');
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
      setTreeDrawing(false);
      setTreeDraftGeometry(null);
    };
  }, [
    engine,
    enabled,
    rawMapRef,
    drawMode,
    applyTreeAreaGeometry,
    areaMissingMessage,
    setTreeDrawing,
    setTreeDraftGeometry,
    setTreeExplainError,
    setTreeError,
    setTreeDrawArmed,
    setTreeWizardStep,
  ]);
}
