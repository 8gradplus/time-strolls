import { useState, useEffect } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import Track from "./Track";
import Menu from "./Menu";
import LocationInfo from "./LocationInfo/LocationInfo";
import LocationMarkers from "./LocationMarkers/LocationMarkers";
import { api } from "./api";

const HistoricMap = (props) => {
  const { open } = props;
  if (!open) return null;
  const url =
    "https://debtray.fra1.cdn.digitaloceanspaces.com/test/timestrolls/tiles/1945/{z}/{x}/{y}.png";
  return <TileLayer url={url} attribution="1945" noWrap={true} />;
};

const CoordinateMap = () => {
  // Todo set center to current postion - Keep this for dev
  const fallbackCenter = [48.61017, 14.044]; // Unterurasch - default map center
  const [showInfo, setShowInfo] = useState(false);
  const [locationId, setLocationId] = useState(null);
  const [showMarkers, setShowMarkers] = useState(true);
  const [showHistoricMap, setShowHistoricMap] = useState(false);
  const [locations, setLocations] = useState(null);

  useEffect(() => {
    fetch(api.places)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Places response not ok");
        }
        return res.json();
      })
      .then((data) => setLocations(data))
      .catch((error) => console.error("Error fetching places:", error));
  }, []);

  const handleInfoOpen = (newOpen) => () => {
    setShowInfo(newOpen);
  };

  const handleMenuItemClick = (item) => {
    if (item === "showHistoricMap") {
      setShowHistoricMap((prev) => !prev);
    } else if (item === "showMarkers") {
      setShowMarkers((prev) => !prev); // assuming setShowMarkers exists
    } else {
    }
  };

  const handleMarkerClick = (id) => (toggle) => {
    setLocationId(id);
    setShowInfo(toggle);
  };

  return (
    <div id="map" style={{ position: "relative", height: "100vh" }}>
      <MapContainer
        center={fallbackCenter} // Will be overwritten by track upon location found
        zoom={16}
        style={{ height: "100vh", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution="Timestrolls"
        />
        <HistoricMap open={showHistoricMap} />

        {locations && (
          <LocationMarkers
            open={showMarkers}
            onClick={handleMarkerClick}
            locations={locations}
          />
        )}

        {locationId && (
          <LocationInfo
            open={showInfo}
            onClose={handleInfoOpen(false)}
            id={locationId}
          />
        )}

        <Track />
      </MapContainer>
      <Menu
        onItemClick={handleMenuItemClick}
        itemState={{
          showHistoricMap: showHistoricMap,
          showMarkers: showMarkers,
        }}
      />
    </div>
  );
};

export default CoordinateMap;
