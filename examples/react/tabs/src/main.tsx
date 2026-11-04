import "@densedash/css/tokens.css";
import "@densedash/css/components/kbd.css";
import "@densedash/css/components/keymap-scope.css";
import "@densedash/css/components/keymap-legend.css";
import "@densedash/css/components/tabs.css";
import "./app.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createKernel } from "@densedash/core";
import { Densedash } from "@densedash/react";
import { App } from "./app.tsx";

// The default kernel uses `tradingPreset`, which binds `tabs.select.1` … `tabs.select.9` to 1–9.
const kernel = createKernel();
const root = document.getElementById("root");
if (root === null) throw new Error("Missing #root.");

createRoot(root).render(
  <StrictMode>
    <Densedash.Provider kernel={kernel}>
      <App />
    </Densedash.Provider>
  </StrictMode>,
);
