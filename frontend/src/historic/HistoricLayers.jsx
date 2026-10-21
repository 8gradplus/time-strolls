import { useEffect } from "react";
import { TileLayer, useMap, useMapEvents } from "react-leaflet";
import { MAX_ZOOM, leafletBounds, tileUrl } from "./manifest";

// The year's best tiles: one URL per tile, composited by aerial-timeline.
// Without a `best` entry (older manifests) all layers are drawn, ranked best
// first, in reverse order: the best ends up on top, the others fill its gaps.
// Their sources are listed in the menu (Menu.jsx), not on the map.
const HistoricLayers = ({ time, year }) => {
  if (!time) return null;
  if (time.best) {
    return (
      <TileLayer
        key={`${year}-best`}
        url={tileUrl(time.best)}
        bounds={leafletBounds(time.best.bounds)}
        minNativeZoom={time.best.min_zoom}
        maxNativeZoom={time.best.max_native_zoom}
        maxZoom={MAX_ZOOM}
        noWrap={true}
      />
    );
  }
  return [...time.layers]
    .reverse()
    .map((layer) => (
      <TileLayer
        key={`${year}-${layer.id}`}
        url={tileUrl(layer)}
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
