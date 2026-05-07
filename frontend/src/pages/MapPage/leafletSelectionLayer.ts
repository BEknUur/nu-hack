import L from 'leaflet';
import type { SelectedBuilding } from '@/types/building';

export function renderLeafletSelectedBuildingLayer(
  map: L.Map,
  selectedBuilding: SelectedBuilding,
): L.LayerGroup {
  const layerGroup = L.layerGroup();

  selectedBuilding.polygons.forEach((polygon) => {
    const latLngRings = [
      polygon.outer.map(([lng, lat]) => [lat, lng] as [number, number]),
      ...polygon.holes.map((hole) => hole.map(([lng, lat]) => [lat, lng] as [number, number])),
    ];

    L.polygon(latLngRings, {
      color: '#38bdf8',
      weight: 3,
      fillColor: '#38bdf8',
      fillOpacity: 0.18,
      opacity: 0.95,
    }).addTo(layerGroup);
  });

  layerGroup.addTo(map);
  return layerGroup;
}
