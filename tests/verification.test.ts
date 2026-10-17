import { it, expect, vi } from "vitest";
import {
  projectVerifiedBaseline,
  VerificationSchema,
} from "../src/lib/verification";
import snapshot from "../src/lib/verified-baseline.json";
import { sample } from "../src/lib/fixtures";
import { POST as start } from "../src/app/api/scan/start/route";
import { POST as status } from "../src/app/api/scan/status/route";
function fixture() {
  return {
    ...sample().scans[0],
    id: "private-provider-id-fixture",
    source: "live",
    imageProvenance: "synthetic_test_image",
    sourceLabel: "Live YouCam API — Synthetic Test Image",
  };
}
it("publishes only the four actual-score fields and safe provenance", () => {
  const projected = projectVerifiedBaseline(fixture());
  expect(projected.metrics).toHaveLength(4);
  expect(JSON.stringify(projected)).not.toMatch(
    /private-provider-id|"capture":|"consent":|mask_urls/,
  );
  expect(Object.keys(projected).sort()).toEqual([
    "capturedDate",
    "metrics",
    "provider",
    "sourceLabel",
  ]);
  expect(
    VerificationSchema.parse(snapshot).metrics.map((m) => m.action),
  ).toEqual(["acne", "pore", "texture", "redness"]);
});
it("rejects fictional samples and real-person records for public verification", () => {
  expect(() => projectVerifiedBaseline(sample().scans[0])).toThrow();
  expect(() =>
    projectVerifiedBaseline({
      ...fixture(),
      imageProvenance: "real_person_image",
    }),
  ).toThrow();
});
it("never fills missing raw/UI measurements", () => {
  const f = fixture();
  f.scores = f.scores.filter((s) => s.providerAction !== "pore");
  expect(() => projectVerifiedBaseline(f)).toThrow();
});
it("rejects arbitrary fields and duplicate action rows in public snapshot", () => {
  expect(() =>
    VerificationSchema.parse({ ...snapshot, task_id: "private-fixture" }),
  ).toThrow();
  expect(() =>
    VerificationSchema.parse({
      ...snapshot,
      metrics: snapshot.metrics.map(() => snapshot.metrics[0]),
    }),
  ).toThrow();
});
it("public routes cannot spend units even if someone sets live=true", async () => {
  vi.stubEnv("YOUCAM_LIVE_ENABLED", "true");
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  try {
    for (const handler of [start, status]) {
      const r = await handler(
        new Request("https://fixture.invalid/api/scan/start", {
          method: "POST",
          body: "fixture",
        }),
      );
      expect(r.status).toBe(403);
      expect(await r.json()).toEqual({ error: "PUBLIC_SCANNING_DISABLED" });
    }
    expect(fetcher).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  }
});
