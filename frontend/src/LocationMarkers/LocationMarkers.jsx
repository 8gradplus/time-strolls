import { useEffect, useRef, useState } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import LocationMarker from "./LocationMarker";
import { markPositions } from "./position";
import {
  CLOSE_UP_ZOOM,
  clusterRadius,
  hasMore,
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
  // focusSlug: the place with the wall label (WallLabel.jsx) gets a ring.
  // touch: no hover; houses, churches and chapels are named by the wall
  // label instead (Leaflet would open the hover name on a tap too)
  const { open, onClick, locations, activeSlug, focusSlug, touch } = props;
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  const placesGroup = useStaleClusterFix(open);
  const closeUpGroup = useStaleClusterFix(open && zoom >= CLOSE_UP_ZOOM);

  if (!open) return null;

  const isActive = (place) =>
    place.slug === activeSlug || place.slug === focusSlug;
  const positionOf = markPositions(map, locations, zoom);
  const marker = (place) => (
    <LocationMarker
      key={place.id}
      {...positionOf(place)}
      mark={markOf(place.kind)}
      filled={place.images > 0}
      label={labelAt(place, zoom, place.name)}
      hoverLabel={touch && isCloseUp(place) ? null : hoverName(place)}
      more={hasMore(place)}
      active={isActive(place)}
      zoom={zoom}
      onClick={onClick(place.id)}
    />
  );

  const closeUpPlaces = locations.filter(isCloseUp);
  const closeUp = zoom >= CLOSE_UP_ZOOM;
  const places = locations
    .filter((place) => !isCloseUp(place))
    .sort(
      (a, b) =>
        LAYER[markOf(a.kind)] - LAYER[markOf(b.kind)] ||
        Number(isActive(a)) - Number(isActive(b)),
    );
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
