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
// A church or chapel on its village's point hides under the village's dot
// until this zoom; on exactly the same point (the source had no position of
// its own) at every zoom, and it is listed in the village's panel
export const APART_ZOOM = 16;
// Closer than this (in pixels) counts as on the village's point
export const SAME_POINT = 14;

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

// `onParent`: the place sits on its village's point at this zoom;
// `sameSpot`: on exactly the same point
export const visibleAt = (
  place,
  zoom,
  { active = false, onParent = false, sameSpot = false },
) => {
  if (active) return true;
  if (isHouse(place)) return zoom >= HOUSE_ZOOM;
  if (sameSpot) return false;
  if (onParent) return zoom >= APART_ZOOM;
  return true;
};

// The text next to the mark at this zoom, or null (then only on hover)
export const labelAt = (place, zoom, name) => {
  if (isHouse(place)) return zoom >= HOUSE_LABEL_ZOOM ? place.number : null;
  const mark = markOf(place.kind);
  const from = mark === "dot" ? LABEL_ZOOM : LANDMARK_LABEL_ZOOM;
  return zoom >= from ? name : null;
};

// Some chapels are named only with a word for chapel ("kaple"); they show
// as "Kapelle · Oberuresch" in the UI language. The data stays as it is.
const GENERIC = /^(kaple|kaplička|kapelle|chapel)$/i;

export const displayName = (place, parent, t) => {
  if (parent && GENERIC.test(place.name.trim())) {
    return `${t.kinds[place.kind] ?? place.name} · ${parent.name}`;
  }
  return place.name;
};

// Hover or tap: the name, for a house also its house name ("Oberuresch 3 ·
// Jogl")
export const hoverName = (place, parent, t) =>
  [displayName(place, parent, t), place.house_name].filter(Boolean).join(" · ");

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
