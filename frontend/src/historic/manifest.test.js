import {
  attribution,
  formatDatetime,
  leafletBounds,
  legacyHistoricYear,
  sources,
  tileUrl,
  yearLabel,
  yearsInBounds,
} from "./manifest";

const layer = (overrides) => ({
  id: "cz-cenia-ortho",
  url: "cz-cenia-ortho/1952/{z}/{x}/{y}.webp",
  datetime: ["1952"],
  attribution: "CENIA",
  licence: "CC-BY-4.0",
  ...overrides,
});

const manifest = {
  version: 1,
  times: {
    1928: { bounds: [13.08, 52.33, 13.77, 52.68], layers: [layer()] },
    1952: { bounds: [14.0, 48.58, 14.16, 48.68], layers: [layer()] },
    1949: { bounds: [14.0, 48.625827, 14.16, 48.68], layers: [layer()] },
  },
};

describe("yearsInBounds", () => {
  test("returns only intersecting years, ascending", () => {
    expect(yearsInBounds(manifest, [14.05, 48.6, 14.1, 48.65])).toEqual([
      "1949",
      "1952",
    ]);
  });

  test("excludes a year outside the view", () => {
    // Southern part of the region, below the 1949 strip
    expect(yearsInBounds(manifest, [14.05, 48.58, 14.1, 48.6])).toEqual([
      "1952",
    ]);
  });

  test("handles a missing manifest", () => {
    expect(yearsInBounds(null, [0, 0, 1, 1])).toEqual([]);
  });
});

test("tileUrl resolves relative to the manifest and keeps placeholders", () => {
  expect(tileUrl(layer())).toBe(
    "https://timestrolls.fra1.cdn.digitaloceanspaces.com/tiles/cz-cenia-ortho/1952/{z}/{x}/{y}.webp",
  );
});

test("leafletBounds converts [w, s, e, n] to [[s, w], [n, e]]", () => {
  expect(leafletBounds([14.0, 48.58, 14.16, 48.68])).toEqual([
    [48.58, 14.0],
    [48.68, 14.16],
  ]);
});

test("attribution appends the licence", () => {
  expect(attribution(layer())).toBe("CENIA (CC-BY-4.0)");
  expect(attribution(layer({ licence: null }))).toBe("CENIA");
});

test("sources lists only the layers the best tiles are made from", () => {
  const time = {
    best: { url: "best/1952/{z}/{x}/{y}.webp", layers: ["a", "b"] },
    layers: [
      layer({ id: "a", attribution: "A" }),
      layer({ id: "c", attribution: "C" }),
      layer({ id: "b", attribution: "B", licence: null }),
    ],
  };
  expect(sources(time)).toEqual(["A (CC-BY-4.0)", "B"]);
});

test("sources lists all layers without a best entry", () => {
  const time = {
    layers: [layer({ attribution: "A" }), layer({ attribution: "B" })],
  };
  expect(sources(time)).toEqual(["A (CC-BY-4.0)", "B (CC-BY-4.0)"]);
});

test("legacyHistoricYear is the earliest year in our region", () => {
  expect(legacyHistoricYear(manifest)).toBe("1949");
  expect(legacyHistoricYear({ times: {} })).toBeNull();
});

describe("formatDatetime", () => {
  test("year only", () => {
    expect(formatDatetime(["1952"], "de")).toBe("1952");
  });

  test("month precision", () => {
    expect(formatDatetime(["1953-06-01"], "en")).toBe("June 1953");
    expect(formatDatetime(["1953-06-01"], "de")).toBe("Juni 1953");
  });

  test("interval", () => {
    expect(formatDatetime(["1952/1953"], "en")).toBe("1952–1953");
  });
});

test("yearLabel joins distinct dates of all layers", () => {
  const time = {
    layers: [
      layer({ datetime: ["2025-06-11"] }),
      layer({ datetime: ["2025-06-20"] }),
      layer({ datetime: ["2025"] }),
    ],
  };
  expect(yearLabel(time, "en")).toBe("June 2025, 2025");
});
