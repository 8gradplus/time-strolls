import { useState, useEffect } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import Menu from "./Menu";
import LocationInfo from "./LocationInfo/LocationInfo";
import LocationMarkers from "./LocationMarkers/LocationMarkers";
import { api } from "./api";
import Tour from "./Tours/Tour";
import TrackControl from "./Track/TrackControl";
import Track from "./Track/Track";

const fallbackCenter = [48.629371, 14.079059];

const HistoricMap = (props) => {
  const { open } = props;
  if (!open) return null;
  const url =
    "https://debtray.fra1.cdn.digitaloceanspaces.com/test/timestrolls/tiles/1945/{z}/{x}/{y}.png";
  return <TileLayer url={url} attribution="1945" noWrap={true} />;
};

const CoordinateMap = () => {
  const [trackingMode, setTrackingMode] = useState("none"); // none | follow | navigate
  const [currentPosition, setCurrentPosition] = useState(null); // lifted state for future expansion (currently not used)
  const [showInfo, setShowInfo] = useState(false);
  const [locationId, setLocationId] = useState(null);
  const [showMarkers, setShowMarkers] = useState(true);
  const [showHistoricMap, setShowHistoricMap] = useState(false);
  const [locations, setLocations] = useState(null);
  const [tourId, setTourId] = useState(null);

  useEffect(() => {
    fetch(api.locations)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Locations response not ok");
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
      return () => setShowHistoricMap((prev) => !prev);
    } else if (item === "showMarkers") {
      return () => setShowMarkers((prev) => !prev);
    } else if (item === "tour") {
      return (id) => setTourId(id);
    } else {
      return () => {}; // no-op fallback
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
        zoom={14}
        style={{ height: "100vh", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution="Timestrolls"
        />
        <HistoricMap open={showHistoricMap} />
        <Track
          trackingMode={trackingMode}
          fallbackCenter={fallbackCenter}
          onPositionUpdate={setCurrentPosition}
        />

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

        {tourId && <Tour id={tourId} />}
      </MapContainer>
      <Menu
        onItemClick={handleMenuItemClick}
        itemState={{
          showHistoricMap: showHistoricMap,
          showMarkers: showMarkers,
          tourId: tourId,
        }}
      />
      <TrackControl mode={trackingMode} onModeChange={setTrackingMode} />
    </div>
  );
};

export default CoordinateMap;
