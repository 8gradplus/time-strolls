import { createContext, useContext, useEffect, useState } from "react";

const LanguageContext = createContext();

const translations = {
  de: {
    areas: "Gebiete",
    here: "Hier",
    onTheMap: "Auf der Karte",
    places: "Orte",
    about: "Über das Projekt",
    aboutText:
      "Time Strolls führt durch die Gegend um Deutsch Reichenau an der österreichisch-tschechischen Grenze: Orte auf der Karte mit historischen Bildern und Hörstücken, dazu Luftbilder von 1947 bis heute auf der Zeitleiste.",
    imprint: "Impressum",
    back: "Zurück",
    withSupportFrom: "Mit Unterstützung von",
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
    menu: "Menü",
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
    play: "Abspielen",
    pause: "Pausieren",
    back15: "15 Sekunden zurück",
    ahead30: "30 Sekunden vor",
    position: "Stelle im Hörstück",
    paused: "Pausiert",
    stopListening: "Hören beenden",
    foldDock: "Leiste einklappen",
    unfoldDock: "Leiste öffnen",
    previous: "Zurück",
    next: "Weiter",
    appearance: "Darstellung",
    modeSystem: "Automatisch",
    modeLight: "Hell",
    modeDark: "Dunkel",
  },
  cz: {
    areas: "Oblasti",
    here: "Zde",
    onTheMap: "Na mapě",
    places: "Místa",
    about: "O projektu",
    aboutText:
      "Time Strolls provází okolím Rychnůvku (Deutsch Reichenau) na rakousko-české hranici: místa na mapě s historickými snímky a audionahrávkami a k tomu letecké snímky od roku 1947 až po současnost na časové ose.",
    imprint: "Tiráž",
    back: "Zpět",
    withSupportFrom: "S podporou",
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
    menu: "Nabídka",
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
    play: "Přehrát",
    pause: "Pozastavit",
    back15: "O 15 sekund zpět",
    ahead30: "O 30 sekund vpřed",
    position: "Místo v nahrávce",
    paused: "Pozastaveno",
    stopListening: "Ukončit poslech",
    foldDock: "Sbalit lištu",
    unfoldDock: "Rozbalit lištu",
    previous: "Předchozí",
    next: "Další",
    appearance: "Vzhled",
    modeSystem: "Automaticky",
    modeLight: "Světlý",
    modeDark: "Tmavý",
  },
  en: {
    areas: "Areas",
    here: "Here",
    onTheMap: "On the map",
    places: "Places",
    about: "About the project",
    aboutText:
      "Time Strolls guides you around Deutsch Reichenau on the Austrian–Czech border: places on the map with historic photos and audio stories, and aerial imagery from 1947 to today on the time line.",
    imprint: "Imprint",
    back: "Back",
    withSupportFrom: "With support from",
    timeTravel: "Time travel through historic aerial imagery",
    off: "Off",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    placesFailed: "The places could not be loaded.",
    placeFailed: "This place could not be loaded. Close it and try again.",
    retry: "Try again",
    enhanced: "Enhanced",
    aiGenerated: "AI-generated",
    menu: "Menu",
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
    play: "Play",
    pause: "Pause",
    back15: "Back 15 seconds",
    ahead30: "Forward 30 seconds",
    position: "Position in the episode",
    paused: "Paused",
    stopListening: "Stop listening",
    foldDock: "Fold the bar",
    unfoldDock: "Unfold the bar",
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
// if we have it (Czech is "cs" there, "cz" here), else English.
export const initialLanguage = (stored, deviceLanguages = []) => {
  if (stored in translations) return stored;
  for (const tag of deviceLanguages) {
    const code = tag.toLowerCase().split("-")[0];
    if (code === "cs") return "cz";
    if (code in translations) return code;
  }
  return "en";
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
