import { createTheme } from "@mui/material/styles";

// "Wall label" look of a gallery: near-white or near-black surfaces, one red
// accent used only for what is active, 1 px hairlines instead of shadows.
// Cormorant Garamond only for names at display size, Jost for everything else.
// The historic photos are mostly black and white, so the surfaces stay
// neutral. Light or dark follows the device unless the user picks one in the
// menu (useColorScheme, stored by MUI).

// One red in both modes, for the UI and everything on the map: bright enough
// to stand out on the dark aerial images, dark enough for white text on it.
const ACCENT = "#c8372b";

export const tokens = {
  light: {
    accent: ACCENT,
    accentSoft: "#f4e4e2",
    paper: "#fbfbfa",
    surface: "#f3f3f1",
    text: "#171716",
    textMuted: "#6f6e6b",
    hairline: "rgba(23, 23, 22, 0.12)",
  },
  dark: {
    accent: ACCENT,
    accentSoft: "#3a2523",
    paper: "#1d1c1b",
    surface: "#161615",
    text: "#f0efec",
    textMuted: "#a4a29e",
    hairline: "rgba(240, 239, 236, 0.13)",
  },
};

const scheme = (t) => ({
  palette: {
    primary: { main: t.accent },
    background: { default: t.surface, paper: t.paper },
    text: { primary: t.text, secondary: t.textMuted },
    divider: t.hairline,
    accentSoft: t.accentSoft,
  },
});

export const serif = '"Cormorant Garamond", Garamond, Georgia, serif';
const sans = '"Jost Variable", Futura, "Helvetica Neue", Arial, sans-serif';

const theme = createTheme({
  cssVariables: { colorSchemeSelector: "data-mui-color-scheme" },
  colorSchemes: { light: scheme(tokens.light), dark: scheme(tokens.dark) },
  shape: { borderRadius: 4 },
  typography: {
    fontFamily: sans,
    h1: {
      fontFamily: serif,
      fontSize: "2rem",
      fontWeight: 600,
      lineHeight: 1.1,
    },
    h2: { fontFamily: serif, fontSize: "1.5rem", fontWeight: 600 },
    overline: { fontWeight: 500, letterSpacing: "0.09em", lineHeight: 2 },
  },
  components: {
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { backgroundImage: "none" } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { textTransform: "none", borderRadius: 999 } },
    },
    MuiToggleButton: {
      styleOverrides: { root: { textTransform: "none" } },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.shape.borderRadius,
          "&.Mui-selected": { backgroundColor: theme.vars.palette.accentSoft },
          "&.Mui-selected:hover": {
            backgroundColor: theme.vars.palette.accentSoft,
          },
        }),
      },
    },
    MuiLinearProgress: {
      styleOverrides: { root: { height: 2 } },
    },
  },
});

export default theme;
