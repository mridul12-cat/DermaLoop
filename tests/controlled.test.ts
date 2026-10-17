import { describe, it, expect, vi } from "vitest";
import {
  runControlledScan,
  validateApproval,
  CONTROLLED_ACTIONS,
} from "../src/lib/youcam/controlled";
import { type Config } from "../src/lib/youcam/client";
const now = Date.parse("2026-10-17T10:00:00.000Z");
const approval = () => ({
  schemaVersion: 1,
  imagePath: "/private-not-logged.jpg",
  availableFreeUnits: 12,
  balanceConfirmedAt: new Date(now).toISOString(),
  priceConfirmedAt: new Date(now).toISOString(),
  confirmedAnalysisCostUnits: 9,
  maxAnalysisUnits: 12,
  confirmedMaximumTotalUnits: 12,
  allProviderCostsWithinBudgetConfirmed: true,
  existingFreeCreditsOnlyConfirmed: true,
  authorizeImageUpload: true,
  authorizeOneAnalysis: true,
  adultImageOwnerConsent: true,
  acknowledgePerfectCorp30DayRetention: true,
  frontFacingEvenLightConfirmed: true,
  confirmedAt: new Date(now).toISOString(),
});
const c: Config = {
  key: "fixture-only",
  base: "https://provider.fixture.invalid",
  uploadHosts: ["yce-us.s3-accelerate.amazonaws.com"],
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
const file = {
  data: {
    files: [
      {
        file_id: "fixture-file",
        requests: [
          {
            method: "PUT",
            url: "https://yce-us.s3-accelerate.amazonaws.com/test?signature=fixture-only",
            headers: { "Content-Type": "image/jpeg" },
          },
        ],
      },
    ],
  },
};
const success = {
  data: {
    task_status: "success",
    results: {
      output: CONTROLLED_ACTIONS.map((type) => ({
        type,
        raw_score: 60,
        ui_score: 70,
      })),
    },
  },
};
function deps(fetcher: typeof fetch) {
  let clock = now;
  return {
    prepare: vi.fn().mockResolvedValue({
      bytes: new Uint8Array([1, 2, 3]),
      capture: {
        width: 800,
        height: 1000,
        brightness: 128,
        sharpness: 40,
        frontView: true,
      },
    }),
    claim: vi.fn(),
    fetcher,
    now: () => clock,
    sleep: async (ms: number) => {
      clock += ms;
    },
  };
}
describe("private four-SD-metric preparation, mocked only", () => {
  it("requires fresh explicit approvals and a confirmed balance before reading an image or sending requests", async () => {
    const d = deps(vi.fn());
    await expect(runControlledScan({}, c, d)).rejects.toThrow(
      "APPROVAL_REQUIRED",
    );
    expect(d.prepare).not.toHaveBeenCalled();
    expect(d.claim).not.toHaveBeenCalled();
    expect(d.fetcher).not.toHaveBeenCalled();
  });
  it.each([
    "authorizeImageUpload",
    "authorizeOneAnalysis",
    "adultImageOwnerConsent",
    "acknowledgePerfectCorp30DayRetention",
    "frontFacingEvenLightConfirmed",
  ])("rejects missing %s", (field) => {
    const a = approval();
    expect(() => validateApproval({ ...a, [field]: false }, now)).toThrow();
  });
  it.each([
    { availableFreeUnits: 11 },
    { confirmedMaximumTotalUnits: 13 },
    { allProviderCostsWithinBudgetConfirmed: false },
    { existingFreeCreditsOnlyConfirmed: false },
    { maxAnalysisUnits: 13 },
    { confirmedAnalysisCostUnits: 13 },
    { confirmedAnalysisCostUnits: 12 },
    { balanceConfirmedAt: new Date(now - 16 * 60000).toISOString() },
    { priceConfirmedAt: new Date(now - 16 * 60000).toISOString() },
    { confirmedAt: new Date(now + 1000).toISOString() },
  ])("refuses insufficient/stale/changed budget or price %#", (change) =>
    expect(() => validateApproval({ ...approval(), ...change }, now)).toThrow(),
  );
  it("uses exactly four supported SD actions, one upload, one task, and existing normalization", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(json(file))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(json({ data: { task_id: "fixture-task" } }))
      .mockResolvedValueOnce(json(success));
    const d = deps(f);
    const r = await runControlledScan(approval(), c, d);
    expect(d.claim).toHaveBeenCalledTimes(1);
    expect(JSON.parse(f.mock.calls[2][1].body)).toEqual({
      src_file_id: "fixture-file",
      dst_actions: ["acne", "pore", "texture", "redness"],
      format: "json",
    });
    expect(r.scan.source).toBe("live");
    expect(r.scan.scores).toHaveLength(4);
    expect(r.scan.scores[0].rawScore).toBe(60);
    expect(r.scan.scores[0].uiScore).toBe(70);
    expect(r.summary.counts).toEqual({
      registration: 1,
      upload: 1,
      task: 1,
      status: 1,
    });
    expect(JSON.stringify(r.summary)).not.toMatch(
      /fixture-task|signature|Bearer/,
    );
  });
  it("does not retry a failed or ambiguous task POST", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(json(file))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(json({}, 500));
    await expect(runControlledScan(approval(), c, deps(f))).rejects.toThrow(
      "PROVIDER_ERROR",
    );
    expect(f).toHaveBeenCalledTimes(3);
  });
  it("unknown upload host stops before image transfer or task", async () => {
    const other = structuredClone(file);
    other.data.files[0].requests[0].url = "https://unknown.example.org/private";
    const f = vi.fn().mockResolvedValueOnce(json(other));
    await expect(runControlledScan(approval(), c, deps(f))).rejects.toThrow(
      "UNSAFE_UPLOAD_URL",
    );
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("exclusive claim refusal prevents every provider operation", async () => {
    const f = vi.fn();
    const d = deps(f);
    d.claim.mockImplementation(() => {
      throw new Error("already claimed");
    });
    await expect(runControlledScan(approval(), c, d)).rejects.toThrow(
      "already claimed",
    );
    expect(f).not.toHaveBeenCalled();
  });
  it("bounds polling without recreating a task", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(json(file))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(json({ data: { task_id: "fixture-task" } }))
      .mockImplementation(async () =>
        json({ data: { task_status: "running" } }),
      );
    await expect(runControlledScan(approval(), c, deps(f))).rejects.toThrow(
      "POLL_TIMEOUT",
    );
    expect(
      f.mock.calls.filter((call) => call[1]?.method === "POST"),
    ).toHaveLength(2);
    expect(
      f.mock.calls.filter((call) => call[1]?.method === "GET"),
    ).toHaveLength(14);
  });
  it("does not claim a complete four-metric success with missing raw data", async () => {
    const malformed = structuredClone(success);
    malformed.data.results.output.pop();
    const f = vi
      .fn()
      .mockResolvedValueOnce(json(file))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(json({ data: { task_id: "fixture-task" } }))
      .mockResolvedValueOnce(json(malformed));
    await expect(runControlledScan(approval(), c, deps(f))).rejects.toThrow(
      "INCOMPLETE_RESULT",
    );
    expect(f).toHaveBeenCalledTimes(4);
  });
});

describe("synthetic integration-test provenance and gates", () => {
  function synthetic() {
    const original = approval();
    const { adultImageOwnerConsent: _unused, ...rest } = original;
    void _unused;
    return {
      ...rest,
      schemaVersion: 2,
      imageProvenance: "synthetic_test_image",
      syntheticImageUseAuthorized: true,
      fictionalAdultDepictionConfirmed: true,
      acknowledgeNoClinicalValidity: true,
    };
  }
  it("accepts synthetic authorization without inventing real-person consent", () => {
    expect(validateApproval(synthetic(), now).schemaVersion).toBe(2);
    expect(() =>
      validateApproval({ ...synthetic(), adultImageOwnerConsent: true }, now),
    ).toThrow();
  });
  it("keeps the total-cost and fresh-balance gates for synthetic tests", () => {
    expect(() =>
      validateApproval(
        { ...synthetic(), allProviderCostsWithinBudgetConfirmed: false },
        now,
      ),
    ).toThrow();
    expect(() =>
      validateApproval(
        {
          ...synthetic(),
          balanceConfirmedAt: new Date(now - 16 * 60000).toISOString(),
        },
        now,
      ),
    ).toThrow();
  });
  it("labels actual API-origin scores with synthetic image provenance", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(json(file))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(json({ data: { task_id: "fixture-task" } }))
      .mockResolvedValueOnce(json(success));
    const result = await runControlledScan(synthetic(), c, deps(f));
    expect(result.scan.imageProvenance).toBe("synthetic_test_image");
    expect(result.scan.sourceLabel).toBe(
      "Live YouCam API — Synthetic Test Image",
    );
    expect(result.scan.consent?.kind).toBe("synthetic_test_authorization");
    expect(result.scan.source).toBe("live");
  });
});

function revised() {
  const {
    availableFreeUnits: _units,
    balanceConfirmedAt: _balance,
    confirmedMaximumTotalUnits: _total,
    adultImageOwnerConsent: _adult,
    confirmedAt: _confirmed,
    ...rest
  } = approval();
  void [_units, _balance, _total, _adult, _confirmed];
  return {
    ...rest,
    authorizationRecordedAt: new Date(now).toISOString(),
    schemaVersion: 3,
    imageProvenance: "synthetic_test_image",
    syntheticImageUseAuthorized: true,
    fictionalAdultDepictionConfirmed: true,
    acknowledgeNoClinicalValidity: true,
    previousBalanceEvidence: {
      units: 1040,
      type: "bonus",
      observedAtApproximate: "historical screenshot",
      source: "User-reported dashboard screenshot; not independently accessed",
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
  };
}
describe("revised synthetic risk acceptance", () => {
  it("records historical evidence without fabricating a fresh balance or total-cost guarantee", () => {
    expect(validateApproval(revised(), now).schemaVersion).toBe(3);
  });
  it.each([
    { acceptHistoricalBillingEvidence: false },
    { acceptUnknownAncillaryUnitCost: false },
    { acknowledgeNoProviderSideBudgetCap: false },
    { evidenceOfMonetaryBillingOrCostAboveBudget: true },
    { currentBalanceVerified: true },
    { allProviderCostsWithinBudgetConfirmed: true },
    { adultImageOwnerConsent: true },
    { maxAnalysisUnits: 13 },
    { authorizeOneAnalysis: false },
    { authorizationRecordedAt: new Date(now - 16 * 60000).toISOString() },
    { priceConfirmedAt: new Date(now - 16 * 60000).toISOString() },
  ])(
    "rejects missing risk acceptance, invented evidence, stale consent or changed scope %#",
    (change) => {
      expect(() =>
        validateApproval({ ...revised(), ...change }, now),
      ).toThrow();
    },
  );
  it.each([
    { paidSubscription: true },
    { autoRefillEnabled: true },
    { units: 11 },
  ])("rejects contradictory billing evidence %#", (change) => {
    const a = revised();
    expect(() =>
      validateApproval(
        {
          ...a,
          previousBalanceEvidence: { ...a.previousBalanceEvidence, ...change },
        },
        now,
      ),
    ).toThrow();
  });
  it("executes once with synthetic provenance and sanitized evidence", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(json(file))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(json({ data: { task_id: "fixture-task" } }))
      .mockResolvedValueOnce(json(success));
    const record = vi.fn();
    const result = await runControlledScan(revised(), c, {
      ...deps(f),
      record,
    });
    expect(result.scan.imageProvenance).toBe("synthetic_test_image");
    expect(record).toHaveBeenCalledWith({ providerTaskState: "success" });
    expect(JSON.stringify(record.mock.calls)).not.toMatch(
      /fixture-task|signature|Bearer/,
    );
    expect(f).toHaveBeenCalledTimes(4);
  });
  it("preserves provider success evidence even when normalization fails, without resubmission", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(json(file))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(json({ data: { task_id: "fixture-task" } }))
      .mockResolvedValueOnce(
        json({ data: { task_status: "success", results: {} } }),
      );
    const record = vi.fn();
    await expect(
      runControlledScan(revised(), c, { ...deps(f), record }),
    ).rejects.toThrow("MALFORMED_RESULT");
    expect(record).toHaveBeenCalledWith({ providerTaskState: "success" });
    expect(f).toHaveBeenCalledTimes(4);
  });
});

it("stops on terminal provider error, preserves sanitized evidence and never resubmits", async () => {
  const f = vi
    .fn()
    .mockResolvedValueOnce(json(file))
    .mockResolvedValueOnce(new Response(null, { status: 200 }))
    .mockResolvedValueOnce(json({ data: { task_id: "fixture-task" } }))
    .mockResolvedValueOnce(
      json({
        data: {
          task_status: "error",
          error: "error_src_face_too_small",
          error_message: "private-fixture-description",
        },
      }),
    );
  const record = vi.fn();
  await expect(
    runControlledScan(revised(), c, { ...deps(f), record }),
  ).rejects.toThrow("ANALYSIS_FAILED");
  expect(record).toHaveBeenCalledWith(
    expect.objectContaining({
      providerTaskState: "error",
      diagnostics: expect.objectContaining({
        providerCode: "error_src_face_too_small",
        category: "face_framing",
      }),
    }),
  );
  expect(f).toHaveBeenCalledTimes(4);
  expect(JSON.stringify(record.mock.calls)).not.toMatch(
    /fixture-task|signature|Bearer|private-fixture-description/,
  );
});
