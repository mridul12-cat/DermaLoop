import { test, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import sharp from "sharp";
test("offline local companion: session, consent, exact results, durable quota and mobile view", async ({
  page,
  request,
}) => {
  const child = spawn(
    process.execPath,
    [
      "--conditions=react-server",
      "--import",
      "tsx",
      "tests/helpers/local-live-fixture.ts",
    ],
    { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] },
  );
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Offline local fixture startup timeout")),
        15000,
      );
      child.once("exit", () => {
        clearTimeout(timeout);
        reject(new Error("Offline fixture exited"));
      });
      child.stdout.on("data", (d) => {
        if (d.toString().includes("fixture-ready")) {
          clearTimeout(timeout);
          resolve();
        }
      });
    });
    const base = "http://127.0.0.1:3210";
    expect((await request.get(base + "/result")).status()).toBe(403);
    expect(
      (
        await request.get(base + "/session", {
          headers: { "Sec-Fetch-Site": "cross-site" },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await request.get(base + "/", {
          headers: { Host: "attacker.test:3210" },
        })
      ).status(),
    ).toBe(403);
    await page.route("**/*", (route) =>
      new URL(route.request().url()).origin === base
        ? route.continue()
        : route.abort(),
    );
    await page.goto(base);
    await expect(
      page.getByRole("status").filter({ hasText: "Ready locally" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Authorize this one analysis" }),
    ).toBeDisabled();
    const sessionBefore = await request.get(base + "/session", {
      headers: { "Sec-Fetch-Site": "same-origin" },
    });
    const localSession = (await sessionBefore.json()).session;
    const headers = {
      Origin: base,
      "x-local-session": localSession,
      "x-local-consent": "confirmed",
      "x-local-free-credit-confirmation": "confirmed",
      "x-local-budget-confirmation": "confirmed",
      "x-local-provenance": "synthetic_test_image",
      "Content-Type": "image/jpeg",
    };
    expect(
      (
        await request.post(base + "/analyze", {
          headers: { ...headers, Origin: "https://attacker.test" },
          data: "invalid",
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await request.post(base + "/analyze", {
          headers: { ...headers, "x-local-budget-confirmation": "missing" },
          data: "invalid",
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await request.post(base + "/analyze", {
          headers,
          data: Buffer.alloc(100),
        })
      ).status(),
    ).toBe(415);
    expect(
      (
        await (
          await request.get(base + "/result", {
            headers: { "x-local-session": localSession },
          })
        ).json()
      ).quotaUsed,
    ).toBe(false);
    await page
      .getByLabel("Image provenance")
      .selectOption("synthetic_test_image");
    await expect(page.locator("#consent-copy")).toContainText(
      "fictional, not a photograph",
    );
    const image = await sharp({
      create: { width: 680, height: 850, channels: 3, background: "#aaaaaa" },
    })
      .jpeg()
      .toBuffer();
    await page.getByLabel("Choose one suitable image").setInputFiles({
      name: "offline-fixture.jpg",
      mimeType: "image/jpeg",
      buffer: image,
    });
    await page.locator("#consent").check();
    await page.locator("#credits").check();
    await page.locator("#budget").check();
    await expect(
      page.getByRole("button", { name: "Authorize this one analysis" }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "Authorize this one analysis" })
      .click();
    await expect(page.locator("#results")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("#provenance-note")).toContainText(
      "Synthetic Test Image",
    );
    for (const [i, metric] of [
      "acne",
      "pore",
      "texture",
      "redness",
    ].entries()) {
      const row = page.getByRole("row").filter({
        has: page.getByRole("rowheader", { name: metric, exact: true }),
      });
      await expect(row.locator("td").first()).toHaveText(String(60 + i + 0.25));
      await expect(row.locator("td").last()).toHaveText(String(70 + i));
    }
    await expect(page.locator("#submit")).toBeDisabled();
    await page.reload();
    await expect(page.locator("#results")).toBeVisible();
    await expect(page.locator("#submit")).toBeDisabled();
    for (const width of [320, 375]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `docs/screenshots/local-live-offline-${width}.png`,
        fullPage: true,
      });
    }
    const session = await request.get(base + "/session", {
      headers: { "Sec-Fetch-Site": "same-origin" },
    });
    const token = (await session.json()).session;
    const rejected = await request.post(base + "/analyze", {
      headers: {
        Origin: base,
        "x-local-session": token,
        "x-local-consent": "confirmed",
        "x-local-free-credit-confirmation": "confirmed",
        "x-local-budget-confirmation": "confirmed",
        "x-local-provenance": "synthetic_test_image",
        "Content-Type": "image/jpeg",
      },
      data: image,
    });
    expect(rejected.status()).toBe(409);
  } finally {
    child.kill("SIGTERM");
  }
});
