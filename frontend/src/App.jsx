import React, { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import CoordinateMap from "./Map";
import { LanguageProvider } from "./LanguageContext";
import { PlayerProvider } from "./podcast/PlayerContext";
import theme from "./theme";

// The admin is its own chunk: the map never loads it (ROADMAP.md, step 5)
const Admin = lazy(() => import("./admin/Admin"));

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LanguageProvider>
        <PlayerProvider>
          <BrowserRouter>
            <Routes>
              <Route
                path="/admin/*"
                element={
                  <Suspense fallback={null}>
                    <Admin />
                  </Suspense>
                }
              />
              <Route path="*" element={<CoordinateMap />} />
            </Routes>
          </BrowserRouter>
        </PlayerProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
