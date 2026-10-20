import { initialLanguage } from "./LanguageContext";

describe("initialLanguage", () => {
  test("keeps a language chosen earlier", () => {
    expect(initialLanguage("en", ["cs-CZ"])).toBe("en");
  });

  test("maps a Czech device to cz", () => {
    expect(initialLanguage(null, ["cs-CZ", "en"])).toBe("cz");
  });

  test("takes the first device language we have", () => {
    expect(initialLanguage(null, ["fr-FR", "en-GB", "de"])).toBe("en");
  });

  test("falls back to German", () => {
    expect(initialLanguage(null, ["fr-FR"])).toBe("de");
    expect(initialLanguage("xx", undefined)).toBe("de");
  });
});
