import { test, expect } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";

test("full fictional journey with evidence, observations, export content and actual deletion", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  let providerRequests = 0;
  page.on("request", (req) => {
    if (/makeupar\.com|perfectcorp\.com|amazonaws\.com/.test(req.url()))
      providerRequests++;
  });
  await page.goto("/");
  await page
    .getByRole("link", { name: "Explore sample journey", exact: true })
    .click();
  await page.getByLabel("Atlas reading").selectOption("sample-1");
  await expect(page.getByRole("button", { name: /Moisture/ })).toContainText(
    "62",
  );
  await page.getByLabel("Atlas reading").selectOption("sample-4");
  await expect(page.getByRole("button", { name: /Moisture/ })).toContainText(
    "66",
  );
  await page.getByText("View accessible data table").click();
  await expect(page.locator("tbody tr")).toHaveCount(4);
  await page
    .getByRole("link", { name: "Signal vs. Noise", exact: true })
    .click();
  await expect(page).toHaveURL(/\/app\/timeline/);
  await expect(page.locator(".delta")).toContainText("+4");
  await page.getByLabel("Later reading").selectOption("sample-3");
  await expect(page.locator(".delta")).toContainText("-1");
  await expect(page.locator(".comparison-head")).toContainText(
    "Different light",
  );
  await expect(page.locator(".capture-grid")).toContainText("183");
  await page.screenshot({
    path: "docs/screenshots/phase2-comparison.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Routine Lab", exact: true }).click();
  await page.getByRole("button", { name: "Log a routine change" }).click();
  await page
    .getByLabel("Experiment name")
    .fill("Fictional demo: maintain a simple routine");
  await page.getByLabel("Product names").fill("Illustrative moisturizer");
  await page.getByLabel("Start date", { exact: true }).fill("2026-10-16");
  await page.getByLabel("In-app checkpoint").fill("2026-10-30");
  await page
    .getByLabel("Notes", { exact: true })
    .fill("Fictional journal for demonstration only.");
  await page.getByRole("button", { name: "Save experiment" }).click();
  const experiment = page.locator("article").filter({
    has: page.getByRole("heading", {
      name: "Fictional demo: maintain a simple routine",
    }),
  });
  await experiment
    .getByLabel("Add a dated observation")
    .fill("Fictional observation: photographed in the same room.");
  await experiment.getByRole("button", { name: "Save observation" }).click();
  await expect(experiment).toContainText(
    "Fictional observation: photographed in the same room.",
  );
  await page.reload();
  await expect(experiment).toContainText(
    "Fictional observation: photographed in the same room.",
  );
  await page
    .getByRole("link", { name: "Decision Studio", exact: true })
    .click();
  await page
    .getByLabel("Your proposed purchase or plan")
    .fill("Fictional plan: buy another moisturizer?");
  await page.getByRole("button", { name: "Find some perspective" }).click();
  await expect(page.locator(".decision-card")).toContainText("RULE D03");
  await expect(page.locator(".decision-card")).toContainText("9 Oct");
  await expect(page.locator(".decision-card")).toContainText("15 Oct");
  await page.screenshot({
    path: "docs/screenshots/phase2-decision-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 375, height: 900 });
  await page.screenshot({
    path: "docs/screenshots/phase2-decision-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator(".decision-card").getByRole("link").first().click();
  await expect(page.getByLabel("Earlier reading")).toHaveValue("sample-3");
  await expect(page.getByLabel("Later reading")).toHaveValue("sample-4");
  await page.goto("/app/privacy");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export current notebook" }).click();
  const download = await pending;
  const dest = testInfo.outputPath("sample-export.json");
  await download.saveAs(dest);
  const data = JSON.parse(await readFile(dest, "utf8"));
  await mkdir("docs/evidence", { recursive: true });
  await writeFile(
    "docs/evidence/phase2-sample-export.json",
    JSON.stringify(data, null, 2),
  );
  expect(data.decisions[0].goal).toBe("moisture");
  expect(data.namespace).toBe("demo_fixture");
  expect(data.scans).toHaveLength(4);
  expect(
    data.scans.every((s: { source: string }) => s.source === "demo_fixture"),
  ).toBe(true);
  expect(data.routines).toHaveLength(2);
  expect(data.decisions[0].rules).toEqual(["D03"]);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete all local data" }).click();
  await expect(page.getByLabel("Notebook", { exact: true })).toHaveValue(
    "live",
  );
  await page.reload();
  await page
    .getByLabel("Notebook", { exact: true })
    .selectOption("demo_fixture");
  await expect(page.getByLabel("Notebook", { exact: true })).toHaveValue(
    "demo_fixture",
  );
  await page.getByRole("link", { name: "Skin Atlas", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your story starts here." }),
  ).toBeVisible();
  const records = await page.evaluate(async () => {
    return new Promise<unknown[]>((resolve, reject) => {
      const r = indexedDB.open("dermaloop");
      r.onsuccess = () => {
        const db = r.result;
        const q = db
          .transaction("workspaces")
          .objectStore("workspaces")
          .getAll();
        q.onsuccess = () => {
          db.close();
          resolve(q.result);
        };
        q.onerror = () => reject(q.error);
      };
    });
  });
  expect(
    records.every((v: unknown) => {
      const r = v as {
        scans: unknown[];
        routines: unknown[];
        decisions: unknown[];
      };
      return !r.scans.length && !r.routines.length && !r.decisions.length;
    }),
  ).toBe(true);
  await page.goto("/app/privacy");
  await page.getByLabel("Import sample JSON").setInputFiles({
    name: "sample.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(data)),
  });
  await page.getByRole("link", { name: "Skin Atlas", exact: true }).click();
  await expect(page.getByLabel("Atlas reading").locator("option")).toHaveCount(
    4,
  );
  expect(providerRequests).toBe(0);
});

test("scan-to-sample client transition and independent observation drafts", async ({
  page,
}) => {
  await page.goto("/app/scan");
  await page.getByRole("link", { name: "Explore the sample instead" }).click();
  await expect(page.getByLabel("Atlas reading")).toBeVisible();
  await page.getByRole("link", { name: "Routine Lab", exact: true }).click();
  await page.getByRole("button", { name: "Log a routine change" }).click();
  await page.getByLabel("Experiment name").fill("Second fictional experiment");
  await page.getByLabel("In-app checkpoint").fill("2026-11-01");
  await page.getByRole("button", { name: "Save experiment" }).click();
  const notes = page.getByLabel("Add a dated observation");
  await notes.first().fill("Draft belongs only to this experiment");
  await expect(notes.nth(1)).toHaveValue("");
});

test("single sample reading shows baseline and no invented trend or personalized purchase claim", async ({
  page,
}) => {
  const { sample } = await import("../../src/lib/fixtures");
  const w = sample();
  w.scans = w.scans.slice(0, 1);
  w.routines = [];
  await page.goto("/app/privacy");
  await page.getByLabel("Import sample JSON").setInputFiles({
    name: "baseline.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(w)),
  });
  await expect(page.getByLabel("Notebook", { exact: true })).toHaveValue(
    "demo_fixture",
  );
  await page.getByRole("link", { name: "Skin Atlas", exact: true }).click();
  await expect(
    page
      .locator(".lower-grid > .panel")
      .getByText("Your baseline is ready. Return later to see a trend.", {
        exact: true,
      }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Signal vs. Noise", exact: true })
    .click();
  await expect(page.locator(".delta")).toContainText("No comparable delta");
  await page
    .getByRole("link", { name: "Decision Studio", exact: true })
    .click();
  await page
    .getByLabel("Your proposed purchase or plan")
    .fill("Fictional purchase");
  await page.getByRole("button", { name: "Find some perspective" }).click();
  await expect(page.locator(".decision-card")).toContainText(
    "Not enough evidence",
  );
  await expect(page.locator(".decision-card")).toContainText("RULE D01");
});

test("failed browser save keeps experiment form and observation drafts recoverable", async ({
  page,
}) => {
  await page.goto("/app/routine?sample=1");
  await expect(
    page.getByRole("heading", { name: "A simpler evening routine" }),
  ).toBeVisible();
  await page.evaluate(() => {
    const original = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (
      ...args: Parameters<typeof original>
    ) {
      if (args[1] === "readwrite")
        throw new DOMException("Test storage quota", "QuotaExceededError");
      return original.apply(this, args);
    };
  });
  await page
    .getByLabel("Add a dated observation")
    .fill("Keep this unsaved draft");
  await page.getByRole("button", { name: "Save observation" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Could not save" }),
  ).toBeVisible();
  await expect(page.getByLabel("Add a dated observation")).toHaveValue(
    "Keep this unsaved draft",
  );
  await page.getByRole("button", { name: "Log a routine change" }).click();
  await page.getByLabel("Experiment name").fill("Recoverable fictional form");
  await page.getByLabel("In-app checkpoint").fill("2026-11-01");
  await page.getByRole("button", { name: "Save experiment" }).click();
  await expect(page.getByLabel("Experiment name")).toHaveValue(
    "Recoverable fictional form",
  );
});
