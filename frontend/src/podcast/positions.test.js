import { formatTime, positionOf, savePosition } from "./positions";

describe("formatTime", () => {
  test("minutes and seconds, hours only when needed", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(95.7)).toBe("1:35");
    expect(formatTime(2956)).toBe("49:16");
    expect(formatTime(3700)).toBe("1:01:40");
  });

  test("a dash for an unknown length", () => {
    expect(formatTime(NaN)).toBe("–:––");
    expect(formatTime(Infinity)).toBe("–:––");
  });
});

describe("positions", () => {
  beforeEach(() => localStorage.clear());

  test("keeps the position and the length per episode", () => {
    expect(positionOf("a.mp3")).toBeNull();
    savePosition("a.mp3", 95.7, 2956.4);
    expect(positionOf("a.mp3")).toEqual({ t: 95, d: 2956 });
  });

  test("an unknown length doesn't overwrite a known one", () => {
    savePosition("a.mp3", 10, 2956);
    savePosition("a.mp3", 20, NaN);
    expect(positionOf("a.mp3")).toEqual({ t: 20, d: 2956 });
  });
});
