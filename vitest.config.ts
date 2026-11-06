import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    passWithNoTests: true,
    include: [
      "packages/**/*.test.{ts,tsx}",
      "apps/**/*.test.{ts,tsx}",
      "examples/**/*.test.{ts,tsx}",
    ],
    typecheck: {
      include: ["packages/**/*.test-d.ts", "apps/**/*.test-d.ts", "examples/**/*.test-d.ts"],
      // App-specific Register augmentation must not constrain the unit tests or docs app.
      tsconfig: "./tsconfig.test-d.json",
    },
  },
});
