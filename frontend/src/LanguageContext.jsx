import { createContext, useContext, useState } from "react";

const LanguageContext = createContext();

const translations = {
  de: {
    showMap1945: "Karte 1945 anzeigen",
    showLocations: "Orte anzeigen",
    withSupportFrom: "Mit Unterstützung von",
  },
  cz: {
    showMap1945: "Zobrazit mapu 1945",
    showLocations: "Zobrazit místa",
    withSupportFrom: "S podporou",
  },
  en: {
    showMap1945: "Show Map 1945",
    showLocations: "Show locations",
    withSupportFrom: "With support from",
  },
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState("de");
  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
