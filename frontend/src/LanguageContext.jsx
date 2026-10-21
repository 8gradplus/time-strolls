import { createContext, useContext, useEffect, useState } from "react";

const LanguageContext = createContext();

const translations = {
  de: {
    timeTravel: "Zeitreise durch historische Luftbilder",
    off: "Aus",
    zoomIn: "Vergrößern",
    zoomOut: "Verkleinern",
    placesFailed: "Die Orte konnten nicht geladen werden.",
    placeFailed:
      "Dieser Ort konnte nicht geladen werden. Bitte schließen und noch einmal versuchen.",
    retry: "Erneut versuchen",
    enhanced: "Nachbearbeitet",
    aiGenerated: "KI-generiert",
    showLocations: "Orte anzeigen",
    withSupportFrom: "Mit Unterstützung von",
    menu: "Menü",
    map: "Karte",
    tours: "Touren",
    listen: "Anhören",
    showArea: "Gebiet zeigen",
    followMe: "Meinem Standort folgen",
    sources: "Quellen",
    aerialImagery: "Luftbild",
    photo: "Foto",
    audio: "Hören",
    photos: "Bilder",
    photoViewer: "Bildansicht",
    close: "Schließen",
    previous: "Zurück",
    next: "Weiter",
    appearance: "Darstellung",
    modeSystem: "Automatisch",
    modeLight: "Hell",
    modeDark: "Dunkel",
  },
  cz: {
    timeTravel: "Cesta časem po historických leteckých snímcích",
    off: "Vypnuto",
    zoomIn: "Přiblížit",
    zoomOut: "Oddálit",
    placesFailed: "Místa se nepodařilo načíst.",
    placeFailed:
      "Toto místo se nepodařilo načíst. Zavřete ho a zkuste to znovu.",
    retry: "Zkusit znovu",
    enhanced: "Upraveno",
    aiGenerated: "Vytvořeno umělou inteligencí",
    showLocations: "Zobrazit místa",
    withSupportFrom: "S podporou",
    menu: "Nabídka",
    map: "Mapa",
    tours: "Trasy",
    listen: "Poslechnout",
    showArea: "Zobrazit oblast",
    followMe: "Sledovat moji polohu",
    sources: "Zdroje",
    aerialImagery: "Letecký snímek",
    photo: "Foto",
    audio: "Poslech",
    photos: "Snímky",
    photoViewer: "Prohlížení snímků",
    close: "Zavřít",
    previous: "Předchozí",
    next: "Další",
    appearance: "Vzhled",
    modeSystem: "Automaticky",
    modeLight: "Světlý",
    modeDark: "Tmavý",
  },
  en: {
    timeTravel: "Time travel through historic aerial imagery",
    off: "Off",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    placesFailed: "The places could not be loaded.",
    placeFailed: "This place could not be loaded. Close it and try again.",
    retry: "Try again",
    enhanced: "Enhanced",
    aiGenerated: "AI-generated",
    showLocations: "Show locations",
    withSupportFrom: "With support from",
    menu: "Menu",
    map: "Map",
    tours: "Tours",
    listen: "Listen",
    showArea: "Show the area",
    followMe: "Follow my location",
    sources: "Sources",
    aerialImagery: "Aerial imagery",
    photo: "Photo",
    audio: "Listen",
    photos: "Photos",
    photoViewer: "Photo viewer",
    close: "Close",
    previous: "Previous",
    next: "Next",
    appearance: "Appearance",
    modeSystem: "Automatic",
    modeLight: "Light",
    modeDark: "Dark",
  },
};

const STORAGE_KEY = "language";

// The language picked earlier on this device, else the device's own language
// if we have it (Czech is "cs" there, "cz" here), else German.
export const initialLanguage = (stored, deviceLanguages = []) => {
  if (stored in translations) return stored;
  for (const tag of deviceLanguages) {
    const code = tag.toLowerCase().split("-")[0];
    if (code === "cs") return "cz";
    if (code in translations) return code;
  }
  return "de";
};

const readStored = () => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() =>
    initialLanguage(readStored(), navigator.languages),
  );
  const t = translations[language];

  useEffect(() => {
    document.documentElement.lang = language === "cz" ? "cs" : language;
  }, [language]);

  const chooseLanguage = (lang) => {
    setLanguage(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Private mode: the choice lasts for this visit only
    }
  };

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage: chooseLanguage, t }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
