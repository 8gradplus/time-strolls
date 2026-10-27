import { useState } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import LocationMarker from "./LocationMarker";
import { useLanguage } from "../LanguageContext";
import {
  SAME_POINT,
  displayName,
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
  const { t } = useLanguage();
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

  return shown.map(({ place, parent, active, mark }) => {
    const name = displayName(place, parent, t);
    return (
      <LocationMarker
        key={place.id}
        lat={place.lat}
        lon={place.lon}
        mark={mark}
        filled={place.images > 0}
        label={labelAt(place, zoom, name)}
        hoverLabel={hoverName(place, parent, t)}
        active={active}
        onClick={onClick(place.id)}
      />
    );
  });
};

export default LocationMarkers;
