import { createContext, useContext, useState } from "react";

const LanguageContext = createContext();

const translations = {
  de: {
    historicImagery: "Historische Luftbilder",
    noImageryInView: "Keine Luftbilder in diesem Kartenausschnitt",
    enhanced: "Nachbearbeitet",
    aiGenerated: "KI-generiert",
    showLocations: "Orte anzeigen",
    withSupportFrom: "Mit Unterstützung von",
  },
  cz: {
    historicImagery: "Historické letecké snímky",
    noImageryInView: "V tomto výřezu mapy nejsou žádné letecké snímky",
    enhanced: "Upraveno",
    aiGenerated: "Vytvořeno umělou inteligencí",
    showLocations: "Zobrazit místa",
    withSupportFrom: "S podporou",
  },
  en: {
    historicImagery: "Historic aerial imagery",
    noImageryInView: "No aerial imagery in this map view",
    enhanced: "Enhanced",
    aiGenerated: "AI-generated",
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
