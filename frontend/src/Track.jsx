import React, { useEffect, useState } from "react";
import { Marker, useMapEvents } from "react-leaflet";
import { currentLocationIcon } from "./icons"; // adjust path as needed

const Track = () => {
  const [position, setPosition] = useState(null);

  const map = useMapEvents({
    locationfound(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, 16); // Explicit zoom level
    },
  });

  useEffect(() => {
    map.locate({
      setView: true,
      maxZoom: 16, // Optional, but good as a hint to browser
      watch: true, // Ensures continuous tracking
      enableHighAccuracy: true,
    });
  }, [map]);

  return position === null ? null : (
    <Marker position={position} icon={currentLocationIcon()} />
  );
};

export default Track;
