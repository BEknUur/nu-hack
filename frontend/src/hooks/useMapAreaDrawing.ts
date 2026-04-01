import { useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import {
  circleToPolygon,
  freehandToPolygon,
  polygonFromVertices,
  rectangleToPolygon,
} from '@/utils/treeArea';
import type { RankAreaGeometry, TreeDrawMode } from '@/types/tree-optimizer';

interface UseMapAreaDrawingOptions {
  enabled: boolean;
  map: maplibregl.Map | null;
  drawMode: TreeDrawMode;
  onDraftChange: (geometry: RankAreaGeometry | null) => void;
  onDrawingChange: (drawing: boolean) => void;
  onComplete: (geometry: RankAreaGeometry | null, cancelled: boolean) => void;
}

export function useMapAreaDrawing({
  enabled,
  map,
  drawMode,
  onDraftChange,
  onDrawingChange,
  onComplete,
}: UseMapAreaDrawingOptions) {
  useEffect(() => {
    if (!enabled || !map) return;

    let isMouseDown = false;
    let startPoint: [number, number] | null = null;
    let polygonPoints: [number, number][] = [];
    let freehandPoints: [number, number][] = [];

    map.getCanvas().style.cursor = 'crosshair';

    const beginDrawing = () => {
      onDrawingChange(true);
      onDraftChange(null);
      map.dragPan.disable();
      map.doubleClickZoom.disable();
    };

    const finishDrawing = (geometry: RankAreaGeometry | null, cancelled = false) => {
      onComplete(geometry, cancelled);
      onDraftChange(null);
      onDrawingChange(false);
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
      onDraftChange(null);
    };

    const onMouseMove = (event: maplibregl.MapMouseEvent) => {
      if (!isMouseDown) {
        if (drawMode === 'polygon' && polygonPoints.length >= 2) {
          const preview = polygonFromVertices([
            ...polygonPoints,
            [event.lngLat.lng, event.lngLat.lat],
          ]);
          if (preview) onDraftChange(preview);
        }
        return;
      }

      if (drawMode === 'rectangle' && startPoint) {
        onDraftChange(rectangleToPolygon(startPoint, [event.lngLat.lng, event.lngLat.lat]));
      }

      if (drawMode === 'circle' && startPoint) {
        const current: [number, number] = [event.lngLat.lng, event.lngLat.lat];
        const radiusMeters = maplibregl.LngLat.convert(startPoint).distanceTo(maplibregl.LngLat.convert(current));
        onDraftChange(circleToPolygon(startPoint, Math.max(4, radiusMeters)));
      }

      if (drawMode === 'freehand') {
        const point: [number, number] = [event.lngLat.lng, event.lngLat.lat];
        const last = freehandPoints[freehandPoints.length - 1];
        if (!last || maplibregl.LngLat.convert(last).distanceTo(maplibregl.LngLat.convert(point)) > 4) {
          freehandPoints.push(point);
          const geometry = freehandToPolygon(freehandPoints);
          if (geometry) onDraftChange(geometry);
        }
      }
    };

    const onMouseUp = (event: maplibregl.MapMouseEvent) => {
      if (!isMouseDown) return;
      isMouseDown = false;

      if (drawMode === 'rectangle' && startPoint) {
        const geometry = rectangleToPolygon(startPoint, [event.lngLat.lng, event.lngLat.lat]);
        finishDrawing(geometry, false);
        startPoint = null;
        return;
      }

      if (drawMode === 'circle' && startPoint) {
        const current: [number, number] = [event.lngLat.lng, event.lngLat.lat];
        const radiusMeters = maplibregl.LngLat.convert(startPoint).distanceTo(maplibregl.LngLat.convert(current));
        finishDrawing(circleToPolygon(startPoint, Math.max(4, radiusMeters)), false);
        startPoint = null;
        return;
      }

      if (drawMode === 'freehand') {
        finishDrawing(freehandToPolygon(freehandPoints), false);
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
      if (geometry) onDraftChange(geometry);
    };

    const onDoubleClick = (event: maplibregl.MapMouseEvent & { originalEvent?: Event }) => {
      if (drawMode !== 'polygon') return;
      event.originalEvent?.preventDefault();
      finishDrawing(polygonFromVertices(polygonPoints), false);
      polygonPoints = [];
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
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
      onDrawingChange(false);
      onDraftChange(null);
    };
  }, [drawMode, enabled, map, onComplete, onDraftChange, onDrawingChange]);
}
