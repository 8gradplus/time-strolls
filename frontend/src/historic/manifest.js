// Historic aerial imagery published by aerial-timeline (see CLAUDE.md).
// The manifest is shared by all aerial-timeline projects, so it also lists other regions.

export const MANIFEST_URL =
  "https://timestrolls.fra1.cdn.digitaloceanspaces.com/tiles/manifest.json";

// Our region (Šumava box) as [w, s, e, n]; used before the map view is known.
export const REGION_BOUNDS = [14.0, 48.58, 14.16, 48.68];

// Map zoom limit; Leaflet upscales tiles above a layer's max_native_zoom.
export const MAX_ZOOM = 19;

const intersects = ([w1, s1, e1, n1], [w2, s2, e2, n2]) =>
  w1 <= e2 && w2 <= e1 && s1 <= n2 && s2 <= n1;

// Years (ascending) whose bounds touch the given [w, s, e, n] bounds.
export const yearsInBounds = (manifest, bounds) =>
  Object.keys(manifest?.times ?? {})
    .filter((year) => intersects(manifest.times[year].bounds, bounds))
    .sort();

// Layer URLs are relative to the manifest.
export const tileUrl = (layer, manifestUrl = MANIFEST_URL) =>
  decodeURI(new URL(layer.url, manifestUrl).href);

// Leaflet bounds [[s, w], [n, e]] from [w, s, e, n].
export const leafletBounds = ([w, s, e, n]) => [
  [s, w],
  [n, e],
];

export const attribution = (layer) =>
  layer.licence ? `${layer.attribution} (${layer.licence})` : layer.attribution;

// Sources of a year's imagery, one per layer drawn: the layers the best
// tiles are made from, or all layers without a `best` entry.
export const sources = (time) =>
  time.layers
    .filter((layer) => !time.best || time.best.layers.includes(layer.id))
    .map(attribution);

// Replacement for the old boolean `historic=true` link: the earliest year in our region.
export const legacyHistoricYear = (manifest) =>
  yearsInBounds(manifest, REGION_BOUNDS)[0] ?? null;

const locales = { de: "de-AT", cs: "cs-CZ", en: "en-GB" };

// One ISO 8601 date ("1952", "1953-06", "1953-06-01") as "1952" or "Juni 1953".
const formatDate = (iso, language) => {
  const [year, month] = iso.split("-");
  if (!month) return year;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  return new Intl.DateTimeFormat(locales[language] ?? language, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
};

// Acquisition date(s) of a layer; intervals ("1952/1953") become "1952–1953".
export const formatDatetime = (datetimes, language) =>
  datetimes
    .map((dt) =>
      dt
        .split("/")
        .map((part) => formatDate(part, language))
        .join("–"),
    )
    .join(", ");

// Label for a year: the distinct real dates of all its layers.
export const yearLabel = (time, language) =>
  [
    ...new Set(time.layers.map((l) => formatDatetime(l.datetime, language))),
  ].join(", ");
