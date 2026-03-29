import type React from 'react';
import type { ShadowEngineController, ScreenPoint } from '@/types/shadow-engine';

export type MapEngineKind = 'leaflet' | 'maplibre';

export interface MapPoint {
  lat: number;
  lng: number;
}

export interface MapBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface FlyToBoundsOptions {
  duration?: number;
  padding?: [number, number];
}

export interface PanToOptions {
  animate?: boolean;
  duration?: number;
}

export type MapInteractionHandler = (point: MapPoint) => void | Promise<void>;

export interface MapEngineController {
  isReady: () => boolean;
  getContainerPoint: (point: MapPoint) => ScreenPoint | null;
  flyToBounds: (bounds: MapBounds, options?: FlyToBoundsOptions) => void;
  panTo: (point: MapPoint, options?: PanToOptions) => void;
  onClick: (handler: MapInteractionHandler) => () => void;
  onContextMenu: (handler: MapInteractionHandler) => () => void;
}

export interface MapEngineState {
  engine: MapEngineKind;
  containerRef: React.RefObject<HTMLDivElement | null>;
  rawMapRef: React.RefObject<unknown>;
  buildingsRef: React.RefObject<GeoJSON.Feature[]>;
  controller: MapEngineController;
  shadow: ShadowEngineController | null;
  zoom: number;
}
