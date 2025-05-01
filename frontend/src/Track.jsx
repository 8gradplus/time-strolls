import React, { useState } from "react";
import { Marker, useMapEvents } from "react-leaflet";
import { currentLocationIcon } from "./icons";

const Track = () => {
  const [position, setPosition] = useState(null);
  const map = useMapEvents({
    click() {
      map.locate();
    },
    locationfound(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  return position === null ? null : (
    <Marker position={position} icon={currentLocationIcon()}></Marker>
  );
};

export default Track;
