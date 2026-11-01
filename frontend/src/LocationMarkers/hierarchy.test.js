import { describe, expect, test } from "vitest";
import {
  clusterRadius,
  displaced,
  groupsOf,
  hasMore,
  hoverName,
  isCloseUp,
  labelAt,
  markOf,
  visibleMarks,
} from "./hierarchy";

const village = { kind: "village", name: "Oberuresch" };
const house = { kind: "house", name: "Oberuresch 3", number: "3" };
const chapel = { kind: "chapel", name: "kaple" };

describe("visibleMarks", () => {
  const mill = { kind: "mill", name: "Luagmühle" };
  const church = { kind: "church", name: "kostel" };
  const all = [village, mill, house, chapel, church];
  const show = (zoom, villages, sacral) => {
    const { places, closeUps } = visibleMarks(all, zoom, { villages, sacral });
    return {
      places: places.map((p) => p.kind),
      closeUps: closeUps.map((p) => p.kind),
    };
  };

  test("villages only: as before, churches and chapels only close up", () => {
    expect(show(14, true, false)).toEqual({
      places: ["village", "mill"],
      closeUps: [],
    });
    expect(show(17, true, false)).toEqual({
      places: ["village", "mill"],
      closeUps: ["house", "chapel", "church"],
    });
  });

  test("both: churches and chapels at every zoom too", () => {
    expect(show(14, true, true).places).toEqual([
      "village",
      "mill",
      "chapel",
      "church",
    ]);
    expect(show(17, true, true)).toEqual({
      places: ["village", "mill"],
      closeUps: ["house", "chapel", "church"],
    });
  });

  test("churches and chapels only: nothing else, at any zoom", () => {
    expect(show(14, false, true)).toEqual({
      places: ["chapel", "church"],
      closeUps: [],
    });
    expect(show(17, false, true)).toEqual({
      places: [],
      closeUps: ["chapel", "church"],
    });
  });

  test("both off: nothing", () => {
    expect(show(14, false, false)).toEqual({ places: [], closeUps: [] });
    expect(show(18, false, false)).toEqual({ places: [], closeUps: [] });
  });
});

describe("isCloseUp", () => {
  test("shows houses, churches and chapels only close up", () => {
    expect(isCloseUp(house)).toBe(true);
    expect(isCloseUp(chapel)).toBe(true);
    expect(isCloseUp({ kind: "church" })).toBe(true);
    expect(isCloseUp(village)).toBe(false);
    expect(isCloseUp({ kind: "mill" })).toBe(false);
  });
});

describe("markOf", () => {
  test("gives each kind its mark", () => {
    expect(markOf("village")).toBe("dot");
    expect(markOf("hamlet")).toBe("dot");
    expect(markOf("church")).toBe("church");
    expect(markOf("chapel")).toBe("chapel");
    expect(markOf("wayside_shrine")).toBe("chapel");
    expect(markOf("mill")).toBe("ring");
    expect(markOf("house")).toBe("house");
  });
});

describe("clusterRadius", () => {
  test("joins only touching marks where the houses are", () => {
    expect(clusterRadius(14)).toBe(60);
    expect(clusterRadius(17)).toBe(16);
  });
});

describe("labelAt", () => {
  test("names villages from 15, mills from 16, never houses or chapels", () => {
    expect(labelAt(village, 14, "Oberuresch")).toBeNull();
    expect(labelAt(village, 15, "Oberuresch")).toBe("Oberuresch");
    expect(labelAt(chapel, 19, "kaple")).toBeNull();
    const mill = { kind: "mill", name: "Luagmühle" };
    expect(labelAt(mill, 15, "Luagmühle")).toBeNull();
    expect(labelAt(mill, 16, "Luagmühle")).toBe("Luagmühle");
    expect(labelAt(house, 19, "Oberuresch 3")).toBeNull();
  });
});

describe("displaced", () => {
  const project = (place) => ({ x: place.x, y: place.y });
  test("moves a chapel or house aside where it covers a village's dot", () => {
    const villages = [
      { slug: "oberuresch", x: 100, y: 100 },
      { slug: "reiterschlag", x: 300, y: 100 },
    ];
    const closeUps = [
      { slug: "kaple", x: 100, y: 100 },
      { slug: "house", x: 300, y: 160 },
    ];
    expect(displaced(closeUps, villages, project)).toEqual(
      new Map([["kaple", { dx: -22, dy: -22 }]]),
    );
    expect(displaced(closeUps, [], project)).toEqual(new Map());
  });
});

describe("hoverName", () => {
  test("names a house by its house name, else by its address", () => {
    expect(hoverName({ ...house, house_name: "Jogl" })).toBe("Jogl");
    expect(hoverName(house)).toBe("Oberuresch 3");
    expect(hoverName(chapel)).toBe("kaple");
  });
});

describe("groupsOf", () => {
  test("groups a village's places, leaving out empty groups", () => {
    const mill = { kind: "mill", name: "Luagmühle" };
    expect(groupsOf([house, chapel, mill]).map((g) => g.key)).toEqual([
      "churchesAndChapels",
      "houses",
      "placesHere",
    ]);
    expect(groupsOf([house])).toEqual([{ key: "houses", places: [house] }]);
  });
});

describe("hasMore", () => {
  test("is true for places with photos only", () => {
    expect(hasMore({ images: 2 })).toBe(true);
    expect(hasMore({ images: 0 })).toBe(false);
    expect(hasMore({})).toBe(false);
  });
});
