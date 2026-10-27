import { describe, expect, test } from "vitest";
import {
  clusterRadius,
  groupsOf,
  hoverName,
  labelAt,
  labelTarget,
  markOf,
} from "./hierarchy";

const village = { kind: "village", name: "Oberuresch" };
const house = { kind: "house", name: "Oberuresch 3", number: "3" };
const chapel = { kind: "chapel", name: "kaple" };

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
  test("names villages from 15, landmarks from 16, never houses", () => {
    expect(labelAt(village, 14, "Oberuresch")).toBeNull();
    expect(labelAt(village, 15, "Oberuresch")).toBe("Oberuresch");
    expect(labelAt(chapel, 15, "Kapelle")).toBeNull();
    expect(labelAt(chapel, 16, "Kapelle")).toBe("Kapelle");
    expect(labelAt(house, 19, "Oberuresch 3")).toBeNull();
  });
});

describe("hoverName", () => {
  test("adds the house name", () => {
    expect(hoverName({ ...house, house_name: "Jogl" })).toBe(
      "Oberuresch 3 · Jogl",
    );
    expect(hoverName(house)).toBe("Oberuresch 3");
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

describe("labelTarget", () => {
  const options = { reach: 70, hysteresis: 12 };
  test("takes the nearest house within reach", () => {
    const d = [
      { slug: "a", d: 40 },
      { slug: "b", d: 20 },
      { slug: "c", d: 90 },
    ];
    expect(labelTarget(d, null, options)).toBe("b");
    expect(labelTarget([{ slug: "c", d: 90 }], "c", options)).toBeNull();
  });

  test("keeps the current house until another is clearly closer", () => {
    const close = [
      { slug: "a", d: 30 },
      { slug: "b", d: 22 },
    ];
    expect(labelTarget(close, "a", options)).toBe("a");
    const clear = [
      { slug: "a", d: 40 },
      { slug: "b", d: 20 },
    ];
    expect(labelTarget(clear, "a", options)).toBe("b");
  });
});
