import { Marker, Tooltip } from "react-leaflet";
import { placeIcon } from "../icons";

const LocationMarker = (props) => {
  const { lat, lon, mark, filled, label, hoverLabel, active, zoom, onClick } =
    props;

  // Hover enlarges the mark (CSS) and shows the name, if it has one (not
  // churches and chapels). Zoomed in, a label is always shown
  // (LocationMarkers/hierarchy.js), which also covers touch screens. The
  // tooltip is remounted (key) because Leaflet reads `permanent` only on
  // creation, and after every zoom: a marker that comes out of a cluster
  // doesn't open its permanent tooltip again.
  const permanent = label != null;
  const text = permanent ? label : hoverLabel;
  return (
    <Marker
      position={[lat, lon]}
      icon={placeIcon(mark, active, filled)}
      eventHandlers={{ click: () => onClick(true) }}
    >
      {text && (
        <Tooltip
          key={permanent ? `permanent-${label}-${zoom}` : "hover"}
          permanent={permanent}
          direction="right"
          offset={[mark === "house" ? 8 : 14, 0]}
          className="location-tooltip"
        >
          {text}
        </Tooltip>
      )}
    </Marker>
  );
};

export default LocationMarker;
