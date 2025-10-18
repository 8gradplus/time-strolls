import { useState, useEffect } from "react";
import { Polyline } from "react-leaflet";
import { api } from "../api";

const TrackPath = (props) => {
  const { id } = props;
  const [track, setTrack] = useState(null);
  // Geojson (lat, lon, height) => (lon, lat) for leaflet digest
  const mapCoords = (xs) => xs.map((x) => [x[1], x[0]]);

  useEffect(() => {
    fetch(api.trackInfo(id))
      .then((res) => {
        if (!res.ok) {
          throw new Error("Track response not ok");
        }
        return res.json();
      })
      .then((data) => setTrack(mapCoords(data.geom)))
      .catch((error) => console.error("Error fetching track:", error));
  }, [id]);

  if (!track) return null;
  const lineOptions = { color: "#4285F4" };
  return <Polyline positions={track} pathOptions={lineOptions} />;
};

export default TrackPath;
