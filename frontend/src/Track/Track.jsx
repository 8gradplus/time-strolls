import { useEffect, useRef } from "react";
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
  onUserInteraction,
  userInteracted,
}) => {
  const map = useMap(); // map instance is available here
  const programmaticMove = useRef(false);
  // todo use smoothHeading (or heading from useTrack) for orintation lateron
  const { position, smoothHeading } = useTrack();

  // Detect manual map movements (drag/zoom) only
  // Non-manual map movements are triggert by changes in trackMode
  useEffect(() => {
    const stopFollowing = () => {
      if (programmaticMove.current) {
        // skip if move was triggered by code
        programmaticMove.current = false;
        return;
      }
      onUserInteraction(true);
    };

    map.on("dragstart", stopFollowing);
    map.on("zoomstart", stopFollowing);
    map.on("movestart", stopFollowing);
    map.on("touchstart", stopFollowing);
    return () => {
      map.off("dragstart", stopFollowing);
      map.off("zoomstart", stopFollowing);
      map.off("movestart", stopFollowing);
      map.off("touchstart", stopFollowing);
    };
  }, [map, onUserInteraction]);

  // handle map movement
  useEffect(() => {
    if (!map) return;

    if (trackingMode === "area" && !userInteracted) {
      programmaticMove.current = true;
      map.setView(fallbackCenter, 12);
    }
    if (trackingMode === "follow" && position && !userInteracted) {
      programmaticMove.current = true;
      map.flyTo(position, 16);
    }
  }, [map, trackingMode, position, fallbackCenter, userInteracted]);

  return <TrackMarker position={position} trackingMode={trackingMode} />;
};

export default Track;
