// What the map shows of a place, by its kind and the zoom: villages and
// mills always, houses, churches and chapels (dark discs with a cross) only
// close up. Pure functions, so the rules are tested (hierarchy.test.js).

// Houses, churches and chapels appear from this zoom. They have no names
// next to them: on hover, or on touch screens in the wall label of the one
// tapped (WallLabel.jsx)
export const CLOSE_UP_ZOOM = 17;
// Names next to villages from this zoom on (also for touch screens, where
// there is no hover), next to mills from LANDMARK_LABEL_ZOOM
export const LABEL_ZOOM = 15;
export const LANDMARK_LABEL_ZOOM = 16;
// Marks that overlap join in a cluster (as before round B) that splits as
// you zoom in; places on the same point split around it at the closest zoom.
// Close up, only marks that really touch.
export const clusterRadius = (zoom) => (zoom >= CLOSE_UP_ZOOM ? 16 : 60);

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

// Shown only close up, with the wall label instead of names
export const isCloseUp = (place) =>
  isHouse(place) || SACRAL.includes(place.kind);

// The text next to the mark at this zoom, or null (then only on hover)
export const labelAt = (place, zoom, name) => {
  if (isCloseUp(place)) return null;
  const mark = markOf(place.kind);
  const from = mark === "dot" ? LABEL_ZOOM : LANDMARK_LABEL_ZOOM;
  return zoom >= from ? name : null;
};

// Close up, a house, church or chapel on its village's dot (Oberuresch's
// chapel, Sankt Thoma's church) moves a little up and to the left, with a
// hairline back to its true point: both stay visible and clickable, and the
// village's name on the right stays clear of it. Returns the moved places'
// offsets in pixels by slug. `project`: a place's position in pixels ({ x, y })
export const COVER_RADIUS = 24;
export const LEADER = { dx: -22, dy: -22 };

export const displaced = (closeUps, places, project, radius = COVER_RADIUS) => {
  const dots = places.map(project);
  return new Map(
    closeUps
      .filter((place) => {
        const { x, y } = project(place);
        return dots.some((d) => Math.hypot(d.x - x, d.y - y) < radius);
      })
      .map((place) => [place.slug, LEADER]),
  );
};

// "There's more to see" (three pips, Components/Pips.jsx; a filled house
// dot): for now only photos. Later also podcasts and a description, once
// /api/locations/ says so (ROADMAP.md)
export const hasMore = (place) => place.images > 0;

// Hover: a house by its house name ("Jogl"), "Reiterschlag 7" only where it
// has none; other places by their name
export const hoverName = (place) => place.house_name || place.name;

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
