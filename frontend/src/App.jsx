import React from "react";
import { BrowserRouter } from "react-router-dom";
import CoordinateMap from "./Map";
import { LanguageProvider } from "./LanguageContext";
import "./App.css";

function App() {
  return (
    <div className="App">
      <LanguageProvider>
        <BrowserRouter>
          <CoordinateMap />
        </BrowserRouter>
      </LanguageProvider>
    </div>
  );
}

export default App;
