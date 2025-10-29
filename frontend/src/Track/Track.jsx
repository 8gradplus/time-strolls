import { useEffect, useState } from "react";
import { Marker } from "react-leaflet";
import { currentLocationIcon } from "../icons";
import { useTrack } from "./useTrack";
import { useMap } from "react-leaflet";

const TrackMarker = ({ position, trackingMode }) => {
  if (!position) return null;
  return <Marker position={position} icon={currentLocationIcon()} />;
};

const Track = ({
  trackingMode,
  fallbackCenter,
  onPositionUpdate,
  onUserInteraction,
}) => {
  const [userInteracted, setUserInteracted] = useState(false);
  const map = useMap(); // map instance is available here
  // todo use smoothHeading (or heading from useTrack) for orintation lateron
  const { position, smoothHeading } = useTrack(trackingMode, onPositionUpdate);

  // Prevent automatic recentering upon dragging/zooming manually
  // Detect manual map movement (drag/zoom)
  useEffect(() => {
    const stopFollowing = () => {
      setUserInteracted(true);
      onUserInteraction(true);
    };
    map.on("dragstart", stopFollowing);
    map.on("zoomstart", stopFollowing);
    return () => {
      map.off("dragstart", stopFollowing);
      map.off("zoomstart", stopFollowing);
    };
  }, [map, onUserInteraction]);

  console.log("User interacted", userInteracted, "Tracking Mode", trackingMode);

  // handle map movement
  useEffect(() => {
    if (!map) return;

    if (trackingMode === "none") {
      map.setView(fallbackCenter, 14);
      setUserInteracted(false);
      onUserInteraction(false);
    } else if (position && trackingMode === "follow" && !userInteracted) {
      map.flyTo(position, 16);
      setUserInteracted(false);
      onUserInteraction(false);
    }
  }, [
    trackingMode,
    position,
    map,
    fallbackCenter,
    userInteracted,
    onUserInteraction,
  ]);

  return <TrackMarker position={position} trackingMode={trackingMode} />;
};

export default Track;
