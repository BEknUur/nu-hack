import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import type { RankAreaGeometry, TreeDrawMode } from '@/types/tree-optimizer';
import {
  circleToPolygon,
  freehandToPolygon,
  polygonFromVertices,
  rectangleToPolygon,
} from '@/utils/treeArea';

interface UseMapLibreAreaDrawingArgs {
  enabled: boolean;
  rawMapRef: React.RefObject<unknown>;
  drawMode: TreeDrawMode;
  onBegin: () => void;
  onPreview: (geometry: RankAreaGeometry | null) => void;
  onFinish: (geometry: RankAreaGeometry | null, cancelled: boolean) => void;
}

export function useMapLibreAreaDrawing({
  enabled,
  rawMapRef,
  drawMode,
  onBegin,
  onPreview,
  onFinish,
}: UseMapLibreAreaDrawingArgs) {
  const onBeginRef = useRef(onBegin);
  const onPreviewRef = useRef(onPreview);
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    onBeginRef.current = onBegin;
  }, [onBegin]);

  useEffect(() => {
    onPreviewRef.current = onPreview;
  }, [onPreview]);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let rafId = 0;
    let cleanupMap: (() => void) | null = null;

    const attachWhenReady = () => {
      if (cancelled) return;

      const map = rawMapRef.current as maplibregl.Map | null;
      if (!map || typeof map.on !== 'function' || typeof map.getCanvas !== 'function') {
        rafId = window.requestAnimationFrame(attachWhenReady);
        return;
      }

      let isMouseDown = false;
      let startPoint: [number, number] | null = null;
      let polygonPoints: [number, number][] = [];
      let freehandPoints: [number, number][] = [];

      map.getCanvas().style.cursor = 'crosshair';

      const beginDrawing = () => {
        onBeginRef.current();
        map.dragPan.disable();
        map.doubleClickZoom.disable();
      };

      const finishDrawing = (geometry: RankAreaGeometry | null, cancelledDrawing = false) => {
        onFinishRef.current(geometry, cancelledDrawing);
        map.dragPan.enable();
        map.doubleClickZoom.enable();
        map.getCanvas().style.cursor = '';
      };

      const onMouseDown = (event: maplibregl.MapMouseEvent) => {
        if (drawMode !== 'rectangle' && drawMode !== 'circle' && drawMode !== 'freehand') return;
        beginDrawing();
        isMouseDown = true;
        const point: [number, number] = [event.lngLat.lng, event.lngLat.lat];
        if (drawMode === 'freehand') {
          freehandPoints = [point];
        } else {
          startPoint = point;
        }
        onPreviewRef.current(null);
      };

      const onMouseMove = (event: maplibregl.MapMouseEvent) => {
        if (!isMouseDown) {
          if (drawMode === 'polygon' && polygonPoints.length >= 2) {
            onPreviewRef.current(polygonFromVertices([...polygonPoints, [event.lngLat.lng, event.lngLat.lat]]));
          }
          return;
        }

        if (drawMode === 'rectangle' && startPoint) {
          onPreviewRef.current(rectangleToPolygon(startPoint, [event.lngLat.lng, event.lngLat.lat]));
        }

        if (drawMode === 'circle' && startPoint) {
          const current: [number, number] = [event.lngLat.lng, event.lngLat.lat];
          const radiusMeters = maplibregl.LngLat.convert(startPoint).distanceTo(maplibregl.LngLat.convert(current));
          onPreviewRef.current(circleToPolygon(startPoint, Math.max(4, radiusMeters)));
        }

        if (drawMode === 'freehand') {
          const point: [number, number] = [event.lngLat.lng, event.lngLat.lat];
          const last = freehandPoints[freehandPoints.length - 1];
          if (!last || maplibregl.LngLat.convert(last).distanceTo(maplibregl.LngLat.convert(point)) > 4) {
            freehandPoints.push(point);
            onPreviewRef.current(freehandToPolygon(freehandPoints));
          }
        }
      };

      const onMouseUp = (event: maplibregl.MapMouseEvent) => {
        if (!isMouseDown) return;
        isMouseDown = false;

        if (drawMode === 'rectangle' && startPoint) {
          finishDrawing(rectangleToPolygon(startPoint, [event.lngLat.lng, event.lngLat.lat]));
          startPoint = null;
          return;
        }

        if (drawMode === 'circle' && startPoint) {
          const current: [number, number] = [event.lngLat.lng, event.lngLat.lat];
          const radiusMeters = maplibregl.LngLat.convert(startPoint).distanceTo(maplibregl.LngLat.convert(current));
          finishDrawing(circleToPolygon(startPoint, Math.max(4, radiusMeters)));
          startPoint = null;
          return;
        }

        if (drawMode === 'freehand') {
          finishDrawing(freehandToPolygon(freehandPoints));
          freehandPoints = [];
        }
      };

      const onClick = (event: maplibregl.MapMouseEvent) => {
        if (drawMode !== 'polygon') return;
        if (polygonPoints.length === 0) {
          beginDrawing();
        }
        polygonPoints = [...polygonPoints, [event.lngLat.lng, event.lngLat.lat]];
        onPreviewRef.current(polygonFromVertices(polygonPoints));
      };

      const onDoubleClick = (event: maplibregl.MapMouseEvent & { originalEvent?: Event }) => {
        if (drawMode !== 'polygon') return;
        event.originalEvent?.preventDefault();
        finishDrawing(polygonFromVertices(polygonPoints));
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

      cleanupMap = () => {
        map.off('mousedown', onMouseDown);
        map.off('mousemove', onMouseMove);
        map.off('mouseup', onMouseUp);
        map.off('click', onClick);
        map.off('dblclick', onDoubleClick);
        window.removeEventListener('keydown', onKeyDown);
        map.dragPan.enable();
        map.doubleClickZoom.enable();
        map.getCanvas().style.cursor = '';
        onPreviewRef.current(null);
      };
    };

    attachWhenReady();

    return () => {
      cancelled = true;
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      cleanupMap?.();
    };
  }, [drawMode, enabled, rawMapRef]);
}
