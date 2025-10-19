import { useState, useEffect } from "react";
import { Polyline } from "react-leaflet";
import { api } from "../api";

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
  const lineOptions = { color: "#4285F4" };
  return <Polyline positions={tour} pathOptions={lineOptions} />;
};

export default Tour;
