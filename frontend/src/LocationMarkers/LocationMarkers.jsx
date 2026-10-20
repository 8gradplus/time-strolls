import { useState } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import LocationMarker from "./LocationMarker";

// From this zoom on, place names are shown next to the dots on every device,
// so they can be read on touch screens too; below it, only on hover.
const LABEL_ZOOM = 15;

const LocationMarkers = (props) => {
  const { open, onClick, locations, activeSlug } = props;
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  if (!open) return null;

  return (
    <MarkerClusterGroup
      chunkedLoading
      maxClusterRadius={60}
      spiderfyOnMaxZoom={true}
      showCoverageOnHover={false}
      zoomToBoundsOnClick={true}
    >
      {locations.map((location, idx) => (
        <LocationMarker
          key={location.id || idx}
          lat={location.lat}
          lon={location.lon}
          label={location.name}
          active={location.slug === activeSlug}
          showLabel={zoom >= LABEL_ZOOM}
          onClick={onClick(location.id)}
        />
      ))}
    </MarkerClusterGroup>
  );
};

export default LocationMarkers;
