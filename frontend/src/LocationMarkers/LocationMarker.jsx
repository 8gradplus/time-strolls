import { Marker, Tooltip } from "react-leaflet";
import { useState } from "react";
import { placeIcon } from "../icons";

const LocationMarker = (props) => {
  const { position, label, onClick } = props;
  const [iconSize, setIconSize] = useState(30);
  const [isHovered, setIsHovered] = useState(false);

  const color = "white";
  const haloColor = "rgb(219, 226, 190)";
  const handleMarkerClick = () => {
    onClick(true);
    setIconSize(30); // set back icon size once menu is opened
  };

  const handleMouseOver = () => {
    setIconSize(40);
    setIsHovered(true); // Increase size on hover
  };

  const handleMouseOut = () => {
    setIconSize(30);
    setIsHovered(false); // Reset size when mouse leaves
  };

  return (
    <Marker
      position={position}
      icon={placeIcon(color, haloColor, iconSize)}
      eventHandlers={{
        click: handleMarkerClick,
        mouseover: handleMouseOver,
        mouseout: handleMouseOut,
      }}
    >
      {isHovered && (
        <Tooltip
          direction="right"
          offset={[20, -10]}
          className="custom-tooltip"
        >
          {label}
        </Tooltip>
      )}
    </Marker>
  );
};

export default LocationMarker;
