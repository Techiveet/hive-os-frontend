import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e/landing",
  outputDir: ".playwright/landing-results",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.HIVE_LANDING_TEST_URL || "http://localhost:3195",
    browserName: "chromium",
    launchOptions: { channel: "chromium" },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
});
