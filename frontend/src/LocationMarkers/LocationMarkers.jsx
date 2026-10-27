import { useEffect, useRef, useState } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import LocationMarker from "./LocationMarker";
import {
  CLOSE_UP_ZOOM,
  clusterRadius,
  hoverName,
  isCloseUp,
  labelAt,
  markOf,
} from "./hierarchy";

// Mills first, so villages and the open place lie on top
const LAYER = { ring: 1, dot: 2 };

// Leaflet.markercluster sometimes leaves a cluster of an earlier zoom on the
// map when one zoom follows another (a stale "3" beside the places it holds).
// Once a zoom animation is over, rebuild the group's clusters: a few dozen
// markers, and the split animation stays. Returns the ref for the group.
const useStaleClusterFix = (mounted) => {
  const ref = useRef(null);
  useEffect(() => {
    const group = ref.current;
    if (!mounted || !group) return;
    let timer;
    const rebuild = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (group._inZoomAnimation) return;
        const layers = group.getLayers();
        group.clearLayers();
        group.addLayers(layers);
      });
    };
    group.on("animationend", rebuild);
    return () => {
      clearTimeout(timer);
      group.off("animationend", rebuild);
    };
  }, [mounted]);
  return ref;
};

// Houses, churches and chapels that touch join in a cluster too
// (CLOSE_UP_ZOOM and closer)
const CLOSE_UP_CLUSTER_RADIUS = 16;

const LocationMarkers = (props) => {
  // focusSlug: the house with the wall label (WallLabel.jsx) gets a ring
  const { open, onClick, locations, activeSlug, focusSlug } = props;
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  const placesGroup = useStaleClusterFix(open);
  const closeUpGroup = useStaleClusterFix(open && zoom >= CLOSE_UP_ZOOM);

  if (!open) return null;

  const isActive = (place) =>
    place.slug === activeSlug || place.slug === focusSlug;
  const marker = (place) => (
    <LocationMarker
      key={place.id}
      lat={place.lat}
      lon={place.lon}
      mark={markOf(place.kind)}
      filled={place.images > 0}
      label={labelAt(place, zoom, place.name)}
      hoverLabel={hoverName(place)}
      active={isActive(place)}
      zoom={zoom}
      onClick={onClick(place.id)}
    />
  );

  const places = locations
    .filter((place) => !isCloseUp(place))
    .sort(
      (a, b) =>
        LAYER[markOf(a.kind)] - LAYER[markOf(b.kind)] ||
        Number(isActive(a)) - Number(isActive(b)),
    );
  const closeUpPlaces = locations.filter(isCloseUp);
  const closeUp = zoom >= CLOSE_UP_ZOOM;
  // Further out, only the open one, on its own
  const openOne = !closeUp && closeUpPlaces.find((place) => isActive(place));

  // Places that overlap join in a cluster, which splits as you zoom in;
  // those on the same point spread out around it at the closest zoom. The
  // houses, churches and chapels have their own group from CLOSE_UP_ZOOM on,
  // so the clusters further out count only villages and the like.
  return (
    <>
      <MarkerClusterGroup
        ref={placesGroup}
        chunkedLoading
        maxClusterRadius={clusterRadius}
        spiderfyOnMaxZoom={true}
        showCoverageOnHover={false}
        zoomToBoundsOnClick={true}
      >
        {places.map(marker)}
      </MarkerClusterGroup>
      {closeUp && (
        <MarkerClusterGroup
          ref={closeUpGroup}
          chunkedLoading
          maxClusterRadius={CLOSE_UP_CLUSTER_RADIUS}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          zoomToBoundsOnClick={true}
        >
          {closeUpPlaces.map(marker)}
        </MarkerClusterGroup>
      )}
      {openOne && marker(openOne)}
    </>
  );
};

export default LocationMarkers;
