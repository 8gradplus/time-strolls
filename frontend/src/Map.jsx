import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import Menu from "./Menu";
import LocationInfo from "./LocationInfo/LocationInfo";
import LocationMarkers from "./LocationMarkers/LocationMarkers";
import WallLabel, { useWallLabel } from "./LocationMarkers/WallLabel";
import {
  HOUSE_ZOOM,
  LANDMARK_LABEL_ZOOM,
  isHouse,
} from "./LocationMarkers/hierarchy";
import { api } from "./api";
import Tour from "./Tours/Tour";
import TrackControl from "./Track/TrackControl";
import Track from "./Track/Track";
import { useTrack } from "./Track/useTrack";
import HistoricLayers, { ViewBounds } from "./historic/HistoricLayers";
import TimeSlider from "./historic/TimeSlider";
import CompactAttribution from "./Components/CompactAttribution";
import Notice from "./Components/Notice";
import Toast from "./Components/Toast";
import ZoomButtons from "./Components/ZoomButtons";
import MiniPlayer from "./Components/MiniPlayer";
import { useLanguage } from "./LanguageContext";
import { useManifest } from "./historic/useManifest";
import {
  MAX_ZOOM,
  REGION_BOUNDS,
  leafletBounds,
  legacyHistoricYear,
  yearsInBounds,
} from "./historic/manifest";
import {
  localized,
  regionAt,
  regionList,
  HOME_REGION,
  REGION_STARTS,
  regionStart,
  yearRange,
} from "./historic/regions";

// One default view: the home area's start (regions.js), also for the
// location button's "whole area"; the page opens a little further out and
// flies in
const HOME = REGION_STARTS[HOME_REGION];
const fallbackCenter = [HOME.center[1], HOME.center[0]];
const OPENING_ZOOM = 12;
// Choosing an area flies there no closer than this, then zooms in
const FLY_ZOOM = 11;

const CoordinateMap = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [locations, setLocations] = useState(null);
  const [locationsFailed, setLocationsFailed] = useState(false);
  const [locationsRequest, setLocationsRequest] = useState(0);
  const { language, t } = useLanguage();
  const manifest = useManifest();
  const [viewBounds, setViewBounds] = useState(REGION_BOUNDS);
  const [map, setMap] = useState(null);
  const [toast, setToast] = useState(null);
  const { position, failed: positionFailed } = useTrack();

  // Areas with aerial imagery; "here" is the one around the centre of the view
  const regions = regionList(manifest);
  const here = regionAt(regions, viewBounds);

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
    fetch(api.locations(language))
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
  }, [locationsRequest, language]);

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

  // React Router hands an updater the query string of the last render; two
  // updates in one go (choosing an area sets the year, and the flight that
  // follows sets "centered") would undo each other. The browser's URL is
  // always current (BrowserRouter writes it at once), so start from that.
  const updateParams = (update) =>
    setSearchParams(() => {
      const params = new URLSearchParams(window.location.search);
      update(params);
      return params;
    });

  const handleMenuItemClick = (item) => {
    if (item === "year") {
      return (newYear) => {
        updateParams((params) => {
          if (newYear) {
            params.set("year", newYear);
          } else {
            params.delete("year");
          }
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

  // A new tracking mode also recenters the map ("centered" is dropped)
  const handleTrackingModeChange = (newMode) => {
    setSearchParams((params) => {
      if (newMode === "area") {
        params.delete("track");
      } else {
        params.set("track", newMode);
      }
      params.delete("centered");
      return params;
    });
  };

  // Choosing an area: 1. fly there at a medium zoom, 2. zoom in to its start
  // (regions.js) or its whole bounds, 3. only then its year comes on, and its
  // name welcomes. A drag on the way stops it; reduced motion jumps there.
  const handleRegion = (region) => {
    if (!map) return;
    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const start = regionStart(region);
    // The location button's "whole area" (Track) must not fly back home;
    // its own flight may still be on, which hides ours from it
    updateParams((params) => params.set("centered", "false"));
    const arrive = () => {
      if (start) {
        handleMenuItemClick("year")(start.time);
      } else if (year && !region.times.includes(year)) {
        // A selected year the area doesn't have gives way to its earliest
        handleMenuItemClick("year")(region.times[0]);
      }
      setToast({
        title: localized(region.title, language),
        years: start ? start.time : yearRange(region.times),
        id: Date.now(),
      });
    };

    const bounds = leafletBounds(region.bounds);
    const target = start
      ? [start.center[1], start.center[0]]
      : bounds.getCenter();
    const zoom = start ? start.zoom : map.getBoundsZoom(bounds);
    if (reduced) {
      map.setView(target, zoom, { animate: false });
      arrive();
      return;
    }

    const far = map.getCenter().distanceTo(target) > 50;
    const flyZoom = Math.min(map.getZoom(), FLY_ZOOM);
    const steps = [];
    if (far) steps.push(() => map.flyTo(target, flyZoom, { duration: 1.6 }));
    if ((far ? flyZoom : map.getZoom()) !== zoom) {
      steps.push(() => map.flyTo(target, zoom, { duration: 1.2 }));
    }
    let stopped = false;
    const stop = () => (stopped = true);
    map.once("dragstart", stop);
    const next = (i) => {
      if (stopped) return;
      if (i === steps.length) {
        map.off("dragstart", stop);
        arrive();
        return;
      }
      map.once("moveend", () => next(i + 1));
      steps[i]();
    };
    next(0);
  };

  // A plain visit (no year, place or tour in the link) opens like choosing
  // the home area: Track zooms in to its start, then its year comes on and
  // its name welcomes
  const welcomed = useRef(false);
  useEffect(() => {
    if (welcomed.current || !manifest || !map) return;
    welcomed.current = true;
    const home = regions.find((region) => region.id === HOME_REGION);
    const start = home && regionStart(home);
    const plain =
      !year &&
      !legacyHistoric &&
      !locationSlug &&
      !tourId &&
      trackingMode === "area" &&
      !userInteracted;
    if (!start || !plain) return;
    const welcome = () => {
      handleMenuItemClick("year")(start.time);
      setToast({
        title: localized(home.title, language),
        years: start.time,
        id: Date.now(),
      });
    };
    const arrived =
      map.getZoom() === start.zoom &&
      map.getCenter().distanceTo(fallbackCenter) < 50;
    if (arrived) welcome();
    else map.once("moveend", welcome);
  }, [manifest, map]); // eslint-disable-line react-hooks/exhaustive-deps

  // A place chosen in a panel (a village's house, a house's village): open
  // it and bring it into view, close enough to see it
  const handleOpenPlace = (place) => {
    setSearchParams((params) => {
      params.set("location", place.slug);
      return params;
    });
    if (!map) return;
    const zoom = isHouse(place) ? HOUSE_ZOOM : LANDMARK_LABEL_ZOOM;
    map.flyTo([place.lat, place.lon], Math.max(map.getZoom(), zoom), {
      duration: 0.8,
    });
  };

  // The house nearest the centre, close up (no label while a panel is open)
  const labelSlug = useWallLabel(map, locations, showMarkers && !showInfo);
  const labelPlace = locations?.find((loc) => loc.slug === labelSlug);

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
    <div id="map" style={{ position: "relative", height: "100dvh" }}>
      {/* The map is always light grey, so everything in it (dots, tooltips,
          the OSM credit) uses the light scheme in both modes; the dock, the
          buttons and the panels follow the colour mode */}
      <div data-mui-color-scheme="light">
        <MapContainer
          ref={setMap}
          zoomControl={false}
          center={fallbackCenter}
          zoom={OPENING_ZOOM}
          maxZoom={MAX_ZOOM}
          style={{ height: "100dvh", width: "100%" }}
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
          <CompactAttribution />
          <Track
            position={position}
            trackingMode={trackingMode}
            fallbackCenter={fallbackCenter}
            fallbackZoom={HOME.zoom}
            onUserInteraction={(interacted) => {
              updateParams((params) => {
                if (interacted) {
                  params.set("centered", "false");
                } else {
                  params.delete("centered");
                }
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
              focusSlug={labelSlug}
            />
          )}

          {locationSlug && (
            <LocationInfo
              open={showInfo}
              onClose={handleInfoClose}
              onOpen={handleOpenPlace}
              slug={locationSlug}
            />
          )}

          {tourId && <Tour id={tourId} />}
        </MapContainer>
      </div>
      {locationsFailed && (
        <Notice
          message={t.placesFailed}
          actionLabel={t.retry}
          onAction={() => setLocationsRequest((n) => n + 1)}
        />
      )}
      <Toast toast={toast} />
      <Menu
        onItemClick={handleMenuItemClick}
        itemState={{
          year: year,
          showMarkers: showMarkers,
          tourId: tourId,
        }}
        regions={regions}
        hereId={here?.id}
        onRegion={handleRegion}
        time={manifest?.times[year]}
        year={year}
        float={
          <>
            <TrackControl
              mode={trackingMode}
              userInteracted={userInteracted}
              position={position}
              failed={positionFailed}
              onModeChange={handleTrackingModeChange}
            />
            <WallLabel
              place={labelPlace}
              openSlug={locationSlug}
              onOpen={(place) =>
                setSearchParams((params) => {
                  params.set("location", place.slug);
                  return params;
                })
              }
            />
            <MiniPlayer
              openSlug={locationSlug}
              onOpen={(slug) =>
                setSearchParams((params) => {
                  params.set("location", slug);
                  return params;
                })
              }
            />
          </>
        }
      >
        <TimeSlider
          years={years}
          times={manifest?.times}
          year={year}
          onChange={handleMenuItemClick("year")}
        />
        <ZoomButtons map={map} />
      </Menu>
    </div>
  );
};

export default CoordinateMap;
