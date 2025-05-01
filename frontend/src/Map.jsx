import { useState } from "react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { placeIcon } from "./icons";
import Track from "./Track";
import Menu from "./Menu";
import LocationInfo from "./LocationInfo/LocationInfo";

const CoordinateMap = () => {
  // Todo set center to current postion
  const center = [48.61017854015886, 14.04406485511563];
  const [showInfo, setShowInfo] = useState(false);

  const handleInfoOpen = (newOpen) => () => {
    setShowInfo(newOpen);
  };

  return (
    <div style={{ position: "relative", height: "100vh" }}>
      <MapContainer
        center={center}
        zoom={16}
        style={{ height: "100vh", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution="Timestrolls"
        />
        <TileLayer
          url="/tiles/{z}/{x}/{y}.png"
          attribution="1945"
          noWrap={true}
        />
        <Marker
          position={center}
          icon={placeIcon()}
          eventHandlers={{
            click: () => {
              setShowInfo(true);
            },
          }}
        />

        {/* Todo: add prop about location */}
        <LocationInfo open={showInfo} onClose={handleInfoOpen(false)} />
        <Track />
      </MapContainer>
      <Menu />
    </div>
  );
};

export default CoordinateMap;
