import React, { useEffect, useState } from "react";
import { Marker, useMapEvents } from "react-leaflet";
import { currentLocationIcon } from "./icons";

const Track = () => {
  const [position, setPosition] = useState(null);

  const map = useMapEvents({
    locationfound(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  // Trigger geolocation on mount
  useEffect(() => {
    map.locate({
      setView: true,
      maxZoom: 16,
    });
  }, [map]);

  return position === null ? null : (
    <Marker position={position} icon={currentLocationIcon()} />
  );
};

export default Track;
