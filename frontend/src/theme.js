import { createTheme } from "@mui/material/styles";

// Outdoor-museum look, taken from the logo (public/logo.svg): warm paper and
// grey surfaces, one red accent, 1 px hairlines instead of shadows, a serif
// only for place names. Dark mode uses warm browns (the logo's clay tile is
// #6b5a4e), never black.
export const tokens = {
  light: {
    accent: "#b8412f",
    accentSoft: "#f3ddd6",
    paper: "#faf7f3",
    surface: "#efe9e3",
    text: "#2b2724",
    textMuted: "#7a716a",
    hairline: "rgba(43, 39, 36, 0.13)",
  },
  dark: {
    accent: "#e2705b",
    accentSoft: "#4a302a",
    paper: "#2e2723",
    surface: "#25201d",
    text: "#efe8e1",
    textMuted: "#a99f97",
    hairline: "rgba(239, 232, 225, 0.13)",
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

export const serif = '"Merriweather", Georgia, "Times New Roman", serif';

const theme = createTheme({
  cssVariables: { colorSchemeSelector: "media" },
  colorSchemes: { light: scheme(tokens.light), dark: scheme(tokens.dark) },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: { fontFamily: serif, fontSize: "1.6rem", fontWeight: 700 },
    h2: { fontFamily: serif, fontSize: "1.25rem", fontWeight: 700 },
    overline: { fontWeight: 600, letterSpacing: "0.08em", lineHeight: 2 },
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
