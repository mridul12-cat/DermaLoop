import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
const stage = process.argv.includes("--before") ? "before" : "after";
const base = "http://127.0.0.1:3102";
const browser = await chromium.launch({ headless: true });
const widths = stage === "before" ? [1440, 375] : [1440, 768, 375, 320];
const paths = [
  ["landing", "/"],
  ["atlas", "/app?sample=1"],
  ["comparison", "/app/timeline"],
  ["routine", "/app/routine"],
  ["decision", "/app/decision"],
  ["verification", "/verification"],
  ["privacy", "/app/privacy"],
  ["scan", "/app/scan"],
];
const results = [];
for (const width of widths) {
  const page = await browser.newPage({ viewport: { width, height: 1000 } });
  await page.route("**/*", (route) =>
    new URL(route.request().url()).origin === base
      ? route.continue()
      : route.abort(),
  );
  for (const [name, path] of paths) {
    await page.goto(base + path);
    await page.getByRole("main").first().waitFor();
    if (name === "atlas") await page.getByLabel("Atlas reading").waitFor();
    if (name === "decision") {
      await page
        .getByLabel("Your proposed purchase or plan")
        .fill("Fictional journal: should I add another moisturizer?");
      await page.getByRole("button", { name: "Find some perspective" }).click();
      await page.locator(".decision-card").first().waitFor();
    }
    await page.waitForTimeout(650);
    await page.screenshot({
      path: `docs/screenshots/phase6-${stage}/${name}-${width}.png`,
      fullPage: true,
    });
    results.push({
      name,
      width,
      overflow: await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    });
  }
  await page.close();
}
await browser.close();
await fs.mkdir(".private", { recursive: true });
await fs.writeFile(
  `.private/phase6-${stage}-capture.json`,
  JSON.stringify(results, null, 2),
);
console.log(
  JSON.stringify({
    stage,
    captures: results.length,
    overflowFailures: results.filter((r) => r.overflow).length,
  }),
);
