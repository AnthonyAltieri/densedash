import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { previewPlugin } from "./scripts/preview-plugin.ts";

export default defineConfig({
  plugins: [
    previewPlugin(),
    tanstackStart({
      router: { addExtensions: true, quoteStyle: "double", semicolons: true },
    }),
    react(),
  ],
});
