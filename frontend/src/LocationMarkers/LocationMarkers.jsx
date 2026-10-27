import { useEffect, useRef, useState } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import LocationMarker from "./LocationMarker";
import {
  HOUSE_ZOOM,
  clusterRadius,
  hoverName,
  isHouse,
  labelAt,
  markOf,
} from "./hierarchy";

// Villages first, so churches, chapels and the open place lie on top
const LAYER = { ring: 1, dot: 2, chapel: 3, church: 4 };

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

// Houses that touch join in a cluster too (HOUSE_ZOOM and closer)
const HOUSE_CLUSTER_RADIUS = 16;

const LocationMarkers = (props) => {
  // focusSlug: the house with the wall label (WallLabel.jsx) gets a ring
  const { open, onClick, locations, activeSlug, focusSlug } = props;
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  const placesGroup = useStaleClusterFix(open);
  const housesGroup = useStaleClusterFix(open && zoom >= HOUSE_ZOOM);

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
      onClick={onClick(place.id)}
    />
  );

  const places = locations
    .filter((place) => !isHouse(place))
    .sort(
      (a, b) =>
        LAYER[markOf(a.kind)] - LAYER[markOf(b.kind)] ||
        Number(isActive(a)) - Number(isActive(b)),
    );
  const houses = locations.filter(isHouse);
  const closeUp = zoom >= HOUSE_ZOOM;
  // Further out, only the open house, on its own
  const openHouse = !closeUp && houses.find((house) => isActive(house));

  // Places that overlap join in a cluster, which splits as you zoom in;
  // those on the same point spread out around it at the closest zoom. The
  // houses have their own group from HOUSE_ZOOM on, so the places' clusters
  // never count houses.
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
          ref={housesGroup}
          chunkedLoading
          maxClusterRadius={HOUSE_CLUSTER_RADIUS}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          zoomToBoundsOnClick={true}
        >
          {houses.map(marker)}
        </MarkerClusterGroup>
      )}
      {openHouse && marker(openHouse)}
    </>
  );
};

export default LocationMarkers;
