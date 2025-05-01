import { Marker } from "react-leaflet";
import { placeIcon } from "../icons";

const LocationMarker = (props) => {
  const { position, onClick } = props;
  const handleMarkerClick = () => {
    onClick(true);
  };
  return (
    <Marker
      position={position}
      icon={placeIcon()}
      eventHandlers={{
        click: handleMarkerClick,
      }}
    />
  );
};

export default LocationMarker;
