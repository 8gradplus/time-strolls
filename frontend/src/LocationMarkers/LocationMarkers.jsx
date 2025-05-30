import LocationMarker from "./LocationMarker";

const LocationMarkers = (props) => {
  const { open, onClick, locations } = props;
  if (!open) return null;
  return (
    <>
      {locations.map((location, idx) => (
        <LocationMarker
          key={location.id || idx}
          position={location.position}
          label={location.name}
          // Todo: onClick(location.id) upon API beause this component would call the conent by itself
          onClick={onClick(location.id)}
        />
      ))}
    </>
  );
};

export default LocationMarkers;
