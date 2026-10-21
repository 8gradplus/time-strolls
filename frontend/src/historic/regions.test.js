import {
  localized,
  previewUrl,
  regionAt,
  regionList,
  yearRange,
} from "./regions";

const manifest = {
  times: {},
  regions: {
    sumava: {
      title: { de: "Böhmerwald", cs: "Šumava", en: "Bohemian Forest" },
      bounds: [13.74, 48.58, 14.34, 48.85],
      times: ["1952", "2023"],
    },
    berlin: {
      title: { en: "Berlin" },
      bounds: [13.08, 52.33, 13.77, 52.68],
      times: ["1928"],
    },
    empty: { title: "Empty", bounds: [0, 0, 1, 1], times: [] },
  },
};

describe("regionList", () => {
  test("lists the manifest's regions that have years", () => {
    const regions = regionList(manifest);
    expect(regions.map((r) => r.id)).toEqual(["sumava", "berlin"]);
    expect(regions[0].times).toEqual(["1952", "2023"]);
  });

  test("is empty without regions or before the manifest has loaded", () => {
    expect(regionList({ times: {} })).toEqual([]);
    expect(regionList(null)).toEqual([]);
  });
});

test("localized maps cz to cs and falls back to English", () => {
  const title = manifest.regions.sumava.title;
  expect(localized(title, "cz")).toBe("Šumava");
  expect(localized(title, "de")).toBe("Böhmerwald");
  expect(localized({ en: "Berlin" }, "de")).toBe("Berlin");
  expect(localized(null, "de")).toBeNull();
});

test("yearRange", () => {
  expect(yearRange(["1947", "1952", "2025"])).toBe("1947–2025");
  expect(yearRange(["1928"])).toBe("1928");
});

test("previewUrl resolves against the manifest", () => {
  const base = "https://cdn.example/tiles/manifest.json";
  expect(previewUrl({ preview: "regions/a/preview.webp?v=2" }, base)).toBe(
    "https://cdn.example/tiles/regions/a/preview.webp?v=2",
  );
  expect(previewUrl({}, base)).toBeNull();
});

test("regionAt finds the region around the centre of the view", () => {
  const regions = regionList(manifest);
  expect(regionAt(regions, [14.0, 48.6, 14.2, 48.7]).id).toBe("sumava");
  expect(regionAt(regions, [0, 0, 1, 1])).toBeNull();
});
