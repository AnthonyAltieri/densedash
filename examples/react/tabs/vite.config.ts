import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The React Compiler runs through Babel on every component, including the linked adapter.
export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
});
