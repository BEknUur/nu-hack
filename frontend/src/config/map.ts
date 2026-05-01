export const MAP_CONFIG = {
  center: [43.238, 76.945] as [number, number],
  zoom: 14,
  buildingsMinZoom: 15,
  tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  tileAttribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
} as const;

export const SHADE_CONFIG = {
  color: '#01112f',
  opacity: 0.75,
} as const;

export const TERRAIN_SOURCE = {
  tileSize: 256,
  maxZoom: 15,
  getSourceUrl: ({ x, y, z }: { x: number; y: number; z: number }): string =>
    `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`,
  getElevation: ({ r, g, b }: { r: number; g: number; b: number; a: number }): number =>
    r * 256 + g + b / 256 - 32768,
};

export const SUN_EXPOSURE_CONFIG = {
  startHour: 6,
  endHour: 20,
  iterations: 32,
} as const;
