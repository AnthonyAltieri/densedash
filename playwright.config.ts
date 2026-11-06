import { defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:4170";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.results",
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: 4,
  reporter: "list",
  use: { baseURL, trace: "retain-on-failure" },
  webServer: {
    command:
      "pnpm --filter @densedash/docs exec vite preview --host 127.0.0.1 --port 4170 --strictPort",
    url: baseURL,
    reuseExistingServer: false,
  },
  projects: [
    { name: "chromium", testIgnore: "registry.spec.ts", use: { browserName: "chromium" } },
    { name: "webkit", testIgnore: "registry.spec.ts", use: { browserName: "webkit" } },
    { name: "registry", testMatch: "registry.spec.ts", workers: 1, timeout: 120_000 },
  ],
});
