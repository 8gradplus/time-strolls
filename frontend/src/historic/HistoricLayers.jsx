import { useEffect } from "react";
import { TileLayer, useMap, useMapEvents } from "react-leaflet";
import { MAX_ZOOM, attribution, leafletBounds, tileUrl } from "./manifest";

// All layers of a year. Layers are ranked best first, so they are drawn in
// reverse order: the best ends up on top, the others fill its transparent gaps.
const HistoricLayers = ({ time, year }) => {
  if (!time) return null;
  return [...time.layers]
    .reverse()
    .map((layer) => (
      <TileLayer
        key={`${year}-${layer.id}`}
        url={tileUrl(layer)}
        attribution={attribution(layer)}
        bounds={leafletBounds(layer.bounds)}
        minNativeZoom={layer.min_zoom}
        maxNativeZoom={layer.max_native_zoom}
        maxZoom={MAX_ZOOM}
        noWrap={true}
      />
    ));
};

const toBounds = (map) => {
  const b = map.getBounds();
  return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
};

// Reports the current view as [w, s, e, n], so the menu can offer matching years.
export const ViewBounds = ({ onChange }) => {
  const map = useMap();
  useMapEvents({ moveend: () => onChange(toBounds(map)) });
  useEffect(() => {
    onChange(toBounds(map));
  }, [map, onChange]);
  return null;
};

export default HistoricLayers;
