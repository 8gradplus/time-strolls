import LocationMarker from "./LocationMarker";

const LocationMarkers = (props) => {
  const { open, onClick, locations } = props;
  console.log(locations);
  if (!open) return null;
  return (
    <>
      {locations.map((location, idx) => (
        <LocationMarker
          key={location.id || idx}
          position={location.position}
          onClick={onClick(location.id)}
        />
      ))}
    </>
  );
};

export default LocationMarkers;
