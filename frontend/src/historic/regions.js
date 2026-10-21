// Areas ("Gebiete") in the menu: every region with aerial imagery, from the
// manifest's `regions` (published by aerial-timeline, spec in its CLAUDE.md).
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
