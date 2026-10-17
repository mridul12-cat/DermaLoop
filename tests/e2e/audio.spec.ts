import { test, expect, chromium, type Page } from "@playwright/test";
async function mock(page: Page, blocked = false) {
  await page.addInitScript(
    ({ blocked }) => {
      const w = window as typeof window & {
        musicCalls: number;
        allowMusic: boolean;
      };
      w.musicCalls = 0;
      w.allowMusic = !blocked;
      const times = new WeakMap<HTMLMediaElement, number>();
      Object.defineProperty(HTMLMediaElement.prototype, "paused", {
        get() {
          return this.dataset.mockPlaying !== "true";
        },
      });
      Object.defineProperty(HTMLMediaElement.prototype, "currentTime", {
        get() {
          return times.get(this) || 0;
        },
        set(value: number) {
          times.set(this, value);
        },
      });
      HTMLMediaElement.prototype.play = function () {
        w.musicCalls++;
        if (!w.allowMusic)
          return Promise.reject(
            new DOMException("Browser policy", "NotAllowedError"),
          );
        this.dataset.mockPlaying = "true";
        this.dispatchEvent(new Event("playing"));
        return Promise.resolve();
      };
      HTMLMediaElement.prototype.pause = function () {
        this.dataset.mockPlaying = "false";
        this.dispatchEvent(new Event("pause"));
      };
    },
    { blocked },
  );
}
const calls = (page: Page) =>
  page.evaluate(
    () => (window as typeof window & { musicCalls: number }).musicCalls,
  );
test("blocked autoplay is attempted once; other gestures, routes and reload never retry", async ({
  page,
}) => {
  await mock(page, true);
  await page.goto("/");
  await expect(
    page.getByText("A little music? Tap to play.", { exact: true }),
  ).toBeVisible();
  expect(await calls(page)).toBe(1);
  await page
    .getByRole("link", { name: "Explore sample journey", exact: true })
    .click();
  await expect(page.getByLabel("Atlas reading")).toBeVisible();
  await page.getByRole("button", { name: /Texture/ }).click();
  await page.mouse.wheel(0, 500);
  expect(await calls(page)).toBe(1);
  await page.reload();
  await expect(page.locator(".cassette-player")).toHaveAttribute(
    "data-playback",
    "paused",
  );
  expect(await calls(page)).toBe(0);
});
test("manual keyboard play, pause, resume and shared audio across navigation", async ({
  page,
}) => {
  await mock(page, true);
  await page.goto("/");
  await expect(page.locator(".cassette-player")).toHaveAttribute(
    "data-playback",
    "blocked",
  );
  await page.evaluate(() => {
    (window as typeof window & { allowMusic: boolean }).allowMusic = true;
  });
  const play = page.getByRole("button", {
    name: "Play Morning Stillness",
    exact: true,
  });
  await play.focus();
  await expect(play).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator(".cassette-player")).toHaveAttribute(
    "data-playback",
    "playing",
  );
  await page.evaluate(() => {
    const audio = document.querySelector("audio")!;
    audio.currentTime = 12;
    (window as typeof window & { savedAudio: HTMLAudioElement }).savedAudio =
      audio;
  });
  await page.getByRole("button", { name: "Pause Morning Stillness" }).click();
  await expect(page.locator(".cassette-player")).toHaveAttribute(
    "data-playback",
    "paused",
  );
  await page
    .getByRole("button", { name: "Play Morning Stillness", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Explore sample journey", exact: true })
    .click();
  await expect(page.getByLabel("Atlas reading")).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.querySelector("audio") ===
        (window as typeof window & { savedAudio: HTMLAudioElement }).savedAudio,
    ),
  ).toBe(true);
  expect(
    await page
      .locator("audio")
      .evaluate((el: HTMLAudioElement) => el.currentTime),
  ).toBe(12);
  await expect(page.locator("audio")).toHaveCount(1);
  expect(await calls(page)).toBe(3);
  await page
    .getByRole("link", { name: "Decision Studio", exact: true })
    .click();
  await page.goBack();
  await expect(page.locator(".cassette-player")).toHaveAttribute(
    "data-playback",
    "playing",
  );
  expect(await calls(page)).toBe(3);
});
test("existing sound-off preference persists across tabs and sessions; opt-in is manual", async ({
  page,
  context,
}) => {
  await mock(page);
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("dermaloop-music-choice", "off"));
  await page.reload();
  await expect(page.locator(".cassette-player")).toHaveAttribute("data-playback", "off");
  await expect(page.locator(".cassette-off")).toHaveCount(0);
  await expect(page.locator(".cassette-note")).toHaveCount(0);
  const other = await context.newPage();
  await mock(other);
  await other.goto("/verification");
  expect(await calls(other)).toBe(0);
  await expect(other.locator(".cassette-player")).toHaveAttribute(
    "data-playback",
    "off",
  );
  await other.evaluate(() => sessionStorage.clear());
  await other.reload();
  await expect(other.locator(".cassette-player")).toHaveAttribute(
    "data-playback",
    "off",
  );
  expect(await calls(other)).toBe(0);
  await other
    .getByRole("button", { name: "Turn music on and play Morning Stillness" })
    .click();
  await expect(other.locator(".cassette-player")).toHaveAttribute(
    "data-playback",
    "playing",
  );
  expect(await calls(other)).toBe(1);
});
test("OS and saved reduction stop reels without stopping chosen audio", async ({
  page,
}) => {
  await mock(page);
  await page.goto("/");
  await expect(page.locator(".cassette-player")).toHaveAttribute(
    "data-playback",
    "playing",
  );
  await expect(page.locator(".cassette-reel").first()).toHaveCSS(
    "animation-name",
    "cassette-turn",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".cassette-reel").first()).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(page.locator(".cassette-player")).toHaveAttribute(
    "data-playback",
    "playing",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/app/privacy");
  await page.getByLabel("Reduce motion", { exact: true }).check();
  await expect(page.locator(".cassette-reel").first()).toHaveCSS(
    "animation-name",
    "none",
  );
  await page
    .getByRole("button", { name: "Play Morning Stillness", exact: true })
    .click();
  await expect(page.locator(".cassette-player")).toHaveAttribute(
    "data-playback",
    "playing",
  );
  await expect(page.locator(".cassette-reel").first()).toHaveCSS(
    "animation-name",
    "none",
  );
});
test("media errors disable playback gracefully with no console errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await mock(page);
  await page.goto("/");
  await expect(page.locator(".cassette-player")).toHaveAttribute(
    "data-playback",
    "playing",
  );
  await page
    .locator("audio")
    .evaluate((el) => el.dispatchEvent(new Event("error")));
  await expect(
    page.getByRole("button", { name: "Morning Stillness unavailable" }),
  ).toBeDisabled();
  await expect(
    page.getByText("Music unavailable.", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("real browser-permitted playback retains full track, ends once and can restart", async () => {
  test.setTimeout(60000);
  const browser = await chromium.launch({
    args: ["--autoplay-policy=no-user-gesture-required"],
  });
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://localhost:3100/");
    await expect(page.locator(".cassette-player")).toHaveAttribute(
      "data-playback",
      "playing",
    );
    const meta = await page
      .locator("audio")
      .evaluate((el: HTMLAudioElement) => ({
        duration: el.duration,
        volume: el.volume,
        loop: el.loop,
      }));
    expect(meta.duration).toBeGreaterThan(33);
    expect(meta.duration).toBeLessThan(34);
    expect(meta.volume).toBe(0.15);
    expect(meta.loop).toBe(false);
    await page.getByRole("button", { name: "Pause Morning Stillness" }).click();
    expect(
      await page.locator("audio").evaluate((el: HTMLAudioElement) => el.paused),
    ).toBe(true);
    const pausedAt = await page
      .locator("audio")
      .evaluate((el: HTMLAudioElement) => el.currentTime);
    await page
      .getByRole("button", { name: "Play Morning Stillness", exact: true })
      .click();
    await page.evaluate(() => {
      (
        window as typeof window & { originalAudio: HTMLAudioElement }
      ).originalAudio = document.querySelector("audio")!;
    });
    await page
      .getByRole("link", { name: "Explore sample journey", exact: true })
      .click();
    await expect(page.getByLabel("Atlas reading")).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.querySelector("audio") ===
          (window as typeof window & { originalAudio: HTMLAudioElement })
            .originalAudio,
      ),
    ).toBe(true);
    expect(
      await page
        .locator("audio")
        .evaluate((el: HTMLAudioElement) => el.currentTime),
    ).toBeGreaterThanOrEqual(pausedAt);
    await expect(page.locator(".cassette-player")).toHaveAttribute(
      "data-playback",
      "ended",
      { timeout: 40000 },
    );
    await page.waitForTimeout(300);
    expect(
      await page.locator("audio").evaluate((el: HTMLAudioElement) => el.paused),
    ).toBe(true);
    await page
      .getByRole("button", { name: "Play Morning Stillness again" })
      .click();
    await expect(page.locator(".cassette-player")).toHaveAttribute(
      "data-playback",
      "playing",
    );
    expect(
      await page
        .locator("audio")
        .evaluate((el: HTMLAudioElement) => el.currentTime),
    ).toBeLessThan(3);
    expect(errors).toEqual([]);
  } finally {
    await browser.close();
  }
});
for (const width of [320, 375, 768, 1440])
  test(`cassette navigation stays in flow ${width}`, async ({ page }) => {
    await mock(page, true);
    await page.setViewportSize({ width, height: 1000 });
    for (const path of [
      "/",
      "/app?sample=1",
      "/app/decision",
      "/verification",
      "/app/privacy",
    ]) {
      await page.goto(path);
      await expect(page.locator(".cassette-player")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const box = await page.locator(".cassette-player").boundingBox();
      expect(box?.width).toBeGreaterThan(0);
      for (const control of await page
        .locator(".cassette-controls button")
        .all()) {
        const target = await control.boundingBox();
        expect(target!.width).toBeGreaterThanOrEqual(44);
        expect(target!.height).toBeGreaterThanOrEqual(44);
      }
      if (width === 320 || width === 1440)
        await page.screenshot({
          path: `docs/screenshots/cassette-${path === "/" ? "landing" : path.split("/").at(-1)?.split("?")[0] || "atlas"}-${width}.png`,
          fullPage: true,
        });
    }
  });

test("real browser autoplay restriction falls back and manual gesture plays", async () => {
  const browser = await chromium.launch({
    args: ["--autoplay-policy=user-gesture-required"],
  });
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://localhost:3100/");
    await expect(
      page.getByText("A little music? Tap to play.", { exact: true }),
    ).toBeVisible();
    expect(
      await page.locator("audio").evaluate((el: HTMLAudioElement) => el.paused),
    ).toBe(true);
    await page
      .getByRole("button", { name: "Play Morning Stillness", exact: true })
      .click();
    await expect(page.locator(".cassette-player")).toHaveAttribute(
      "data-playback",
      "playing",
    );
    expect(errors).toEqual([]);
  } finally {
    await browser.close();
  }
});
