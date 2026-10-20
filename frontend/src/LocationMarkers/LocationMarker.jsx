import { Marker, Tooltip } from "react-leaflet";
import { placeIcon } from "../icons";

const LocationMarker = (props) => {
  const { lat, lon, label, active, showLabel, onClick } = props;

  // Hover enlarges the dot (CSS) and shows the name. Zoomed in, the name is
  // always shown (showLabel), which also covers touch screens. The tooltip is
  // remounted (key) because Leaflet reads `permanent` only on creation.
  return (
    <Marker
      position={[lat, lon]}
      icon={placeIcon(active)}
      eventHandlers={{ click: () => onClick(true) }}
    >
      <Tooltip
        key={showLabel ? "permanent" : "hover"}
        permanent={showLabel}
        direction="right"
        offset={[14, 0]}
        className="location-tooltip"
      >
        {label}
      </Tooltip>
    </Marker>
  );
};

export default LocationMarker;
