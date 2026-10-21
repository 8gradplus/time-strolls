import { useEffect, useRef, useState } from "react";
import { TileLayer, useMap, useMapEvents } from "react-leaflet";
import { MAX_ZOOM, leafletBounds, tileUrl } from "./manifest";

// Matches the opacity transition of .historic-layer (index.css)
const FADE_MS = 320;

// The tile layers of one year: its best tiles, one URL per tile, composited
// by aerial-timeline. Without a `best` entry (older manifests) all layers are
// drawn, ranked best first, in reverse order: the best ends up on top, the
// others fill its gaps. Their sources are listed in the menu, not on the map.
// onLoad runs once the tiles in view are done (a 404 counts: empty tiles are
// not stored).
const YearLayers = ({ time, year, opacity, zIndex, onLoad }) => {
  const layers = time.best ? [time.best] : [...time.layers].reverse();
  const refs = useRef([]);
  const onLoadRef = useRef(onLoad);

  useEffect(() => {
    onLoadRef.current = onLoad;
  });

  useEffect(() => {
    const added = refs.current.filter(Boolean);
    const check = () => {
      if (added.every((layer) => !layer.isLoading())) onLoadRef.current?.();
    };
    added.forEach((layer) => layer.on("load", check));
    // Nothing to load at all (no tiles in view) counts as loaded
    check();
    return () => added.forEach((layer) => layer.off("load", check));
  }, []);

  return layers.map((layer, i) => (
    <TileLayer
      key={`${year}-${layer.id ?? "best"}`}
      ref={(instance) => {
        refs.current[i] = instance;
      }}
      className="historic-layer"
      url={tileUrl(layer)}
      bounds={leafletBounds(layer.bounds)}
      minNativeZoom={layer.min_zoom}
      maxNativeZoom={layer.max_native_zoom}
      maxZoom={MAX_ZOOM}
      noWrap={true}
      opacity={opacity}
      zIndex={zIndex}
    />
  ));
};

// The selected year's imagery. A new year cross-fades: the old imagery stays
// until the new tiles have loaded, then the new year fades in over it. "Off"
// fades the imagery out.
const HistoricLayers = ({ time, year }) => {
  // The year fully on screen, and the newest year whose tiles have loaded
  const [shown, setShown] = useState(null);
  const [loaded, setLoaded] = useState(null);
  const current = time ? year : null;

  useEffect(() => {
    if ((shown?.year ?? null) === current) return;
    if (current && loaded !== current) return;
    const timer = setTimeout(() => {
      setShown(current ? { time, year: current } : null);
      setLoaded(null);
    }, FADE_MS);
    return () => clearTimeout(timer);
  }, [time, current, shown, loaded]);

  const layers = [];
  if (shown && shown.year !== current) {
    layers.push(
      <YearLayers
        key={shown.year}
        time={shown.time}
        year={shown.year}
        opacity={current ? 1 : 0}
        zIndex={1}
      />,
    );
  }
  if (current) {
    layers.push(
      <YearLayers
        key={current}
        time={time}
        year={current}
        opacity={shown?.year === current || loaded === current ? 1 : 0}
        zIndex={2}
        onLoad={() => setLoaded(current)}
      />,
    );
  }
  return layers;
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
