import { defineConfig } from "@playwright/test";
export default defineConfig({ testDir: "./tests/widget", outputDir: ".playwright/widget", workers: 1, retries: 0, timeout: 45000, reporter: "list", use: { baseURL: process.env.HIVE_E2E_FRONTEND_URL || "http://127.0.0.1:3001", headless: true, screenshot: "only-on-failure" } });
