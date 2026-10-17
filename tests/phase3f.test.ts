import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  PHASE3F_IMAGE_SHA256,
  PHASE3C_MARKER_SHA256,
  sha256,
  prepareReviewedJpeg,
  validatePhase3FAuthorization,
  verifyPriorAttempt,
  validatePhase3FConfig,
} from "../src/lib/youcam/phase3f";
const now = Date.parse("2026-10-17T12:00:00Z");
const imagePath = "/fixture/reviewed-portrait.jpg";
function authorization() {
  return {
    phase: "3F",
    authorizationScope: "second_controlled_synthetic_test",
    secondAttemptExplicitlyAuthorized: true,
    imageSha256: PHASE3F_IMAGE_SHA256,
    priorAttemptSha256: PHASE3C_MARKER_SHA256,
    approval: {
      schemaVersion: 3,
      imageProvenance: "synthetic_test_image",
      imagePath,
      authorizationRecordedAt: new Date(now).toISOString(),
      priceConfirmedAt: new Date(now).toISOString(),
      confirmedAnalysisCostUnits: 9,
      maxAnalysisUnits: 12,
      previousBalanceEvidence: {
        units: 1040,
        type: "bonus",
        observedAtApproximate: "historical fixture observation",
        source:
          "User-reported dashboard screenshot; not independently accessed",
        paidSubscription: false,
        autoRefillEnabled: false,
        recentUsageUnits: 0,
      },
      currentBalanceVerified: false,
      allProviderCostsWithinBudgetConfirmed: false,
      acceptHistoricalBillingEvidence: true,
      acceptUnknownAncillaryUnitCost: true,
      acknowledgeNoProviderSideBudgetCap: true,
      evidenceOfMonetaryBillingOrCostAboveBudget: false,
      existingFreeCreditsOnlyConfirmed: true,
      authorizeImageUpload: true,
      authorizeOneAnalysis: true,
      syntheticImageUseAuthorized: true,
      fictionalAdultDepictionConfirmed: true,
      acknowledgeNoClinicalValidity: true,
      acknowledgePerfectCorp30DayRetention: true,
      frontFacingEvenLightConfirmed: true,
    },
  };
}
describe("Phase3F preparation and new authorization boundary, mocked only", () => {
  it("requires a distinct second-attempt envelope; Phase3C approval alone is exhausted", () => {
    expect(() =>
      validatePhase3FAuthorization(authorization().approval, imagePath, now),
    ).toThrow("PHASE3F_FRESH_AUTHORIZATION_REQUIRED");
    expect(() => validatePhase3FAuthorization({}, imagePath, now)).toThrow(
      "PHASE3F_FRESH_AUTHORIZATION_REQUIRED",
    );
  });
  it.each([
    { phase: "3C" },
    { secondAttemptExplicitlyAuthorized: false },
    { imageSha256: "a".repeat(64) },
    { priorAttemptSha256: "b".repeat(64) },
    { authorizationScope: "first_attempt" },
  ])("rejects incorrect scope or artifact binding %#", (change) => {
    expect(() =>
      validatePhase3FAuthorization(
        { ...authorization(), ...change },
        imagePath,
        now,
      ),
    ).toThrow();
  });
  it("accepts only a fresh phase-specific synthetic authorization for the exact reviewed path", () => {
    expect(
      validatePhase3FAuthorization(authorization(), imagePath, now).imagePath,
    ).toBe(imagePath);
    expect(() =>
      validatePhase3FAuthorization(authorization(), "/fixture/other.jpg", now),
    ).toThrow("ARTIFACT_OR_AUTHORIZATION_SCOPE");
    expect(() =>
      validatePhase3FAuthorization(
        authorization(),
        imagePath,
        now + 16 * 60000,
      ),
    ).toThrow("FRESH_BALANCE_PRICE_AND_CONSENT_REQUIRED");
  });
  it("rejects any changed previous attempt evidence without mutation", () => {
    const original = new TextEncoder().encode("fixture historical marker");
    const before = original.slice();
    expect(() => verifyPriorAttempt(original)).toThrow(
      "PHASE3C_EVIDENCE_CHANGED",
    );
    expect(original).toEqual(before);
  });
  const c = {
    key: "fixture-only",
    base: "https://yce-api-01.makeupar.com",
    uploadHosts: ["yce-us.s3-accelerate.amazonaws.com"],
  };
  it("accepts only the previously verified origin and one exact approved storage host", () => {
    expect(() => validatePhase3FConfig(c)).not.toThrow();
    expect(validatePhase3FConfig({ ...c, base: c.base + "/" }).base).toBe(
      c.base,
    );
  });
  it.each([
    { key: "" },
    { base: "https://other.invalid" },
    { base: "http://yce-api-01.makeupar.com" },
    { base: "https://yce-api-01.makeupar.com/extra" },
    { uploadHosts: ["other.example.com"] },
    { uploadHosts: [...c.uploadHosts, "other.example.com"] },
  ])("rejects broadened or invalid execution config %#", (change) => {
    expect(() => validatePhase3FConfig({ ...c, ...change })).toThrow();
  });
});
describe("reviewed JPEG byte preservation; generated non-face fixtures", () => {
  async function fixture() {
    return sharp({
      create: { width: 680, height: 850, channels: 3, background: "#aaaaaa" },
    })
      .jpeg()
      .toBuffer();
  }
  it("returns the exact input bytes without re-encoding", async () => {
    const bytes = await fixture();
    const before = bytes.slice();
    const prepared = await prepareReviewedJpeg(bytes, {
      sha256: sha256(bytes),
      width: 680,
      height: 850,
    });
    expect(prepared.bytes).toBe(bytes);
    expect(prepared.bytes).toEqual(before);
    expect(prepared.capture).toMatchObject({ width: 680, height: 850 });
  });
  it("rejects a changed JPEG even when dimensions match", async () => {
    const bytes = await fixture();
    await expect(
      prepareReviewedJpeg(bytes, {
        sha256: "0".repeat(64),
        width: 680,
        height: 850,
      }),
    ).rejects.toThrow("HASH_MISMATCH");
  });
  it("checks decoded dimensions even with matching hash", async () => {
    const bytes = await fixture();
    await expect(
      prepareReviewedJpeg(bytes, {
        sha256: sha256(bytes),
        width: 681,
        height: 850,
      }),
    ).rejects.toThrow("FORMAT_MISMATCH");
  });
  it("rejects metadata-bearing images without silently changing approved bytes", async () => {
    const bytes = await sharp(await fixture())
      .withMetadata({ orientation: 1 })
      .jpeg()
      .toBuffer();
    await expect(
      prepareReviewedJpeg(bytes, {
        sha256: sha256(bytes),
        width: 680,
        height: 850,
      }),
    ).rejects.toThrow("FORMAT_MISMATCH");
  });
  it("still validates minimum SD dimensions with matching hash", async () => {
    const bytes = await sharp({
      create: { width: 400, height: 500, channels: 3, background: "#aaaaaa" },
    })
      .jpeg()
      .toBuffer();
    await expect(
      prepareReviewedJpeg(bytes, {
        sha256: sha256(bytes),
        width: 400,
        height: 500,
      }),
    ).rejects.toThrow("IMAGE_DIMENSIONS_OR_CORRUPT");
  });
});
