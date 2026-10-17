import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: "http://localhost:3100", headless: true },
  webServer: {
    command:
      process.env.PLAYWRIGHT_PRODUCTION === "1"
        ? "npm run start -- --port 3100"
        : "npm run dev -- --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 120000,
  },
  reporter: "list",
});
