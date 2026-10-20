import { useState, useEffect } from "react";
import { Polyline } from "react-leaflet";
import { api } from "../api";
import { tokens } from "../theme";

const Tour = (props) => {
  const { id } = props;
  const [tour, setTour] = useState(null);
  // Geojson (lat, lon, height) => (lon, lat) for leaflet digest
  const mapCoords = (xs) => xs.map((x) => [x[1], x[0]]);

  useEffect(() => {
    fetch(api.tour(id))
      .then((res) => {
        if (!res.ok) {
          throw new Error("Track response not ok");
        }
        return res.json();
      })
      .then((data) => setTour(mapCoords(data.geom)))
      .catch((error) => console.error("Error fetching track:", error));
  }, [id]);

  if (!tour) return null;
  // The map accent on a white casing, so the line reads on the aerials too
  return (
    <>
      <Polyline
        positions={tour}
        pathOptions={{ color: "#fff", weight: 7, opacity: 0.9 }}
      />
      <Polyline
        positions={tour}
        pathOptions={{ color: tokens.light.accent, weight: 4 }}
      />
    </>
  );
};

export default Tour;
