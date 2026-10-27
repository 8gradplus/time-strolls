import { useState } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import LocationMarker from "./LocationMarker";
import {
  CLUSTER_RADIUS,
  HOUSE_ZOOM,
  SAME_POINT,
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

  const byId = new Map(locations.map((place) => [place.id, place]));
  // Is a place on its village's point at this zoom (or at the closest)?
  const apart = (place, parent, at) =>
    map
      .project([place.lat, place.lon], at)
      .distanceTo(map.project([parent.lat, parent.lon], at));
  const onParent = (place, parent) =>
    !!parent && apart(place, parent, zoom) < SAME_POINT;
  const sameSpot = (place, parent) =>
    !!parent && apart(place, parent, map.getMaxZoom()) < 1;

  const shown = locations
    .map((place) => {
      const parent = byId.get(place.part_of);
      const active = place.slug === activeSlug;
      return { place, parent, active, mark: markOf(place.kind) };
    })
    .filter(({ place, parent, active }) =>
      visibleAt(place, zoom, {
        active,
        onParent: onParent(place, parent),
        sameSpot: sameSpot(place, parent),
      }),
    )
    .sort(
      (a, b) =>
        LAYER[a.mark] - LAYER[b.mark] || Number(a.active) - Number(b.active),
    );

  // Places that overlap join in a cluster, which splits as you zoom in;
  // houses (from HOUSE_ZOOM) are small enough to stay apart
  return (
    <MarkerClusterGroup
      chunkedLoading
      maxClusterRadius={CLUSTER_RADIUS}
      disableClusteringAtZoom={HOUSE_ZOOM}
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
