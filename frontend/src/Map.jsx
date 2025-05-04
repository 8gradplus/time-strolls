import { useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import Track from "./Track";
import Menu from "./Menu";
import LocationInfo from "./LocationInfo/LocationInfo";
import LocationMarkers from "./LocationMarkers/LocationMarkers";

// This should be replaced by an API call
const LOCATIONS = [
  {
    position: [48.61017854015886, 14.04406485511563],
    id: 1,
    name: "Urasch",
  },
  {
    position: [48.616413, 14.050119],
    id: 2,
    name: "Muckenschlag",
  },
];

const HistoricMap = (props) => {
  const { open } = props;
  if (!open) return null;
  const url = "http://127.0.0.1:8000/timetiles/1945/{z}/{x}/{y}";
  return <TileLayer url={url} attribution="1945" noWrap={true} />;
};

const CoordinateMap = () => {
  // Todo set center to current postion - Keep this for dev
  const fallbackCenter = [48.61017, 14.044]; // Unterurasch - default map center
  const [showInfo, setShowInfo] = useState(false);
  const [locationId, setLocationId] = useState(null);
  const [showMarkers, setShowMarkers] = useState(true);
  const [showHistoricMap, setShowHistoricMap] = useState(false);

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
    <div style={{ position: "relative", height: "100vh" }}>
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

        <LocationMarkers
          open={showMarkers}
          onClick={handleMarkerClick}
          locations={LOCATIONS}
        />

        {/* Todo: add prop about location */}
        <LocationInfo
          open={showInfo}
          onClose={handleInfoOpen(false)}
          id={locationId}
        />
        {/* <Track /> */}
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
