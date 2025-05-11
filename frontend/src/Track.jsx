import React, { useEffect, useState } from "react";
import { Marker, useMap } from "react-leaflet";
import { currentLocationIcon } from "./icons"; // adjust path as needed

const Track = () => {
  const [position, setPosition] = useState(null);
  const map = useMap();

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const latlng = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setPosition(latlng);
        map.flyTo(latlng, map.getZoom());
      },
      (err) => {
        console.error("Geolocation error:", err);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [map]);

  return position === null ? null : (
    <Marker position={position} icon={currentLocationIcon()} />
  );
};

export default Track;
