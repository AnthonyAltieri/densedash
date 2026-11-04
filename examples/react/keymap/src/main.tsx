import "@densedash/css/tokens.css";
import "@densedash/css/components/kbd.css";
import "@densedash/css/components/keymap-scope.css";
import "@densedash/css/components/keymap-legend.css";
import "@densedash/css/components/keymap-chord-hint.css";
import "@densedash/css/components/keymap-confirm-prompt.css";
import "./app.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createKernel } from "@densedash/core";
import { Densedash } from "@densedash/react";
import { App } from "./app.tsx";
import { preset } from "./preset.ts";

const kernel = createKernel({ keys: { preset } });
const root = document.getElementById("root");
if (root === null) throw new Error("Missing #root.");

createRoot(root).render(
  <StrictMode>
    <Densedash.Provider kernel={kernel}>
      <App />
    </Densedash.Provider>
  </StrictMode>,
);
