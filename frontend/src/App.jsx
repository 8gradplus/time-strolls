import React from "react";
import { BrowserRouter } from "react-router-dom";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import CoordinateMap from "./Map";
import { LanguageProvider } from "./LanguageContext";
import { PlayerProvider } from "./podcast/PlayerContext";
import theme from "./theme";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LanguageProvider>
        <PlayerProvider>
          <BrowserRouter>
            <CoordinateMap />
          </BrowserRouter>
        </PlayerProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
