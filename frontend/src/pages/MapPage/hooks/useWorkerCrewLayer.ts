import { useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import { EMPTY_FEATURE_COLLECTION } from '@/hooks/maplibre/constants';
import { WORKER_LAYER_ID, WORKER_SOURCE_ID } from '@/pages/MapPage/constants';
import { buildWorkerFeatureCollection } from '@/pages/MapPage/workerSimulation';
import type { RankAreaGeometry } from '@/types/tree-optimizer';

interface UseWorkerCrewLayerArgs {
  engine: string;
  rawMapRef: React.RefObject<unknown>;
  buildingsRef: React.RefObject<GeoJSON.Feature[]>;
  isWorkerMode: boolean;
  workerAreaGeometry: RankAreaGeometry | null;
  workerTaskType: 'facade_maintenance' | 'road_repair';
  workerSimTick: number;
}

export function useWorkerCrewLayer({
  engine,
  rawMapRef,
  buildingsRef,
  isWorkerMode,
  workerAreaGeometry,
  workerTaskType,
  workerSimTick,
}: UseWorkerCrewLayerArgs) {
  useEffect(() => {
    if (engine !== 'maplibre') return;
    const map = rawMapRef.current as maplibregl.Map | null;
    if (!map) return;

    const upsertWorkers = () => {
      if (!map.getSource(WORKER_SOURCE_ID)) {
        map.addSource(WORKER_SOURCE_ID, {
          type: 'geojson',
          data: EMPTY_FEATURE_COLLECTION,
        });
      }
      if (!map.getLayer(WORKER_LAYER_ID)) {
        map.addLayer({
          id: WORKER_LAYER_ID,
          type: 'symbol',
          source: WORKER_SOURCE_ID,
          layout: {
            'text-field': ['get', 'emoji'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 12, 14, 17, 20],
            'text-allow-overlap': true,
          },
          paint: {
            'text-color': '#111827',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.2,
          },
        });
      }

      const source = map.getSource(WORKER_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (!source) return;

      if (!isWorkerMode) {
        source.setData(EMPTY_FEATURE_COLLECTION);
        return;
      }

      source.setData(
        buildWorkerFeatureCollection(
          workerAreaGeometry,
          workerTaskType,
          buildingsRef.current,
          workerSimTick,
        ),
      );
    };

    if (map.isStyleLoaded()) {
      upsertWorkers();
      return;
    }
    map.once('load', upsertWorkers);
  }, [buildingsRef, engine, isWorkerMode, rawMapRef, workerAreaGeometry, workerSimTick, workerTaskType]);
}
