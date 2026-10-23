// Areas ("Gebiete") in the menu: every region with aerial imagery, from the
// manifest's `regions` (published by aerial-timeline, spec in its CLAUDE.md).
// Where choosing one lands is ours (REGION_STARTS below).
import { MANIFEST_URL } from "./manifest";

// The regions as a list, each with its id; regions without years are left out.
export const regionList = (manifest) =>
  Object.entries(manifest?.regions ?? {})
    .map(([id, region]) => ({ id, ...region }))
    .filter((region) => region.times?.length > 0);

// A title in the UI language. The manifest uses ISO 639-1 ("cs"), the
// frontend "cz"; missing languages fall back to English, then to any.
export const localized = (value, language) => {
  if (value == null || typeof value === "string") return value;
  const code = language === "cz" ? "cs" : language;
  return value[code] ?? value.en ?? Object.values(value)[0];
};

// First and last year: "1947–2025", or one year.
export const yearRange = (times) =>
  times.length > 1 ? `${times[0]}–${times[times.length - 1]}` : times[0];

// The thumbnail, relative to the manifest.
export const previewUrl = (region, manifestUrl = MANIFEST_URL) =>
  region.preview ? new URL(region.preview, manifestUrl).href : null;

const contains = ([w, s, e, n], [lng, lat]) =>
  w <= lng && lng <= e && s <= lat && lat <= n;

// The region that contains the centre of the view ([w, s, e, n]), if any.
export const regionAt = (regions, [w, s, e, n]) =>
  regions.find((region) =>
    contains(region.bounds, [(w + e) / 2, (s + n) / 2]),
  ) ?? null;

// The app's own area: the page opens on its start, and the location button's
// "whole area" goes back to it
export const HOME_REGION = "sumava";

// Where choosing an area lands: a spot with a story, in a year whose imagery
// covers it fully, close enough to see it ([lng, lat] like the manifest).
// An area without a start (or whose year is gone from the
// manifest) shows its whole bounds instead.
export const REGION_STARTS = {
  // The Stadtschloss with Lustgarten, Dom and Unter den Linden; blown up in
  // 1950, so 1953 shows the empty site
  berlin: {
    center: [13.402, 52.517],
    zoom: 15,
    time: "1928",
  },
  // Deutsch Reichenau, the project's home, with its places
  sumava: {
    center: [14.069, 48.616],
    zoom: 15,
    time: "1952",
  },
};

// The start of an area, or null
export const regionStart = (region, starts = REGION_STARTS) => {
  const start = starts[region.id];
  return start && region.times.includes(start.time) ? start : null;
};
