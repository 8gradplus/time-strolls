import { createTheme } from "@mui/material/styles";

// Outdoor-museum look: warm paper surfaces, one forest-green accent,
// 1 px hairlines instead of shadows, a serif only for place names.
export const tokens = {
  light: {
    accent: "#2f7a60",
    accentSoft: "#dfeae2",
    paper: "#fbf8f1",
    surface: "#f3eee3",
    text: "#2b2a26",
    textMuted: "#6b665c",
    hairline: "rgba(43, 42, 38, 0.14)",
  },
  dark: {
    accent: "#6dbb9a",
    accentSoft: "#26372f",
    paper: "#1f211d",
    surface: "#181a17",
    text: "#ece8de",
    textMuted: "#a8a395",
    hairline: "rgba(236, 232, 222, 0.14)",
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
