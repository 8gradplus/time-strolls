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
import HistoricLayers, { ViewBounds } from "./historic/HistoricLayers";
import TimeSlider from "./historic/TimeSlider";
import Notice from "./Components/Notice";
import { useLanguage } from "./LanguageContext";
import { useManifest } from "./historic/useManifest";
import {
  MAX_ZOOM,
  REGION_BOUNDS,
  legacyHistoricYear,
  yearsInBounds,
} from "./historic/manifest";

const fallbackCenter = [48.629371, 14.079059];

const CoordinateMap = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [locations, setLocations] = useState(null);
  const [locationsFailed, setLocationsFailed] = useState(false);
  const [locationsRequest, setLocationsRequest] = useState(0);
  const { t } = useLanguage();
  const manifest = useManifest();
  const [viewBounds, setViewBounds] = useState(REGION_BOUNDS);

  // Derive state from URL - single source of truth
  const locationSlug = searchParams.get("location");
  const tourIdParam = searchParams.get("tour");
  const tourId = tourIdParam ? parseInt(tourIdParam, 10) : null;
  const showInfo = !!locationSlug;

  // Layer visibility from URL (default to true for markers, no historic year)
  const showMarkers = searchParams.get("markers") !== "false";
  const year = searchParams.get("year");
  const legacyHistoric = searchParams.get("historic") === "true";

  // Years offered on the time slider: those in view, plus the selected one
  const yearsInView = yearsInBounds(manifest, viewBounds);
  const years =
    year && manifest?.times[year] && !yearsInView.includes(year)
      ? [...yearsInView, year].sort()
      : yearsInView;

  // Tracking mode from URL (default: "area")
  const trackingMode = searchParams.get("track") || "area";
  const userInteracted = searchParams.get("centered") === "false";

  useEffect(() => {
    setLocationsFailed(false);
    fetch(api.locations)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Locations response not ok");
        }
        return res.json();
      })
      .then((data) => setLocations(data))
      .catch((error) => {
        console.error("Error fetching places:", error);
        setLocationsFailed(true);
      });
  }, [locationsRequest]);

  // Old deep links used historic=true (1945 overlay); map them to a manifest year
  useEffect(() => {
    if (!legacyHistoric || !manifest) return;
    const legacyYear = legacyHistoricYear(manifest);
    setSearchParams(
      (params) => {
        params.delete("historic");
        if (legacyYear && !params.has("year")) {
          params.set("year", legacyYear);
        }
        return params;
      },
      { replace: true },
    );
  }, [legacyHistoric, manifest, setSearchParams]);

  const handleInfoClose = () => {
    setSearchParams((params) => {
      params.delete("location");
      return params;
    });
  };

  const handleMenuItemClick = (item) => {
    if (item === "year") {
      return (newYear) => {
        setSearchParams((params) => {
          if (newYear) {
            params.set("year", newYear);
          } else {
            params.delete("year");
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
        maxZoom={MAX_ZOOM}
        style={{ height: "100vh", width: "100%" }}
      >
        <TileLayer
          className="base-map"
          url="https://tile.openstreetmap.de/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxNativeZoom={18}
          maxZoom={MAX_ZOOM}
        />
        <HistoricLayers time={manifest?.times[year]} year={year} />
        <ViewBounds onChange={setViewBounds} />
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
            activeSlug={locationSlug}
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
      {locationsFailed && (
        <Notice
          message={t.placesFailed}
          actionLabel={t.retry}
          onAction={() => setLocationsRequest((n) => n + 1)}
        />
      )}
      <Menu
        onItemClick={handleMenuItemClick}
        itemState={{
          year: year,
          showMarkers: showMarkers,
          tourId: tourId,
        }}
      />
      <TimeSlider
        years={years}
        times={manifest?.times}
        year={year}
        onChange={handleMenuItemClick("year")}
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
