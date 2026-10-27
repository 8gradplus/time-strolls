import { Marker, Tooltip } from "react-leaflet";
import { placeIcon } from "../icons";

const LocationMarker = (props) => {
  const { lat, lon, mark, filled, label, hoverLabel, active, onClick } = props;

  // Hover enlarges the mark (CSS) and shows the name. Zoomed in, a label is
  // always shown (LocationMarkers/hierarchy.js), which also covers touch
  // screens. The tooltip is remounted (key) because Leaflet reads
  // `permanent` only on creation.
  const permanent = label != null;
  return (
    <Marker
      position={[lat, lon]}
      icon={placeIcon(mark, active, filled)}
      eventHandlers={{ click: () => onClick(true) }}
    >
      <Tooltip
        key={permanent ? `permanent-${label}` : "hover"}
        permanent={permanent}
        direction="right"
        offset={[mark === "house" ? 8 : 14, 0]}
        className={
          mark === "house" && permanent
            ? "location-tooltip house-number"
            : "location-tooltip"
        }
      >
        {permanent ? label : hoverLabel}
      </Tooltip>
    </Marker>
  );
};

export default LocationMarker;
