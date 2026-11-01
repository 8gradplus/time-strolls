// The visitor's preferences, shared by the map's menu and the admin: the
// language (de, cs, en) and the colour mode. Plain is an unstyled button.
import Box from "@mui/material/Box";
import { useColorScheme } from "@mui/material/styles";
import { ModeGlyph } from "../icons";
import { useLanguage } from "../LanguageContext";

export const Plain = ({ sx, ...props }) => (
  <Box
    component="button"
    type="button"
    sx={{
      font: "inherit",
      color: "inherit",
      border: 0,
      bgcolor: "transparent",
      p: 0,
      textAlign: "left",
      cursor: "pointer",
      ...sx,
    }}
    {...props}
  />
);

// The code is ISO "cs"; the button keeps the familiar "Cz"
const langLabels = { de: "De", cs: "Cz", en: "En" };

export const LanguageSwitch = () => {
  const { language, setLanguage } = useLanguage();

  return (
    // Language names stay as they are, also under a page translator
    <Box
      translate="no"
      className="notranslate"
      sx={{ display: "flex", gap: 1.5 }}
    >
      {Object.entries(langLabels).map(([lang, label]) => (
        <Plain
          key={lang}
          aria-pressed={language === lang}
          onClick={() => setLanguage(lang)}
          sx={{
            minHeight: 28,
            color: language === lang ? "text.primary" : "text.secondary",
            fontWeight: language === lang ? 600 : 400,
            "&:hover": { color: "text.primary" },
          }}
        >
          {label}
        </Plain>
      ))}
    </Box>
  );
};

// Light, dark, or the device setting ("system"); MUI stores the choice. One
// quiet button next to the languages: its icon and name show the current
// mode, a tap steps to the next one.
const modes = [
  ["system", "modeSystem"],
  ["light", "modeLight"],
  ["dark", "modeDark"],
];

export const ModeButton = () => {
  const { mode, setMode } = useColorScheme();
  const { t } = useLanguage();
  if (!mode) return null;

  const index = Math.max(
    0,
    modes.findIndex(([value]) => value === mode),
  );
  const [value, name] = modes[index];
  return (
    <Plain
      onClick={() => setMode(modes[(index + 1) % modes.length][0])}
      aria-label={`${t.appearance}: ${t[name]}`}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        minHeight: 28,
        color: "text.secondary",
        "&:hover": { color: "text.primary" },
      }}
    >
      <ModeGlyph mode={value} />
      {t[name]}
    </Plain>
  );
};
