import "@densedash/css/tokens.css";
import "@densedash/css/components/kbd.css";
import "@densedash/css/components/keymap-scope.css";
import "@densedash/css/components/tree.css";
import "@densedash/css/components/tabs.css";
import "@densedash/css/components/footer.css";
import "@densedash/css/components/app-shell.css";
import "./app.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createKernel } from "@densedash/core";
import { Densedash } from "@densedash/react";
import { App } from "./app.tsx";
import { reporter } from "./trace.ts";

// The default kernel binds the trading preset; the panes' layers bring their own keys.
const kernel = createKernel({ ports: { reporter } });
const root = document.getElementById("root");
if (root === null) throw new Error("Missing #root.");

createRoot(root).render(
  <StrictMode>
    <Densedash.Provider kernel={kernel}>
      <App />
    </Densedash.Provider>
  </StrictMode>,
);
