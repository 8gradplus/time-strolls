import { Marker, Tooltip } from "react-leaflet";
import { placeIcon } from "../icons";

const LocationMarker = (props) => {
  // leader: the mark is moved aside from its village's dot by this offset
  // (hierarchy.js `displaced`), with a hairline back to its true point; its
  // name then shows on the left, away from the village's name. It lies
  // north of the dot, so Leaflet would stack it under the village: on top
  const { lat, lon, leader, mark, filled, label, hoverLabel, active } = props;
  const { zoom, onClick } = props;

  // Hover enlarges the mark (CSS) and shows the name. Villages and mills
  // keep their name next to them from a zoom on (hierarchy.js), which also
  // covers touch screens; houses, churches and chapels never (there the
  // wall label names them, WallLabel.jsx). The
  // tooltip is remounted (key) because Leaflet reads `permanent` only on
  // creation, and after every zoom: a marker that comes out of a cluster
  // doesn't open its permanent tooltip again.
  const permanent = label != null;
  const text = permanent ? label : hoverLabel;
  return (
    <Marker
      position={[lat, lon]}
      icon={placeIcon(mark, active, filled, leader)}
      zIndexOffset={leader ? 1000 : 0}
      eventHandlers={{ click: () => onClick(true) }}
    >
      {text && (
        <Tooltip
          key={permanent ? `permanent-${label}-${zoom}` : "hover"}
          permanent={permanent}
          direction={leader ? "left" : "right"}
          offset={[(mark === "house" ? 8 : 14) * (leader ? -1 : 1), 0]}
          className="location-tooltip"
        >
          {text}
        </Tooltip>
      )}
    </Marker>
  );
};

export default LocationMarker;
