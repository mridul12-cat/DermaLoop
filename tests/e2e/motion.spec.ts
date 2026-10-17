import { test, expect, type Page } from "@playwright/test";
import baseline from "../../src/lib/verified-baseline.json" with { type: "json" };

async function noMotion(page: Page) {
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
  expect(
    await page.evaluate(() =>
      [...document.querySelectorAll("*")].every((el) => {
        const s = getComputedStyle(el);
        return (
          s.animationName === "none" &&
          s.transitionDuration.split(",").every((t) => parseFloat(t) === 0)
        );
      }),
    ),
  ).toBe(true);
}

test("system reduction removes motion globally and reacts to OS changes", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const path of ["/", "/verification", "/app?sample=1", "/app/timeline"]) {
    await page.goto(path);
    await noMotion(page);
  }
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
});

test("saved reduction and contrast apply on public pages and survive reload", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/app/privacy");
  await page.getByLabel("Reduce motion", { exact: true }).check();
  await page.getByLabel("Higher contrast", { exact: true }).check();
  await noMotion(page);
  await page.goto("/");
  await noMotion(page);
  await expect(page.locator("html")).toHaveAttribute("data-contrast", "high");
  await page.reload();
  await noMotion(page);
  await page.goto("/verification");
  await noMotion(page);
  await page.goto("/app/privacy");
  await page.getByLabel("Reduce motion", { exact: true }).uncheck();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
});

test("ambient motion is isolated to decorative orbits and pauses off screen", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.locator(".hero-art")).toHaveAttribute(
    "data-ambient-active",
    "true",
  );
  await expect(page.locator(".hero-orbits")).toHaveCSS(
    "animation-play-state",
    "running",
  );
  expect(
    await page.evaluate(
      () =>
        document
          .querySelector(".hero-art")!
          .getAnimations({ subtree: true })
          .filter((a) => a.effect?.getTiming().iterations === Infinity).length,
    ),
  ).toBe(1);
  await page.locator("footer").scrollIntoViewIfNeeded();
  await expect(page.locator(".hero-art")).toHaveAttribute(
    "data-ambient-active",
    "false",
  );
  await expect(page.locator(".hero-orbits")).toHaveCSS(
    "animation-play-state",
    "paused",
  );
});

test("animated chart preserves exact values, table and selected observation", async ({
  page,
}) => {
  await page.goto("/app?sample=1");
  const chart = page.getByRole("img", {
    name: "Moisture raw scores over time; 0 to 100 scale",
  });
  await chart.scrollIntoViewIfNeeded();
  await expect(chart).toHaveAttribute("data-entered", "true");
  await expect(chart.locator("circle.chart-point")).toHaveCount(4);
  await expect(chart.locator("desc")).toContainText("Only recorded values");
  await page.getByText("View accessible data table", { exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(4);
  for (const [index, raw] of [62, 65, 61, 66].entries()) {
    await expect(
      page.locator("tbody tr").nth(index).locator("td").nth(1),
    ).toHaveText(String(raw));
  }
  await page.getByLabel("Atlas reading").selectOption("sample-1");
  await expect(page.locator("tbody .selected-reading")).toContainText("1 Oct");
  await expect(page.locator(".chart-point.selected-point")).toHaveCount(1);
  await page.getByRole("button", { name: /Texture/ }).click();
  await expect(
    page.getByRole("img", {
      name: "Texture raw scores over time; 0 to 100 scale",
    }),
  ).toBeVisible();
  await expect(
    page.locator("tbody tr").first().locator("td").nth(1),
  ).toHaveText("68");
});

test("navigation, browser history and keyboard activation keep the correct section", async ({
  page,
}) => {
  await page.goto("/app?sample=1");
  const routine = page.getByRole("link", { name: "Routine Lab", exact: true });
  await routine.focus();
  await page.keyboard.press("Enter");
  await expect(routine).toHaveAttribute("aria-current", "page");
  await page
    .getByRole("link", { name: "Decision Studio", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "What are you considering?" }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("button", { name: "Log a routine change" }),
  ).toBeVisible();
  await page.goForward();
  await expect(
    page.getByRole("link", { name: "Decision Studio", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.goto("/app/timeline");
  await expect(page.locator(".reading-bridge > span").first()).toHaveText(
    "1 Oct · 62",
  );
  await expect(page.locator(".reading-bridge > span").last()).toHaveText(
    "15 Oct · 66",
  );
  await expect(page.locator(".delta .score-value")).toHaveText("+4");
});

test("journal folding preserves drafts and save/delete persist", async ({
  page,
}) => {
  await page.goto("/app/routine?sample=1");
  await page.getByRole("button", { name: "Log a routine change" }).click();
  await page.getByLabel("Experiment name").fill("Fictional motion review");
  await page.getByLabel("In-app checkpoint").fill("2026-11-01");
  await page.getByRole("button", { name: "Save experiment" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Experiment saved" }),
  ).toBeVisible();
  const entry = page.locator("article").filter({
    has: page.getByRole("heading", { name: "Fictional motion review" }),
  });
  await entry
    .getByLabel("Add a dated observation")
    .fill("Fictional draft retained through folding");
  await entry.locator("summary").click();
  await expect(entry.locator("details")).not.toHaveAttribute("open", "");
  await entry.locator("summary").click();
  await expect(entry.getByLabel("Add a dated observation")).toHaveValue(
    "Fictional draft retained through folding",
  );
  await entry.getByRole("button", { name: "Save observation" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Observation saved" }),
  ).toBeVisible();
  await page.reload();
  await expect(entry).toContainText("Fictional draft retained through folding");
  await entry.getByRole("button", { name: "Remove experiment" }).click();
  await expect(entry).toHaveCount(0);
  await page.reload();
  await expect(entry).toHaveCount(0);
});

test("decision validation focuses input and reveals traceable deterministic reasoning", async ({
  page,
}) => {
  await page.goto("/app/decision?sample=1");
  const input = page.getByLabel("Your proposed purchase or plan");
  await input.fill("   ");
  await page.getByRole("button", { name: "Find some perspective" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Write a question" }),
  ).toBeVisible();
  await expect(input).toBeFocused();
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await input.fill("Fictional question: add another moisturizer?");
  await page.getByRole("button", { name: "Find some perspective" }).click();
  await expect(page.locator(".decision-card")).toContainText("RULE D03");
  await expect(page.locator(".decision-card .closing-loop")).toBeVisible();
  await page.locator(".decision-card").getByRole("link").first().click();
  await expect(page.getByLabel("Earlier reading")).toHaveValue("sample-3");
  await expect(page.getByLabel("Later reading")).toHaveValue("sample-4");
});

test("public scan clarity links to genuine immutable measurements and fictional journey", async ({
  page,
  request,
}) => {
  await page.goto("/app/scan");
  await expect(page.locator(".demo-banner")).toContainText(
    "Live AI integration verified. Public scans are currently disabled. Explore the genuine test results or try the complete fictional sample journey.",
  );
  await page.getByRole("checkbox").check();
  await expect(
    page.getByRole("button", { name: "Submit approved live scan" }),
  ).toBeDisabled();
  await page
    .getByRole("link", { name: "View the verified synthetic test" })
    .click();
  await expect(
    page.getByText("Live YouCam API — Synthetic Test Image", { exact: true }),
  ).toBeVisible();
  await page.getByText("View measurement table", { exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(4);
  for (const metric of baseline.metrics) {
    const row = page.getByRole("row").filter({
      has: page.getByRole("rowheader", { name: metric.action, exact: true }),
    });
    await expect(row.locator("td").nth(0)).toHaveText(String(metric.raw));
    await expect(row.locator("td").nth(1)).toHaveText(String(metric.ui));
  }
  await expect(page.locator("form,input,textarea")).toHaveCount(0);
  for (const endpoint of ["start", "status"])
    expect(
      (
        await request.post(`/api/scan/${endpoint}`, { data: "fixture" })
      ).status(),
    ).toBe(403);
  await page.goto("/app/scan");
  await page
    .getByRole("link", { name: "Try the fictional sample journey" })
    .click();
  await expect(page.getByLabel("Atlas reading")).toBeVisible();
});

test("entrances and metric changes remain stable under mobile CPU throttling", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 375, height: 900 });
  const session = await context.newCDPSession(page);
  await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const target = window as typeof window & { editorialShift: number };
    target.editorialShift = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {
          hadRecentInput: boolean;
          value: number;
        };
        if (!shift.hadRecentInput) target.editorialShift += shift.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.waitForTimeout(1000);
  const landing = await page.evaluate(
    () => (window as typeof window & { editorialShift: number }).editorialShift,
  );
  expect(landing).toBeLessThan(0.01);
  await page.goto("/app?sample=1");
  await page.getByLabel("Atlas reading").waitFor();
  await page.waitForTimeout(750);
  await page.evaluate(() => {
    (window as typeof window & { editorialShift: number }).editorialShift = 0;
  });
  await page.getByRole("button", { name: /Texture/ }).click();
  await page.waitForTimeout(750);
  const metricChange = await page.evaluate(
    () => (window as typeof window & { editorialShift: number }).editorialShift,
  );
  expect(metricChange).toBeLessThan(0.01);
  expect(errors).toEqual([]);
  await test.info().attach("local-layout-stability", {
    body: JSON.stringify({
      cpuThrottle: 4,
      width: 375,
      landing,
      metricChange,
    }),
    contentType: "application/json",
  });
});

test("public editorial content and genuine table stay visible without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://localhost:3100/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Explore sample journey", exact: true }),
  ).toBeVisible();
  await page.goto("http://localhost:3100/verification");
  await page.getByText("View measurement table", { exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(4);
  await expect(page.locator("tbody tr").first()).toContainText(
    String(baseline.metrics[0].raw),
  );
  await context.close();
});
