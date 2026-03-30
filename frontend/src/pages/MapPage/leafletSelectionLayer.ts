import L from 'leaflet';
import type { SelectedBuilding } from '@/types/building';
import { buildBestSideHighlightFeatureCollection, type BestSide } from '@/utils/bestSideHighlight';

export function renderLeafletSelectedBuildingLayer(
  map: L.Map,
  selectedBuilding: SelectedBuilding,
  bestSide: BestSide | null | undefined,
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

  const highlight = buildBestSideHighlightFeatureCollection(selectedBuilding, bestSide);
  L.geoJSON(highlight, {
    style: {
      color: '#ffd54f',
      weight: 8,
      opacity: 0.18,
      lineCap: 'round',
    },
  }).addTo(layerGroup);

  L.geoJSON(highlight, {
    style: {
      color: '#ffeb3b',
      weight: 3,
      opacity: 0.95,
      lineCap: 'round',
    },
  }).addTo(layerGroup);

  layerGroup.addTo(map);
  return layerGroup;
}
