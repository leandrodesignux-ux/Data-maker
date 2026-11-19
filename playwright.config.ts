import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  use: { baseURL: "http://127.0.0.1:3000", ...devices["Desktop Chrome"], viewport: { width: 1920, height: 1050 } },
});
