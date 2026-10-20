import MarkerClusterGroup from "react-leaflet-cluster";
import LocationMarker from "./LocationMarker";

const LocationMarkers = (props) => {
  const { open, onClick, locations } = props;
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
          onClick={onClick(location.id)}
        />
      ))}
    </MarkerClusterGroup>
  );
};

export default LocationMarkers;
