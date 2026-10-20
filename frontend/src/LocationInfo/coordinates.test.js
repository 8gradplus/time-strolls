import { formatCoordinates } from "./coordinates";

describe("formatCoordinates", () => {
  test("formats degrees, minutes and seconds with hemispheres", () => {
    expect(formatCoordinates(48.61638, 14.06916)).toBe(
      "48°36′59″ N, 14°04′09″ E",
    );
  });

  test("carries rounded seconds into minutes and degrees", () => {
    expect(formatCoordinates(48.9999999, 14.5)).toBe(
      "49°00′00″ N, 14°30′00″ E",
    );
  });

  test("uses S and W for negative values", () => {
    expect(formatCoordinates(-33.5, -70.25)).toBe("33°30′00″ S, 70°15′00″ W");
  });
});
