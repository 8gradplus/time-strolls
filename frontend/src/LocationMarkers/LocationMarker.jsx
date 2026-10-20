import { Marker, Tooltip } from "react-leaflet";
import { useState } from "react";
import { placeIcon } from "../icons";

const LocationMarker = (props) => {
  const { lat, lon, label, active, onClick } = props;
  const [iconSize, setIconSize] = useState(18);
  const [isHovered, setIsHovered] = useState(false);

  const handleMarkerClick = () => {
    onClick(true);
    setIconSize(18); // set back icon size once menu is opened
  };

  const handleHoverStart = () => {
    setIconSize(24);
    setIsHovered(true); // Increase size on hover
  };

  const handleHoverEnd = () => {
    setIconSize(18);
    setIsHovered(false); // Reset size when mouse leaves
  };

  return (
    // hover ever mechnaism does not work for mobile devices.
    // Probably it's better to remove hover over functionality at all - this would be consistent with mobile devices
    <Marker
      position={[lat, lon]}
      icon={placeIcon(active ? 22 : iconSize, active)}
      eventHandlers={{
        click: handleMarkerClick,
        mouseover: handleHoverStart,
        mouseout: handleHoverEnd,
        touchStart: handleHoverStart,
        touchEnd: handleHoverStart,
      }}
    >
      {/* Currently tooltip is not shown for mobile devices (hover over does not exist) */}
      <Tooltip
        direction="right"
        offset={[20, -10]}
        className="location-tooltip"
      >
        {label}
      </Tooltip>
    </Marker>
  );
};

export default LocationMarker;
