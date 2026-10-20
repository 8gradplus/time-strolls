import { createContext, useContext, useEffect, useState } from "react";

const LanguageContext = createContext();

const translations = {
  de: {
    historicImagery: "Historische Luftbilder",
    noImageryInView: "Keine Luftbilder in diesem Kartenausschnitt",
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
    photo: "Foto",
    appearance: "Darstellung",
    modeSystem: "Automatisch",
    modeLight: "Hell",
    modeDark: "Dunkel",
  },
  cz: {
    historicImagery: "Historické letecké snímky",
    noImageryInView: "V tomto výřezu mapy nejsou žádné letecké snímky",
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
    photo: "Foto",
    appearance: "Vzhled",
    modeSystem: "Automaticky",
    modeLight: "Světlý",
    modeDark: "Tmavý",
  },
  en: {
    historicImagery: "Historic aerial imagery",
    noImageryInView: "No aerial imagery in this map view",
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
    photo: "Photo",
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
