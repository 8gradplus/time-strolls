import { describe, expect, test } from "vitest";
import {
  clusterRadius,
  groupsOf,
  hoverName,
  labelAt,
  markOf,
  visibleAt,
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

describe("visibleAt", () => {
  test("shows houses only close up, or while open", () => {
    expect(visibleAt(house, 16)).toBe(false);
    expect(visibleAt(house, 17)).toBe(true);
    expect(visibleAt(house, 12, true)).toBe(true);
  });

  test("shows villages, churches and chapels at every zoom", () => {
    expect(visibleAt(village, 10)).toBe(true);
    expect(visibleAt(chapel, 10)).toBe(true);
  });
});

describe("clusterRadius", () => {
  test("joins only touching marks where the houses are", () => {
    expect(clusterRadius(14)).toBe(60);
    expect(clusterRadius(17)).toBe(16);
  });
});

describe("labelAt", () => {
  test("names villages from 15, landmarks from 16, house numbers from 18", () => {
    expect(labelAt(village, 14, "Oberuresch")).toBeNull();
    expect(labelAt(village, 15, "Oberuresch")).toBe("Oberuresch");
    expect(labelAt(chapel, 15, "Kapelle")).toBeNull();
    expect(labelAt(chapel, 16, "Kapelle")).toBe("Kapelle");
    expect(labelAt(house, 17, "Oberuresch 3")).toBeNull();
    expect(labelAt(house, 18, "Oberuresch 3")).toBe("3");
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
