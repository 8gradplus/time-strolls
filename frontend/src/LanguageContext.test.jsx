import { initialLanguage } from "./LanguageContext";

describe("initialLanguage", () => {
  test("keeps a language chosen earlier", () => {
    expect(initialLanguage("en", ["cs-CZ"])).toBe("en");
  });

  test("maps a Czech device to cs", () => {
    expect(initialLanguage(null, ["cs-CZ", "en"])).toBe("cs");
  });

  test("turns a stored cz (before 2026-10) into cs", () => {
    expect(initialLanguage("cz", ["en"])).toBe("cs");
  });

  test("takes the first device language we have", () => {
    expect(initialLanguage(null, ["fr-FR", "en-GB", "de"])).toBe("en");
  });

  test("falls back to English", () => {
    expect(initialLanguage(null, ["fr-FR"])).toBe("en");
    expect(initialLanguage("xx", undefined)).toBe("en");
  });
});
