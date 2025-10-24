import { useEffect } from "react";
import { Marker } from "react-leaflet";
import { currentLocationIcon, currentLocationIconNavigate } from "../icons";
import { useTrack } from "./useTrack";
import { useMap } from "react-leaflet";

const TrackMarker = ({ position, trackingMode, heading }) => {
  if (!position || trackingMode === "none") return null;

  const icon =
    trackingMode === "navigate"
      ? currentLocationIconNavigate()
      : currentLocationIcon();

  return (
    <Marker
      position={position}
      icon={icon}
      rotationAngle={trackingMode === "navigate" ? heading : 0}
      rotationOrigin="center"
    />
  );
};

const Track = ({ trackingMode, fallbackCenter, onPositionUpdate }) => {
  const map = useMap(); // map instance is available here
  const { position, smoothHeading } = useTrack(trackingMode, onPositionUpdate);

  // handle map movement
  useEffect(() => {
    if (!map) return;

    if (trackingMode === "none") {
      map.setView(fallbackCenter, 14);
    } else if (
      position &&
      (trackingMode === "follow" || trackingMode === "navigate")
    ) {
      map.flyTo(position, 16);
    }
  }, [trackingMode, position, map, fallbackCenter]);

  return (
    <TrackMarker
      position={position}
      trackingMode={trackingMode}
      heading={smoothHeading}
    />
  );
};

export default Track;
