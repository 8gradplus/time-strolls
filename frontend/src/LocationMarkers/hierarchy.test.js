import { describe, expect, test } from "vitest";
import {
  displayName,
  groupsOf,
  hoverName,
  labelAt,
  markOf,
  visibleAt,
} from "./hierarchy";

const t = { kinds: { chapel: "Kapelle", church: "Kirche" } };
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
    expect(visibleAt(house, 16, {})).toBe(false);
    expect(visibleAt(house, 17, {})).toBe(true);
    expect(visibleAt(house, 12, { active: true })).toBe(true);
  });

  test("hides a chapel on its village's point until zoom 16", () => {
    expect(visibleAt(chapel, 15, { onParent: true })).toBe(false);
    expect(visibleAt(chapel, 16, { onParent: true })).toBe(true);
    expect(visibleAt(chapel, 12, {})).toBe(true);
    expect(visibleAt(village, 10, {})).toBe(true);
  });

  test("keeps a chapel on exactly its village's point hidden", () => {
    const options = { onParent: true, sameSpot: true };
    expect(visibleAt(chapel, 19, options)).toBe(false);
    expect(visibleAt(chapel, 12, { ...options, active: true })).toBe(true);
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

describe("displayName", () => {
  test("names a chapel called only 'kaple' after its village", () => {
    expect(displayName(chapel, village, t)).toBe("Kapelle · Oberuresch");
    expect(displayName({ kind: "chapel", name: "Kaplička " }, village, t)).toBe(
      "Kapelle · Oberuresch",
    );
  });

  test("keeps real names, and generic ones without a village", () => {
    const named = { kind: "chapel", name: "Waldkapelle Oberuresch" };
    expect(displayName(named, village, t)).toBe("Waldkapelle Oberuresch");
    expect(displayName(chapel, null, t)).toBe("kaple");
  });

  test("adds the house name on hover", () => {
    expect(hoverName({ ...house, house_name: "Jogl" }, village, t)).toBe(
      "Oberuresch 3 · Jogl",
    );
    expect(hoverName(house, village, t)).toBe("Oberuresch 3");
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
