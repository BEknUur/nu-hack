export interface BuildingPolygon {
  outer: [number, number][];
  holes: [number, number][][];
}

export interface SelectedBuilding {
  id: string;
  label: string;
  center: {
    lat: number;
    lng: number;
  };
  height: number;
  levels: number | null;
  area: number;
  kind: string | null;
  polygons: BuildingPolygon[];
}
