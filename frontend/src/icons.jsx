import L from "leaflet";

// One icon from the self-hosted Material Symbols font (index.css): outlined
// at weight 300, or filled for an active state. The font draws a glyph for the
// icon's name; a page translator would translate the name and break the icon,
// so it is marked untranslatable. Only names in design/icons/fetch-icons.sh exist.
export const Icon = ({ name, filled = false, size = 24, color, style }) => (
  <span
    className={`icon notranslate${filled ? " filled" : ""}`}
    translate="no"
    aria-hidden="true"
    style={{ fontSize: size, color, ...style }}
  >
    {name}
  </span>
);

// Drawn glyphs for the dock and the menu header, in the menu button's line:
// 1.6 px strokes in the text colour, round ends. The appearance glyphs are
// circles, like the logo and the dots: half filled for automatic, open for
// light, filled for dark.
const Glyph = ({ size, children }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    // 1.6 px on screen at any size
    strokeWidth={32 / size}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: "block", flex: "none" }}
  >
    {children}
  </svg>
);

// ⌄ closes the menu (it folds back down); › folds the dock. One chevron at
// 45°, turned
export const DownGlyph = ({ size = 20 }) => (
  <Glyph size={size}>
    <path d="M5.5 8 10 12.5 14.5 8" />
  </Glyph>
);

export const FoldGlyph = ({ size = 20 }) => (
  <Glyph size={size}>
    <path d="M8 5.5 12.5 10 8 14.5" />
  </Glyph>
);

export const ModeGlyph = ({ mode, size = 16 }) => (
  <Glyph size={size}>
    <circle
      cx="10"
      cy="10"
      r="6.5"
      fill={mode === "dark" ? "currentColor" : "none"}
    />
    {mode === "system" && (
      <path d="M10 3.5a6.5 6.5 0 0 0 0 13z" fill="currentColor" />
    )}
  </Glyph>
);

// ✕ for ending things that are not the menu (the mini player)
export const CloseGlyph = ({ size = 18 }) => (
  <Glyph size={size}>
    <path d="M6 6l8 8M14 6l-8 8" />
  </Glyph>
);

// "15 back" / "30 ahead": an open circle with an arrow head, the seconds in it
export const SkipGlyph = ({ seconds, back = false, size = 26 }) => (
  <Glyph size={size}>
    <g transform={back ? undefined : "translate(20 0) scale(-1 1)"}>
      <path d="M6.3 4.9A6.6 6.6 0 1 1 3.5 10" />
      <path d="M6.6 2 6.3 4.9 9.2 5.3" />
    </g>
    <text
      x="10"
      y="12.6"
      textAnchor="middle"
      fontSize="6"
      fontWeight="500"
      fill="currentColor"
      stroke="none"
      style={{ fontFamily: "inherit" }}
    >
      {seconds}
    </text>
  </Glyph>
);

// ▸ and ❚❚ filled, on the red button; .pp-play and .pp-pause cross-fade
export const PlayPauseGlyph = ({ size = 22 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    aria-hidden="true"
    fill="currentColor"
    style={{ display: "block" }}
  >
    <path
      className="pp-play"
      d="M8.5 5.8v12.4a.6.6 0 0 0 .92.5l9.6-6.2a.6.6 0 0 0 0-1L9.42 5.3a.6.6 0 0 0-.92.5z"
    />
    <g className="pp-pause">
      <rect x="7" y="5.5" width="3.4" height="13" rx="1" />
      <rect x="13.6" y="5.5" width="3.4" height="13" rx="1" />
    </g>
  </svg>
);

// A place: a mark by its kind (LocationMarkers/hierarchy.js; .place-* in
// index.css), inside a larger transparent area that is easy to tap. A
// village is a dot in the map accent with a white ring, a church or chapel
// a dark disc with a white cross, a mill a ring, a house a small hollow dot
// (filled where it has photos). The open place gets a halo.
const PLACE_TAP_SIZE = 44;

// Churches and chapels: a dark disc in a white ring with a white cross cut
// into it (the red stays for villages and what is open); a church larger
const SACRAL_SCALE = { church: 1.15, chapel: 0.85 };

const sacralMark = (scale, classes) => {
  const r = 8.6 * scale;
  const h = r * 0.62;
  const arm = r * 0.4;
  const bar = -h * 0.32;
  const f = (n) => n.toFixed(2);
  return `<svg class="${classes}" width="24" height="24" viewBox="-12 -12 24 24" aria-hidden="true"><circle class="edge" r="${f(r + 1.2)}"/><circle class="ring" r="${f(r + 0.4)}"/><circle class="disc" r="${f(r - 1.8)}"/><path class="cross" d="M0 ${f(-h)}V${f(h)}M${f(-arm)} ${f(bar)}H${f(arm)}" stroke-width="${f(2 * scale)}"/></svg>`;
};

// One icon per look: react-leaflet replaces a marker's icon (its DOM element)
// whenever it gets a new object, so every render would rebuild every marker
const placeIcons = new Map();

// leader: a mark moved aside from its true point by { dx, dy } pixels gets a
// hairline back to it (LocationMarkers/hierarchy.js `displaced`)
export const placeIcon = (
  mark = "dot",
  active = false,
  filled = false,
  leader,
) => {
  const key = `${mark}-${active}-${filled}-${leader ? `${leader.dx},${leader.dy}` : ""}`;
  if (!placeIcons.has(key)) {
    placeIcons.set(key, makePlaceIcon(mark, active, filled, leader));
  }
  return placeIcons.get(key);
};

const leaderLine = ({ dx, dy }) => {
  const c = PLACE_TAP_SIZE / 2;
  return `<svg class="place-leader" width="${PLACE_TAP_SIZE}" height="${PLACE_TAP_SIZE}" aria-hidden="true"><line x1="${c}" y1="${c}" x2="${c - dx}" y2="${c - dy}"/></svg>`;
};

const makePlaceIcon = (mark, active, filled, leader) => {
  const classes = ["place-mark", `place-${mark}`];
  if (active) classes.push("active");
  if (filled) classes.push("filled");
  const scale = SACRAL_SCALE[mark];
  const html =
    (leader ? leaderLine(leader) + `<span class="place-hit"></span>` : "") +
    (scale
      ? sacralMark(scale, classes.join(" "))
      : `<span class="${classes.join(" ")}"></span>`);

  return L.divIcon({
    html,
    className: leader ? "place-marker leader" : "place-marker",
    iconSize: [PLACE_TAP_SIZE, PLACE_TAP_SIZE],
    iconAnchor: [PLACE_TAP_SIZE / 2, PLACE_TAP_SIZE / 2],
  });
};

export const currentLocationIcon = (color = "#4285F4", size = 32) => {
  const center = size / 2;
  const outerRadius = size * 0.33;
  const haloRadius = size * 0.31;
  const coreRadius = size * 0.22;
  const haloColor = "white";

  const svg = `
    <svg class="pulsating-location" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle class="outer" cx="${center}" cy="${center}" r="${outerRadius}" fill="${color}" />
      <circle class="halo" cx="${center}" cy="${center}" r="${haloRadius}" fill="${haloColor}" />
      <circle class="core" cx="${center}" cy="${center}" r="${coreRadius}" fill="${color}" />
    </svg>
  `;

  return L.divIcon({
    html: svg.trim(),
    className: "",
    iconSize: [size, size],
    iconAnchor: [center, center],
  });
};
