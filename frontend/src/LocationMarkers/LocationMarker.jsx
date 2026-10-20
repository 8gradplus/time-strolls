import { Marker, Tooltip } from "react-leaflet";
import { placeIcon } from "../icons";

const LocationMarker = (props) => {
  const { lat, lon, label, active, onClick } = props;

  // Hover only enlarges the dot (CSS) and shows the name; on touch screens a
  // tap opens the place panel, which shows the name anyway.
  return (
    <Marker
      position={[lat, lon]}
      icon={placeIcon(active)}
      eventHandlers={{ click: () => onClick(true) }}
    >
      <Tooltip direction="right" offset={[14, 0]} className="location-tooltip">
        {label}
      </Tooltip>
    </Marker>
  );
};

export default LocationMarker;
