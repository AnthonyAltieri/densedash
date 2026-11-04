import { defineConfig } from "tsdown";
import shared from "../../tooling/tsdown-config/index.ts";

export default defineConfig({
  ...shared,
  entry: ["src/index.ts", "src/bare.ts", "src/conformance/index.ts"],
});
