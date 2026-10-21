import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { useLanguage } from "../LanguageContext";

// OpenStreetMap wants its credit on the map itself, so Leaflet's strip stays,
// reduced to that one small line (CSS in index.css). The aerial sources are
// in the menu (Menu.jsx), and the "Leaflet" prefix is dropped.
const CompactAttribution = () => {
  const map = useMap();
  const { t } = useLanguage();

  useEffect(() => {
    const control = map.attributionControl;
    if (!control) return;
    control.setPrefix(false);
    // Bottom left, clear of the dock in the bottom right corner
    control.setPosition("bottomleft");
    const container = control.getContainer();
    container.title = t.sources;
    // Sources and licences are quoted as published, not translated
    container.setAttribute("translate", "no");
    container.classList.add("notranslate");
  }, [map, t]);

  return null;
};

export default CompactAttribution;
