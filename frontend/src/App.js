import React from "react";
import { BrowserRouter } from "react-router-dom";
import CoordinateMap from "./Map";
import "./App.css";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <CoordinateMap />
      </BrowserRouter>
    </div>
  );
}

export default App;
