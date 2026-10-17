import { test, expect } from "@playwright/test";
import snapshot from "../../src/lib/verified-baseline.json" with { type: "json" };
test("verified baseline is genuine read-only projection, separate from notebook", async ({
  page,
  request,
}) => {
  let providers = 0;
  page.on("request", (r) => {
    if (/makeupar\.com|amazonaws\.com/.test(r.url())) providers++;
  });
  await page.goto("/");
  await page
    .getByRole("link", { name: "Verified integration", exact: true })
    .click();
  await expect(
    page.getByText("Live YouCam API — Synthetic Test Image", { exact: true }),
  ).toBeVisible();
  await page.getByText("View measurement table", { exact: true }).click();
  for (const metric of snapshot.metrics) {
    const row = page.getByRole("row").filter({
      has: page.getByRole("rowheader", { name: metric.action, exact: true }),
    });
    await expect(row).toContainText(String(metric.raw));
    await expect(row).toContainText(String(metric.ui));
  }
  await expect(page.locator("input, textarea, form")).toHaveCount(0);
  await page.goto("/app");
  await expect(
    page.getByRole("heading", { name: "Your story starts here." }),
  ).toBeVisible();
  expect(providers).toBe(0);
  for (const endpoint of ["start", "status"]) {
    const response = await request.post(`/api/scan/${endpoint}`, {
      data: "fixture",
    });
    expect(response.status()).toBe(403);
    expect(await response.json()).toEqual({
      error: "PUBLIC_SCANNING_DISABLED",
    });
  }
});
for (const width of [320, 375, 768, 1440])
  test(`verification responsive ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/verification");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByText("View measurement table", { exact: true }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByText("View measurement table", { exact: true }).click();
    if (width === 375 || width === 1440)
      await page.screenshot({
        path: `docs/screenshots/verification-${width}.png`,
        fullPage: true,
      });
  });
test("unknown notebook sections return an honest 404", async ({ page }) => {
  const r = await page.goto("/app/not-a-page");
  expect(r?.status()).toBe(404);
});
