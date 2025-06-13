import { Marker, Tooltip } from "react-leaflet";
import { useState } from "react";
import { placeIcon } from "../icons";

const LocationMarker = (props) => {
  const { lat, lon, label, onClick } = props;
  const [iconSize, setIconSize] = useState(30);
  const [isHovered, setIsHovered] = useState(false);

  const color = "white";
  const haloColor = "rgb(219, 226, 190)";
  const handleMarkerClick = () => {
    onClick(true);
    setIconSize(30); // set back icon size once menu is opened
  };

  const handleHoverStart = () => {
    setIconSize(40);
    setIsHovered(true); // Increase size on hover
  };

  const handleHoverEnd = () => {
    setIconSize(30);
    setIsHovered(false); // Reset size when mouse leaves
  };

  return (
    // hover ever mechnaism does not work for mobile devices.
    // Probably it's better to remove hover over functionality at all - this would be consistent with mobile devices
    <Marker
      position={[lat, lon]}
      icon={placeIcon(color, haloColor, iconSize)}
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
        className="location-name-tooltip"
      >
        {label}
      </Tooltip>
    </Marker>
  );
};

export default LocationMarker;
