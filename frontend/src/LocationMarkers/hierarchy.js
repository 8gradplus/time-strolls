// What the map shows of a place, by its kind and the zoom: villages always,
// churches and chapels as crosses, houses only close up. Pure functions, so
// the rules are tested (hierarchy.test.js).

// Houses appear from this zoom, their numbers from HOUSE_LABEL_ZOOM
export const HOUSE_ZOOM = 17;
export const HOUSE_LABEL_ZOOM = 18;
// Names next to villages from this zoom on (also for touch screens, where
// there is no hover), next to churches and chapels from LANDMARK_LABEL_ZOOM
export const LABEL_ZOOM = 15;
export const LANDMARK_LABEL_ZOOM = 16;
// Marks that overlap join in a cluster (as before round B) that splits as
// you zoom in; places on the same point split around it at the closest zoom.
// Close up, where the houses are, only marks that really touch.
export const clusterRadius = (zoom) => (zoom >= HOUSE_ZOOM ? 16 : 60);

const SACRAL = ["church", "chapel", "wayside_shrine"];
const HOUSES = ["house", "farm"];

// The shape drawn for a kind: "dot" (villages and everything without its
// own mark), "church", "chapel" (a smaller cross), "ring" (mills), "house"
export const markOf = (kind) => {
  if (kind === "church") return "church";
  if (SACRAL.includes(kind)) return "chapel";
  if (kind === "mill") return "ring";
  if (HOUSES.includes(kind)) return "house";
  return "dot";
};

export const isHouse = (place) => HOUSES.includes(place.kind);

export const visibleAt = (place, zoom, active = false) =>
  active || !isHouse(place) || zoom >= HOUSE_ZOOM;

// The text next to the mark at this zoom, or null (then only on hover)
export const labelAt = (place, zoom, name) => {
  if (isHouse(place)) return zoom >= HOUSE_LABEL_ZOOM ? place.number : null;
  const mark = markOf(place.kind);
  const from = mark === "dot" ? LABEL_ZOOM : LANDMARK_LABEL_ZOOM;
  return zoom >= from ? name : null;
};

// Hover or tap: the name, for a house also its house name ("Oberuresch 3 ·
// Jogl")
export const hoverName = (place) =>
  [place.name, place.house_name].filter(Boolean).join(" · ");

// The village panel's groups: churches and chapels, houses, the rest
export const groupsOf = (children) => {
  const sacral = children.filter((c) => SACRAL.includes(c.kind));
  const houses = children.filter(isHouse);
  const other = children.filter((c) => !SACRAL.includes(c.kind) && !isHouse(c));
  return [
    { key: "churchesAndChapels", places: sacral },
    { key: "houses", places: houses },
    { key: "placesHere", places: other },
  ].filter((group) => group.places.length > 0);
};
