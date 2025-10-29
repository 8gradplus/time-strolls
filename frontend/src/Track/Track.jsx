import { useEffect, useState } from "react";
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
  const [userInteracted, setUserInteracted] = useState(false);
  const map = useMap(); // map instance is available here
  const { position, smoothHeading } = useTrack(trackingMode, onPositionUpdate);
  console.log("User interacted", userInteracted);

  const follow = (bool) => () => {
    setUserInteracted(bool);
  };

  // Prevent automatic recentering upon dragging/zooming manually
  // Detect manual map movement (drag/zoom)
  useEffect(() => {
    map.on("dragstart", follow(false));
    map.on("zoomstart", follow(false));
    return () => {
      map.off("dragstart", follow(false));
      map.off("zoomstart", follow(false));
    };
  }, [map]);

  // Recenter upon tracking mode change
  useEffect(() => {
    follow(true);
  }, [trackingMode]);

  // handle map movement
  useEffect(() => {
    if (!map) return;

    if (trackingMode === "none") {
      map.setView(fallbackCenter, 14);
    } else if (
      position &&
      (trackingMode === "follow" || trackingMode === "navigate") &&
      !userInteracted
    ) {
      map.flyTo(position, 16);
    }
  }, [trackingMode, position, map, fallbackCenter, userInteracted]);

  return (
    <TrackMarker
      position={position}
      trackingMode={trackingMode}
      heading={smoothHeading}
    />
  );
};

export default Track;
