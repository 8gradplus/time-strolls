import { useState } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import LocationMarker from "./LocationMarker";
import {
  clusterRadius,
  hoverName,
  labelAt,
  markOf,
  visibleAt,
} from "./hierarchy";

// Villages first, so churches, chapels and the open place lie on top
const LAYER = { house: 0, ring: 1, dot: 2, chapel: 3, church: 4 };

const LocationMarkers = (props) => {
  const { open, onClick, locations, activeSlug } = props;
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  if (!open) return null;

  const shown = locations
    .map((place) => {
      const active = place.slug === activeSlug;
      return { place, active, mark: markOf(place.kind) };
    })
    .filter(({ place, active }) => visibleAt(place, zoom, active))
    .sort(
      (a, b) =>
        LAYER[a.mark] - LAYER[b.mark] || Number(a.active) - Number(b.active),
    );

  // Places that overlap join in a cluster, which splits as you zoom in;
  // those on the same point spread out around it at the closest zoom
  return (
    <MarkerClusterGroup
      chunkedLoading
      maxClusterRadius={clusterRadius}
      spiderfyOnMaxZoom={true}
      showCoverageOnHover={false}
      zoomToBoundsOnClick={true}
    >
      {shown.map(({ place, active, mark }) => (
        <LocationMarker
          key={place.id}
          lat={place.lat}
          lon={place.lon}
          mark={mark}
          filled={place.images > 0}
          label={labelAt(place, zoom, place.name)}
          hoverLabel={hoverName(place)}
          active={active}
          onClick={onClick(place.id)}
        />
      ))}
    </MarkerClusterGroup>
  );
};

export default LocationMarkers;
