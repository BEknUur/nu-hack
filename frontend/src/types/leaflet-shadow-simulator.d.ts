declare module 'leaflet-shadow-simulator' {
  import { Map } from 'leaflet';

  interface TerrainSource {
    tileSize: number;
    maxZoom: number;
    getSourceUrl: (coords: { x: number; y: number; z: number }) => string;
    getElevation: (pixel: { r: number; g: number; b: number; a: number }) => number;
  }

  interface SunExposureOptions {
    startDate: Date;
    endDate: Date;
    iterations?: number;
  }

  interface ShadeMapOptions {
    apiKey: string;
    date?: Date;
    color?: string;
    opacity?: number;
    terrainSource?: TerrainSource;
    getFeatures?: () => Promise<object[]>;
  }

  class ShadeMap {
    constructor(options: ShadeMapOptions);
    addTo(map: Map): this;
    onAdd(map: Map): this;
    onRemove(): this;
    setDate(date: Date): this;
    setColor(color: string): this;
    setOpacity(opacity: number): this;
    setSunExposure(enabled: boolean, options: SunExposureOptions): Promise<this>;
    isPositionInSun(x: number, y: number): Promise<boolean>;
    isPositionInShade(x: number, y: number): Promise<boolean>;
    on(event: string, listener: (...args: unknown[]) => void): () => void;
    once(event: string, listener: (...args: unknown[]) => void): () => void;
    removeAllListeners(): void;
  }

  export default ShadeMap;
}

declare module 'osmtogeojson' {
  function osmtogeojson(data: unknown): GeoJSON.FeatureCollection;
  export = osmtogeojson;
}
