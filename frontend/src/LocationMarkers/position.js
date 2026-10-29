import { CLOSE_UP_ZOOM, displaced, isCloseUp } from "./hierarchy";

// Where each place's mark sits at this zoom: on its own point, or close up
// moved aside from its village's dot (`displaced` in hierarchy.js). Returns
// a function place -> { lat, lon, leader }, `leader` the offset in pixels
// (or null). Used by the marks and by the wall label, so both agree.
export const markPositions = (map, locations, zoom) => {
  const project = (place) => map.project([place.lat, place.lon], zoom);
  const offsets =
    zoom >= CLOSE_UP_ZOOM
      ? displaced(
          locations.filter(isCloseUp),
          locations.filter((place) => !isCloseUp(place)),
          project,
        )
      : new Map();
  return (place) => {
    const leader = offsets.get(place.slug);
    if (!leader) return { lat: place.lat, lon: place.lon, leader: null };
    const point = project(place).add([leader.dx, leader.dy]);
    const { lat, lng } = map.unproject(point, zoom);
    return { lat, lon: lng, leader };
  };
};
