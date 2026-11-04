import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  unbundle: true,
  dts: true,
  clean: true,
  sourcemap: true,
  platform: "neutral",
  target: "es2022",
});
