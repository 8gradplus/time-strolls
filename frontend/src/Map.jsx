import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [locations, setLocations] = useState(null);

  // Derive state from URL - single source of truth
  const locationSlug = searchParams.get("location");
  const tourIdParam = searchParams.get("tour");
  const tourId = tourIdParam ? parseInt(tourIdParam, 10) : null;
  const showInfo = !!locationSlug;

  // Layer visibility from URL (default to true for markers, false for historic map)
  const showMarkers = searchParams.get("markers") !== "false";
  const showHistoricMap = searchParams.get("historic") === "true";

  // Tracking mode from URL (default: "area")
  const trackingMode = searchParams.get("track") || "area";
  const userInteracted = searchParams.get("centered") === "false";

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

  const handleInfoClose = () => {
    setSearchParams((params) => {
      params.delete("location");
      return params;
    });
  };

  const handleMenuItemClick = (item) => {
    if (item === "showHistoricMap") {
      return () => {
        setSearchParams((params) => {
          if (showHistoricMap) {
            params.delete("historic");
          } else {
            params.set("historic", "true");
          }
          return params;
        });
      };
    } else if (item === "showMarkers") {
      return () => {
        setSearchParams((params) => {
          if (showMarkers) {
            params.set("markers", "false");
          } else {
            params.delete("markers");
          }
          return params;
        });
      };
    } else if (item === "tour") {
      return (id) => {
        setSearchParams((params) => {
          if (id) {
            params.set("tour", id);
          } else {
            params.delete("tour");
          }
          return params;
        });
      };
    } else {
      return () => {}; // no-op fallback
    }
  };

  const handleMarkerClick = (id) => (toggle) => {
    // Find the location to get its slug
    const location = locations?.find((loc) => loc.id === id);
    if (!location) return;

    setSearchParams((params) => {
      if (toggle) {
        params.set("location", location.slug);
      } else {
        params.delete("location");
      }
      return params;
    });
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
          onUserInteraction={(interacted) => {
            setSearchParams((params) => {
              if (interacted) {
                params.set("centered", "false");
              } else {
                params.delete("centered");
              }
              return params;
            });
          }}
          userInteracted={userInteracted}
        />

        {locations && (
          <LocationMarkers
            open={showMarkers}
            onClick={handleMarkerClick}
            locations={locations}
          />
        )}

        {locationSlug && (
          <LocationInfo
            open={showInfo}
            onClose={handleInfoClose}
            slug={locationSlug}
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
      <TrackControl
        mode={trackingMode}
        onModeChange={(newMode) => {
          setSearchParams((params) => {
            if (newMode === "area") {
              params.delete("track");
            } else {
              params.set("track", newMode);
            }
            params.delete("centered");
            return params;
          });
        }}
        onRecenterRequest={() => {
          setSearchParams((params) => {
            params.delete("centered");
            return params;
          });
        }}
        userInteracted={userInteracted}
      />
    </div>
  );
};

export default CoordinateMap;
