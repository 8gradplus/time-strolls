import LocationMarker from "./LocationMarker";
import { LOCATIONS } from "../testLocations";

const LocationMarkers = (props) => {
  const { open, onClick } = props;
  if (!open) return null;
  return (
    <>
      {LOCATIONS.map((location, idx) => (
        <LocationMarker
          key={location.id || idx}
          position={location.position}
          label={location.name}
          // Todo: onClick(location.id) upon API beause this component would call the conent by itsel
          onClick={onClick(location.id)}
        />
      ))}
    </>
  );
};

export default LocationMarkers;
