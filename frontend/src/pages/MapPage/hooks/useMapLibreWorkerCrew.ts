import { useEffect, type Dispatch, type RefObject, type SetStateAction } from 'react';
import maplibregl from 'maplibre-gl';
import { EMPTY_FEATURE_COLLECTION } from '@/hooks/maplibre/constants';
import type { RankAreaGeometry } from '@/types/tree-optimizer';
import {
  buildWorkerFeatureCollection,
  getWorkerActivity,
  getWorkerRandomName,
  type SelectedWorkerInfo,
  type WorkerExposureStat,
  type WorkerFeatureProps,
  type WorkerTaskType,
} from '@/pages/MapPage/workerSimulation';

const WORKER_CREW_SOURCE_ID = 'worker-crew-source';
const WORKER_CREW_LAYER_ID = 'worker-crew-layer';

export interface UseMapLibreWorkerCrewParams {
  engine: string;
  rawMapRef: RefObject<unknown>;
  buildingsRef: RefObject<GeoJSON.Feature[]>;
  isWorkerMode: boolean;
  loadingBuildings: boolean;
  workerAreaGeometry: RankAreaGeometry | null;
  workerTaskType: WorkerTaskType;
  workerSimTick: number;
  zoom: number;
  selectedWorker: SelectedWorkerInfo | null;
  workerStats: Record<number, WorkerExposureStat>;
  setSelectedWorker: Dispatch<SetStateAction<SelectedWorkerInfo | null>>;
}

export function useMapLibreWorkerCrew({
  engine,
  rawMapRef,
  buildingsRef,
  isWorkerMode,
  loadingBuildings,
  workerAreaGeometry,
  workerTaskType,
  workerSimTick,
  zoom,
  selectedWorker,
  workerStats,
  setSelectedWorker,
}: UseMapLibreWorkerCrewParams) {
  useEffect(() => {
    if (engine !== 'maplibre') return;
    const map = rawMapRef.current as maplibregl.Map | null;
    if (!map) return;

    const upsertWorkers = () => {
      if (!map.getSource(WORKER_CREW_SOURCE_ID)) {
        map.addSource(WORKER_CREW_SOURCE_ID, {
          type: 'geojson',
          data: EMPTY_FEATURE_COLLECTION,
        });
      }
      if (!map.getLayer(WORKER_CREW_LAYER_ID)) {
        map.addLayer({
          id: WORKER_CREW_LAYER_ID,
          type: 'symbol',
          source: WORKER_CREW_SOURCE_ID,
          layout: {
            'text-field': ['get', 'emoji'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 10, 12, 14, 16, 18, 22],
            'text-allow-overlap': true,
            'text-ignore-placement': true,
          },
          paint: {
            'text-color': '#111827',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.2,
          },
        });
      }

      const source = map.getSource(WORKER_CREW_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (!source) return;

      if (!isWorkerMode) {
        source.setData(EMPTY_FEATURE_COLLECTION);
        return;
      }

      source.setData(
        buildWorkerFeatureCollection(
          workerAreaGeometry,
          workerTaskType,
          buildingsRef.current ?? [],
          workerSimTick,
        ),
      );

      if (map.getLayer(WORKER_CREW_LAYER_ID)) {
        try {
          map.moveLayer(WORKER_CREW_LAYER_ID);
        } catch {
          // style not fully ready
        }
      }
    };

    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    const onIdle = () => {
      if (!isWorkerMode || !workerAreaGeometry) return;
      if (idleTimer != null) window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        idleTimer = null;
        upsertWorkers();
      }, 150);
    };

    const onStyleLoad = () => {
      upsertWorkers();
    };

    map.on('idle', onIdle);

    if (map.isStyleLoaded()) {
      upsertWorkers();
    } else {
      map.once('load', onStyleLoad);
    }

    return () => {
      map.off('idle', onIdle);
      if (idleTimer != null) window.clearTimeout(idleTimer);
      map.off('load', onStyleLoad);
    };
  }, [
    engine,
    isWorkerMode,
    loadingBuildings,
    rawMapRef,
    workerAreaGeometry,
    workerTaskType,
    workerSimTick,
    zoom,
    buildingsRef,
  ]);

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
      const geometry = feature.geometry;
      const coords = geometry?.type === 'Point' ? geometry.coordinates : null;
      const parsedLng = Array.isArray(coords) ? Number(coords[0]) : null;
      const parsedLat = Array.isArray(coords) ? Number(coords[1]) : null;
      if (parsedLat == null || parsedLng == null || !Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return;
      setSelectedWorker({
        emoji: String(props.emoji ?? '👷'),
        worker_id: id,
        worker_name: String(props.worker_name ?? getWorkerRandomName(id, workerTaskType)),
        activity: String(props.activity ?? getWorkerActivity(workerTaskType)),
        lat: parsedLat,
        lng: parsedLng,
      });
    };

    const onMouseEnter = () => {
      if (!isWorkerMode) return;
      map.getCanvas().style.cursor = 'pointer';
    };
    const onMouseLeave = () => {
      map.getCanvas().style.cursor = '';
    };

    map.on('click', WORKER_CREW_LAYER_ID, onClickWorker);
    map.on('mouseenter', WORKER_CREW_LAYER_ID, onMouseEnter);
    map.on('mouseleave', WORKER_CREW_LAYER_ID, onMouseLeave);
    return () => {
      map.off('click', WORKER_CREW_LAYER_ID, onClickWorker);
      map.off('mouseenter', WORKER_CREW_LAYER_ID, onMouseEnter);
      map.off('mouseleave', WORKER_CREW_LAYER_ID, onMouseLeave);
      map.getCanvas().style.cursor = '';
    };
  }, [engine, rawMapRef, isWorkerMode, workerTaskType]);

  useEffect(() => {
    if (engine !== 'maplibre') return;
    if (!isWorkerMode || !selectedWorker) return;
    const map = rawMapRef.current as maplibregl.Map | null;
    if (!map) return;

    const stat = workerStats[selectedWorker.worker_id];
    const popupHtml = `
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
    `;

    const popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: '280px',
      offset: 20,
    })
      .setLngLat([selectedWorker.lng, selectedWorker.lat])
      .setHTML(popupHtml)
      .addTo(map);

    popup.on('close', () => {
      setSelectedWorker((prev) => (prev?.worker_id === selectedWorker.worker_id ? null : prev));
    });

    return () => {
      popup.remove();
    };
  }, [engine, isWorkerMode, rawMapRef, selectedWorker, workerStats]);
}
