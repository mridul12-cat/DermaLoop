import { test, expect } from "@playwright/test";
test("sample journey, metrics, comparison, routine, decision and refresh", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("link", { name: "Explore sample journey", exact: true })
    .click();
  await expect(
    page.getByText("Fictional readings, real product experience.", {
      exact: false,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Texture", exact: false }).click();
  await expect(
    page.getByRole("heading", { name: "Texture, over time" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Signal vs. Noise", exact: true })
    .click();
  await expect(page).toHaveURL(/\/app\/timeline/);
  await expect(page.getByText("points between readings")).toBeVisible();
  await page.getByRole("link", { name: "Routine Lab", exact: true }).click();
  await page.getByRole("button", { name: "Log a routine change" }).click();
  await page.getByLabel("Experiment name").fill("Test simpler routine");
  await page.getByLabel("In-app checkpoint").fill("2026-11-01");
  await page.getByRole("button", { name: "Save experiment" }).click();
  await expect(
    page.getByRole("heading", { name: "Test simpler routine" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Test simpler routine" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Decision Studio", exact: true })
    .click();
  await page
    .getByLabel("Your proposed purchase or plan")
    .fill("Try a new moisturizer?");
  await page.getByRole("button", { name: "Find some perspective" }).click();
  await expect(
    page.getByRole("heading", { name: "Wait for another reading" }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/decision-desktop.png",
    fullPage: true,
  });
});
test("empty notebook, no provider call, consent and webcam denial", async ({
  page,
  context,
}) => {
  await context.grantPermissions([]);
  await page.goto("/app");
  await expect(
    page.getByRole("heading", { name: "Your story starts here." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Start a reading" }).click();
  await expect(page.getByLabel("Choose a photo")).toHaveCount(0);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Use camera" }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Camera permission unavailable" }),
  ).toContainText("Camera permission unavailable");
  await expect(
    page.getByRole("button", { name: "Submit approved live scan" }),
  ).toBeDisabled();
});
test("export, delete and namespace separation", async ({ page }) => {
  await page.goto("/app?sample=1");
  await expect(
    page.getByText("Fictional readings, real product experience.", {
      exact: false,
    }),
  ).toBeVisible();
  await page.goto("/app/privacy");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export current notebook" }).click();
  expect((await download).suggestedFilename()).toContain("demo_fixture");
  await page.getByLabel("Notebook", { exact: true }).selectOption("live");
  await expect(page.getByLabel("Notebook", { exact: true })).toHaveValue(
    "live",
  );
  await page.goto("/app");
  await expect(
    page.getByRole("heading", { name: "Your story starts here." }),
  ).toBeVisible();
  await page.goto("/app/privacy");
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete all local data" }).click();
  await page.reload();
  await expect(page.getByLabel("Notebook", { exact: true })).toHaveValue(
    "live",
  );
});
for (const width of [320, 375, 768, 1440])
  test(`responsive screenshots ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      "/",
      "/app?sample=1",
      "/app/timeline",
      "/app/routine",
      "/app/decision",
      "/app/scan",
      "/app/privacy",
    ]) {
      await page.goto(route);
      await page.waitForTimeout(250);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (width === 375 || width === 1440)
        await page.screenshot({
          path: `docs/screenshots/${route === "/" ? "landing" : route.split("/").at(-1)?.split("?")[0] || "atlas"}-${width}.png`,
          fullPage: true,
        });
    }
  });
test("reduced motion and keyboard focus", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "DermaLoop home" }),
  ).toBeFocused();
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
  ).toBe("auto");
});

test("prepared photo remains local and public submission stays disabled", async ({
  page,
}) => {
  const { default: sharp } = await import("sharp");
  const image = await sharp({
    create: { width: 800, height: 1000, channels: 3, background: "#999999" },
  })
    .jpeg()
    .toBuffer();
  let starts = 0,
    statuses = 0;
  await page.route("**/api/scan/start", async (route) => {
    starts++;
    await new Promise((r) => setTimeout(r, 100));
    await route.fulfill({
      json: { token: "mock-scoped-token", state: "running" },
    });
  });
  await page.route("**/api/scan/status", async (route) => {
    statuses++;
    await route.fulfill({ json: { state: "running" } });
  });
  await page.goto("/app/scan");
  await page.getByRole("checkbox").check();
  await page.locator("input[type=file]").setInputFiles({
    name: "test-neutral.jpg",
    mimeType: "image/jpeg",
    buffer: image,
  });
  await expect(
    page.getByAltText("Your selected image, held in browser memory"),
  ).toBeVisible();
  await page.getByLabel("I’m facing forward, in even light.").check();
  await page
    .getByLabel("Private reviewer access code")
    .fill("test-only-reviewer");
  await expect(
    page.getByRole("button", { name: "Submit approved live scan" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Cancel / retract consent before upload" })
    .click();
  await expect(
    page.getByAltText("Your selected image, held in browser memory"),
  ).toHaveCount(0);
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  expect(starts).toBe(0);
  expect(statuses).toBe(0);
});

test("server routes reject anonymous requests without provider calls", async ({
  request,
}) => {
  const r = await request.post("/api/scan/start", {
    data: "not an image",
    headers: { "Content-Type": "image/jpeg" },
  });
  expect([403, 503]).toContain(r.status());
  expect(JSON.stringify(await r.json())).not.toContain("Bearer");
  const s = await request.post("/api/scan/status", {
    data: { token: "forged" },
  });
  expect([403, 503]).toContain(s.status());
});
