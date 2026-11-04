import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { referencePlugin } from "./scripts/reference-plugin.ts";
import { previewPlugin } from "./scripts/preview-plugin.ts";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "./styles/tokens.css",
        replacement: fileURLToPath(
          new URL("../../packages/css/src/generated/tokens.css", import.meta.url),
        ),
      },
      {
        find: /^\.\/styles\/(.+)\.css$/,
        replacement: fileURLToPath(
          new URL("../../packages/css/src/components/$1.css", import.meta.url),
        ),
      },
    ],
  },
  plugins: [
    previewPlugin(),
    referencePlugin(),
    tanstackStart({
      router: { addExtensions: true, quoteStyle: "double", semicolons: true },
    }),
    nitro({ preset: "vercel" }),
    react(),
  ],
});
