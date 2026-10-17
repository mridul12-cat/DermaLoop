import "server-only";
import { z } from "zod";
import { request, upload, ProviderError, type Config } from "./client";
import { status, validateActions } from "./skin";
import { ScanSchema, type SkinScan, type CaptureConditions } from "../models";
export const CONTROLLED_ACTIONS = [
  "acne",
  "pore",
  "texture",
  "redness",
] as const;
export const MAX_AUTHORIZED_UNITS = 12;
export const DOCUMENTED_SD_COST = 9;
const AdultOwnerApprovalSchema = z.object({
  imageProvenance: z.literal("real_person_image").optional(),
  schemaVersion: z.literal(1),
  imagePath: z.string().min(1),
  availableFreeUnits: z.number().int().min(MAX_AUTHORIZED_UNITS),
  balanceConfirmedAt: z.string().datetime(),
  priceConfirmedAt: z.string().datetime(),
  confirmedAnalysisCostUnits: z.literal(DOCUMENTED_SD_COST),
  maxAnalysisUnits: z.literal(MAX_AUTHORIZED_UNITS),
  confirmedMaximumTotalUnits: z
    .number()
    .int()
    .min(DOCUMENTED_SD_COST)
    .max(MAX_AUTHORIZED_UNITS),
  allProviderCostsWithinBudgetConfirmed: z.literal(true),
  existingFreeCreditsOnlyConfirmed: z.literal(true),
  authorizeImageUpload: z.literal(true),
  authorizeOneAnalysis: z.literal(true),
  adultImageOwnerConsent: z.literal(true),
  acknowledgePerfectCorp30DayRetention: z.literal(true),
  frontFacingEvenLightConfirmed: z.literal(true),
  confirmedAt: z.string().datetime(),
});
const SyntheticApprovalSchema = AdultOwnerApprovalSchema.omit({
  schemaVersion: true,
  adultImageOwnerConsent: true,
  imageProvenance: true,
}).extend({
  schemaVersion: z.literal(2),
  imageProvenance: z.literal("synthetic_test_image"),
  syntheticImageUseAuthorized: z.literal(true),
  fictionalAdultDepictionConfirmed: z.literal(true),
  acknowledgeNoClinicalValidity: z.literal(true),
  adultImageOwnerConsent: z.never().optional(),
});
// Version 3 records the user's explicit revised risk acceptance. It never turns
// historical screenshot evidence into a fresh account observation or cost guarantee.
const RevisedSyntheticApprovalSchema = SyntheticApprovalSchema.omit({
  schemaVersion: true,
  availableFreeUnits: true,
  balanceConfirmedAt: true,
  confirmedMaximumTotalUnits: true,
  allProviderCostsWithinBudgetConfirmed: true,
  confirmedAt: true,
})
  .extend({
    schemaVersion: z.literal(3),
    authorizationRecordedAt: z.string().datetime(),
    previousBalanceEvidence: z
      .object({
        units: z.number().int().min(MAX_AUTHORIZED_UNITS),
        type: z.literal("bonus"),
        observedAtApproximate: z.string().min(1),
        source: z.literal(
          "User-reported dashboard screenshot; not independently accessed",
        ),
        paidSubscription: z.literal(false),
        autoRefillEnabled: z.literal(false),
        recentUsageUnits: z.number().int().nonnegative(),
      })
      .strict(),
    currentBalanceVerified: z.literal(false),
    allProviderCostsWithinBudgetConfirmed: z.literal(false),
    acceptHistoricalBillingEvidence: z.literal(true),
    acceptUnknownAncillaryUnitCost: z.literal(true),
    acknowledgeNoProviderSideBudgetCap: z.literal(true),
    evidenceOfMonetaryBillingOrCostAboveBudget: z.literal(false),
  })
  .strict();
export const ApprovalSchema = z.discriminatedUnion("schemaVersion", [
  AdultOwnerApprovalSchema,
  SyntheticApprovalSchema,
  RevisedSyntheticApprovalSchema,
]);
export type ControlledApproval = z.infer<typeof ApprovalSchema>;
export function validateApproval(input: unknown, now = Date.now()) {
  const p = ApprovalSchema.safeParse(input);
  if (!p.success) throw new ProviderError("CONTROLLED_APPROVAL_REQUIRED", 403);
  for (const date of [
    ...(p.data.schemaVersion === 3 ? [] : [p.data.balanceConfirmedAt]),
    p.data.priceConfirmedAt,
    p.data.schemaVersion === 3
      ? p.data.authorizationRecordedAt
      : p.data.confirmedAt,
  ]) {
    const age = now - Date.parse(date);
    if (age < 0 || age > 15 * 60 * 1000)
      throw new ProviderError("FRESH_BALANCE_PRICE_AND_CONSENT_REQUIRED", 403);
  }
  return p.data;
}
type Dependencies = {
  prepare: (
    path: string,
  ) => Promise<{ bytes: Uint8Array; capture: CaptureConditions }>;
  claim: () => void;
  fetcher: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
  record?: (event: Record<string, unknown>) => void;
};
// Private operator-only entry point. No public route calls this function.
// It NEVER calls config(), toggles live mode, purchases units or retries a POST/PUT.
export async function runControlledScan(
  input: unknown,
  c: Config,
  deps: Dependencies,
): Promise<{ scan: SkinScan; summary: Record<string, unknown> }> {
  validateActions(CONTROLLED_ACTIONS);
  const approval = validateApproval(input, deps.now());
  const prepared = await deps.prepare(approval.imagePath);
  validateApproval(input, deps.now()); // Reject stale approval after slow local preparation.
  const synthetic = approval.schemaVersion !== 1;
  const capturedAt = new Date(deps.now()).toISOString();
  deps.claim(); // Durable, exclusive single-use claim BEFORE the first provider operation.
  const counts = { registration: 0, upload: 0, task: 0, status: 0 };
  const boundedFetch: typeof fetch = async (url, init) => {
    let operation: keyof typeof counts;
    const target = new URL(String(url));
    const api = new URL(c.base);
    if (
      init?.method === "POST" &&
      target.origin === api.origin &&
      target.pathname === "/s2s/v2.0/file"
    ) {
      operation = "registration";
      if (++counts.registration > 1)
        throw new ProviderError("CONTROLLED_DUPLICATE_BLOCKED");
    } else if (
      init?.method === "POST" &&
      target.origin === api.origin &&
      target.pathname === "/s2s/v2.1/task/skin-analysis"
    ) {
      operation = "task";
      if (++counts.task > 1)
        throw new ProviderError("CONTROLLED_DUPLICATE_BLOCKED");
    } else if (init?.method === "PUT") {
      operation = "upload";
      if (++counts.upload > 1)
        throw new ProviderError("CONTROLLED_DUPLICATE_BLOCKED");
    } else if (
      init?.method === "GET" &&
      target.origin === api.origin &&
      target.pathname.startsWith("/s2s/v2.1/task/skin-analysis/")
    ) {
      operation = "status";
      if (++counts.status > 45)
        throw new ProviderError("CONTROLLED_POLL_LIMIT");
    } else throw new ProviderError("CONTROLLED_OPERATION_NOT_ALLOWED");
    deps.record?.({
      operation,
      state: "started",
      counts: { ...counts },
      ...(operation === "upload"
        ? { uploadHostname: target.hostname, exactHostAccepted: true }
        : {}),
    });
    const response = await deps.fetcher(url, init);
    deps.record?.({
      operation,
      httpStatus: response.status,
      counts: { ...counts },
    });
    return response;
  };
  const startConfig = { ...c, signal: AbortSignal.timeout(55000) };
  const id = await upload(
    startConfig,
    prepared.bytes,
    "image/jpeg",
    boundedFetch,
  );
  const task = await request(
    startConfig,
    "/s2s/v2.1/task/skin-analysis",
    { src_file_id: id, dst_actions: [...CONTROLLED_ACTIONS], format: "json" },
    boundedFetch,
  );
  const parsed = z
    .object({ data: z.object({ task_id: z.string().min(1) }) })
    .safeParse(task);
  if (!parsed.success) throw new ProviderError("MALFORMED_TASK_RESPONSE");
  const deadline = deps.now() + 150000;
  while (deps.now() < deadline) {
    await deps.sleep(10000);
    const remaining = deadline - deps.now();
    if (remaining <= 0) break;
    const result = await status(
      { ...c, signal: AbortSignal.timeout(remaining) },
      parsed.data.data.task_id,
      boundedFetch,
      (state, diagnostics) =>
        deps.record?.({
          providerTaskState: state,
          ...(diagnostics ? { diagnostics } : {}),
        }),
    );
    if (result.state === "success") {
      const scores = result.scores.filter((s) =>
        CONTROLLED_ACTIONS.includes(
          s.metricKey as (typeof CONTROLLED_ACTIONS)[number],
        ),
      );
      if (
        CONTROLLED_ACTIONS.some(
          (a) =>
            !scores.some(
              (s) =>
                s.metricKey === a &&
                s.region === "whole" &&
                s.rawScore !== null,
            ),
        )
      )
        throw new ProviderError("CONTROLLED_INCOMPLETE_RESULT");
      const scan = ScanSchema.parse({
        id: parsed.data.data.task_id,
        capturedAt,
        provider: "youcam",
        apiVersion: "2.1",
        engineVersion: "2.1-SD-unpinned",
        source: "live",
        imageProvenance: synthetic
          ? "synthetic_test_image"
          : "real_person_image",
        ...(synthetic
          ? { sourceLabel: "Live YouCam API — Synthetic Test Image" }
          : {}),
        requestedActions: [...CONTROLLED_ACTIONS],
        capture: prepared.capture,
        scores,
        consent: {
          version: "1",
          acceptedAt:
            approval.schemaVersion === 3
              ? approval.authorizationRecordedAt
              : approval.confirmedAt,
          kind: synthetic
            ? "synthetic_test_authorization"
            : "adult_owner_consent",
        },
      });
      return {
        scan,
        summary: {
          outcome: "success",
          apiVersion: "2.1",
          mode: "SD",
          requestedActions: [...CONTROLLED_ACTIONS],
          metricCount: scores.length,
          counts,
          documentedExpectedAnalysisUnits: DOCUMENTED_SD_COST,
          maxAuthorizedAnalysisUnits: MAX_AUTHORIZED_UNITS,
          observedUsageDelta: null,
          publicLiveEnabled: false,
          imageProvenance: synthetic
            ? "synthetic_test_image"
            : "real_person_image",
          ...(synthetic
            ? {
                sourceLabel: "Live YouCam API — Synthetic Test Image",
                limitation:
                  "Integration test only; no real-world skin health or diagnostic validity implied",
              }
            : {}),
        },
      };
    }
  }
  throw new ProviderError("CONTROLLED_POLL_TIMEOUT_DO_NOT_RESUBMIT");
}
