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
      "Time Strolls führt durch die Gegend um Deutsch Reichenau an der österreichisch-tschechischen Grenze: Orte auf der Karte mit historischen Bildern, dazu Luftbilder von 1947 bis heute auf der Zeitleiste.",
    imprint: "Impressum",
    back: "Zurück",
    contribute: "Mitmachen",
    openSource: "Time Strolls ist Open Source.",
    codeOnGithub: "Code auf GitHub",
    apiDocs: "API-Dokumentation",
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
    contentSources: "Bilder und Hörstücke",
    withPermission: "Mit freundlicher Genehmigung",
    translations: "Übersetzungen",
    machineTranslation: "maschinell",
    translatedBy: "von",
    machineTranslated: "Maschinell übersetzt",
    aerialImagery: "Luftbild",
    photo: "Foto",
    audio: "Hören",
    photos: "Bilder",
    kinds: {
      village: "Dorf",
      hamlet: "Weiler",
      house: "Haus",
      farm: "Hof",
      chapel: "Kapelle",
      church: "Kirche",
      wayside_shrine: "Bildstock",
      mill: "Mühle",
      ruin: "Ruine",
      landmark: "Ort",
    },
    formerNumber: "frühere Nr.",
    churchesAndChapels: "Kirchen und Kapellen",
    houses: "Häuser",
    placesHere: "Orte",
    backTo: "Zurück zu",
    open: "Öffnen",
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
  cs: {
    areas: "Oblasti",
    here: "Zde",
    onTheMap: "Na mapě",
    places: "Místa",
    about: "O projektu",
    aboutText:
      "Time Strolls provází okolím Rychnůvku (Deutsch Reichenau) na rakousko-české hranici: místa na mapě s historickými snímky a k tomu letecké snímky od roku 1947 až po současnost na časové ose.",
    imprint: "Tiráž",
    back: "Zpět",
    contribute: "Zapojte se",
    openSource: "Time Strolls je open source.",
    codeOnGithub: "Kód na GitHubu",
    apiDocs: "Dokumentace API",
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
    contentSources: "Fotografie a nahrávky",
    withPermission: "S laskavým svolením",
    translations: "Překlady",
    machineTranslation: "strojově",
    translatedBy: "přeložil(a)",
    machineTranslated: "Strojově přeloženo",
    aerialImagery: "Letecký snímek",
    photo: "Foto",
    audio: "Poslech",
    photos: "Snímky",
    kinds: {
      village: "Obec",
      hamlet: "Osada",
      house: "Dům",
      farm: "Statek",
      chapel: "Kaple",
      church: "Kostel",
      wayside_shrine: "Boží muka",
      mill: "Mlýn",
      ruin: "Zřícenina",
      landmark: "Místo",
    },
    formerNumber: "dřívější č.",
    churchesAndChapels: "Kostely a kaple",
    houses: "Domy",
    placesHere: "Místa",
    backTo: "Zpět na",
    open: "Otevřít",
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
      "Time Strolls guides you around Deutsch Reichenau on the Austrian–Czech border: places on the map with historic photos, and aerial imagery from 1947 to today on the time line.",
    imprint: "Imprint",
    back: "Back",
    contribute: "Contribute",
    openSource: "Time Strolls is open source.",
    codeOnGithub: "Code on GitHub",
    apiDocs: "API documentation",
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
    contentSources: "Photos and audio",
    withPermission: "By kind permission",
    translations: "Translations",
    machineTranslation: "machine",
    translatedBy: "by",
    machineTranslated: "Machine translated",
    aerialImagery: "Aerial imagery",
    photo: "Photo",
    audio: "Listen",
    photos: "Photos",
    kinds: {
      village: "Village",
      hamlet: "Hamlet",
      house: "House",
      farm: "Farm",
      chapel: "Chapel",
      church: "Church",
      wayside_shrine: "Wayside shrine",
      mill: "Mill",
      ruin: "Ruin",
      landmark: "Place",
    },
    formerNumber: "former no.",
    churchesAndChapels: "Churches and chapels",
    houses: "Houses",
    placesHere: "Places",
    backTo: "Back to",
    open: "Open",
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
// if we have it, else English. Codes are ISO 639 (Czech is "cs"; until
// 2026-10 it was stored as "cz").
export const initialLanguage = (stored, deviceLanguages = []) => {
  if (stored === "cz") return "cs";
  if (stored in translations) return stored;
  for (const tag of deviceLanguages) {
    const code = tag.toLowerCase().split("-")[0];
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
    document.documentElement.lang = language;
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
