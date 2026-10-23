import { useEffect, useRef } from "react";
import { Marker } from "react-leaflet";
import { currentLocationIcon } from "../icons";
import { useMap } from "react-leaflet";

const TrackMarker = ({ position, trackingMode }) => {
  if (!position) return null;
  return <Marker position={position} icon={currentLocationIcon()} />;
};

// The user's position comes from useTrack in Map.jsx, which the location
// button needs as well.
const Track = ({
  position,
  trackingMode,
  fallbackCenter,
  fallbackZoom,
  onUserInteraction,
  userInteracted,
}) => {
  const map = useMap(); // map instance is available here
  const programmaticMove = useRef(false);

  // Detect manual map movements (drag/zoom) only. Moves made here (by the
  // tracking mode) fire several events (zoomstart, movestart, ...) until
  // their moveend, so they are skipped until then; a drag always counts.
  useEffect(() => {
    const stopFollowing = (event) => {
      if (programmaticMove.current && event.type !== "dragstart") return;
      onUserInteraction(true);
    };
    const moveEnd = () => {
      programmaticMove.current = false;
    };

    map.on("dragstart", stopFollowing);
    map.on("zoomstart", stopFollowing);
    map.on("movestart", stopFollowing);
    map.on("moveend", moveEnd);
    return () => {
      map.off("dragstart", stopFollowing);
      map.off("zoomstart", stopFollowing);
      map.off("movestart", stopFollowing);
      map.off("moveend", moveEnd);
    };
  }, [map, onUserInteraction]);

  // handle map movement
  useEffect(() => {
    if (!map) return;

    // The whole area: the home area's start (Map.jsx), flown to
    if (trackingMode === "area" && !userInteracted) {
      programmaticMove.current = true;
      const reduced = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      map.flyTo(fallbackCenter, fallbackZoom, {
        animate: !reduced,
        duration: 1.6,
      });
    }
    if (trackingMode === "follow" && position && !userInteracted) {
      programmaticMove.current = true;
      map.flyTo(position, 16);
    }
  }, [
    map,
    trackingMode,
    position,
    fallbackCenter,
    fallbackZoom,
    userInteracted,
  ]);

  return <TrackMarker position={position} trackingMode={trackingMode} />;
};

export default Track;
