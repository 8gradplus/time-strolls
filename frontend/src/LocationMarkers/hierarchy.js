// What the map shows of a place, by its kind and the zoom: villages always,
// churches and chapels as dark discs with a cross, houses only close up. Pure
// functions, so the rules are tested (hierarchy.test.js).

// Houses appear from this zoom. They have no names next to them: the house
// nearest the centre of the map gets the wall label (WallLabel.jsx)
export const HOUSE_ZOOM = 17;
// Names next to villages from this zoom on (also for touch screens, where
// there is no hover), next to mills from LANDMARK_LABEL_ZOOM. Churches and
// chapels have no name on the map at all: a tap opens them
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

// The text next to the mark at this zoom, or null (then only on hover)
export const labelAt = (place, zoom, name) => {
  if (isHouse(place) || SACRAL.includes(place.kind)) return null;
  const mark = markOf(place.kind);
  const from = mark === "dot" ? LABEL_ZOOM : LANDMARK_LABEL_ZOOM;
  return zoom >= from ? name : null;
};

// Hover: a house by its house name ("Jogl"), "Reiterschlag 7" only where it
// has none; churches and chapels by nothing; other places by their name
export const hoverName = (place) =>
  SACRAL.includes(place.kind) ? null : place.house_name || place.name;

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

// The wall label's house: the nearest to the centre within `reach` pixels.
// The current one stays until another is closer by `hysteresis` pixels, so
// the label doesn't flicker between neighbours. `distances`: [{ slug, d }]
export const WALL_LABEL = { reach: 70, hysteresis: 12 };

export const labelTarget = (distances, current, options = WALL_LABEL) => {
  const near = distances
    .filter(({ d }) => d <= options.reach)
    .sort((a, b) => a.d - b.d);
  if (near.length === 0) return null;
  const kept = near.find(({ slug }) => slug === current);
  if (kept && near[0].d + options.hysteresis >= kept.d) return kept.slug;
  return near[0].slug;
};
