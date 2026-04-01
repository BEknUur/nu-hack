import { useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import { WORKER_LAYER_ID } from '@/pages/MapPage/constants';
import {
  getWorkerActivity,
  getWorkerRandomName,
  type SelectedWorkerInfo,
  type WorkerFeatureProps,
  type WorkerTaskType,
} from '@/pages/MapPage/workerSimulation';

interface UseWorkerInteractionsArgs {
  engine: string;
  rawMapRef: React.RefObject<unknown>;
  isWorkerMode: boolean;
  workerTaskType: WorkerTaskType;
  selectedWorker: SelectedWorkerInfo | null;
  workerStats: Record<number, { sunMinutes: number; shadeMinutes: number; focusScore: number }>;
  setSelectedWorker: React.Dispatch<React.SetStateAction<SelectedWorkerInfo | null>>;
}

export function useWorkerInteractions({
  engine,
  rawMapRef,
  isWorkerMode,
  workerTaskType,
  selectedWorker,
  workerStats,
  setSelectedWorker,
}: UseWorkerInteractionsArgs) {
  useEffect(() => {
    if (engine !== 'maplibre') return;
    const map = rawMapRef.current as maplibregl.Map | null;
    if (!map) return;

    const onClickWorker = (event: maplibregl.MapLayerMouseEvent) => {
      if (!isWorkerMode) return;
      const feature = event.features?.[0];
      if (!feature) return;
      const props = (feature.properties ?? {}) as Partial<WorkerFeatureProps>;
      const id = Number(props.worker_id ?? 0);
      if (!id) return;
      const coords = feature.geometry?.type === 'Point' ? feature.geometry.coordinates : null;
      const lng = Array.isArray(coords) ? Number(coords[0]) : null;
      const lat = Array.isArray(coords) ? Number(coords[1]) : null;
      if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
      setSelectedWorker({
        emoji: String(props.emoji ?? '👷'),
        worker_id: id,
        worker_name: String(props.worker_name ?? getWorkerRandomName(id, workerTaskType)),
        activity: String(props.activity ?? getWorkerActivity(workerTaskType)),
        lat,
        lng,
      });
    };

    const onMouseEnter = () => {
      if (!isWorkerMode) return;
      map.getCanvas().style.cursor = 'pointer';
    };

    const onMouseLeave = () => {
      map.getCanvas().style.cursor = '';
    };

    map.on('click', WORKER_LAYER_ID, onClickWorker);
    map.on('mouseenter', WORKER_LAYER_ID, onMouseEnter);
    map.on('mouseleave', WORKER_LAYER_ID, onMouseLeave);
    return () => {
      map.off('click', WORKER_LAYER_ID, onClickWorker);
      map.off('mouseenter', WORKER_LAYER_ID, onMouseEnter);
      map.off('mouseleave', WORKER_LAYER_ID, onMouseLeave);
      map.getCanvas().style.cursor = '';
    };
  }, [engine, isWorkerMode, rawMapRef, setSelectedWorker, workerTaskType]);

  useEffect(() => {
    if (engine !== 'maplibre' || !isWorkerMode || !selectedWorker) return;
    const map = rawMapRef.current as maplibregl.Map | null;
    if (!map) return;

    const stat = workerStats[selectedWorker.worker_id];
    const popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: '280px',
      offset: 20,
    })
      .setLngLat([selectedWorker.lng, selectedWorker.lat])
      .setHTML(`
        <div style="min-width:230px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;color:#172033;">
          <div style="font-size:11px;color:#5b6b84;margin-bottom:4px;">Worker details</div>
          <div style="font-size:15px;font-weight:700;line-height:1.3;">
            ${selectedWorker.emoji} ${selectedWorker.worker_name}
          </div>
          <div style="margin-top:4px;font-size:12px;color:#3d4f6a;">
            ID: ${selectedWorker.worker_id} · ${selectedWorker.activity}
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px;">
            <div style="border:1px solid #d6deea;border-radius:8px;padding:6px 7px;background:#fff;">
              <div style="font-size:10px;color:#5b6b84;">Sun</div>
              <div style="font-size:12px;font-weight:600;color:#172033;">${stat?.sunMinutes ?? 0} min</div>
            </div>
            <div style="border:1px solid #d6deea;border-radius:8px;padding:6px 7px;background:#fff;">
              <div style="font-size:10px;color:#5b6b84;">Shade</div>
              <div style="font-size:12px;font-weight:600;color:#172033;">${stat?.shadeMinutes ?? 0} min</div>
            </div>
            <div style="border:1px solid #d6deea;border-radius:8px;padding:6px 7px;background:#fff;">
              <div style="font-size:10px;color:#5b6b84;">Focus</div>
              <div style="font-size:12px;font-weight:600;color:#172033;">${(stat?.focusScore ?? 0).toFixed(1)}</div>
            </div>
          </div>
        </div>
      `)
      .addTo(map);

    popup.on('close', () => {
      setSelectedWorker((prev) => (prev?.worker_id === selectedWorker.worker_id ? null : prev));
    });

    return () => {
      popup.remove();
    };
  }, [engine, isWorkerMode, rawMapRef, selectedWorker, setSelectedWorker, workerStats]);
}
