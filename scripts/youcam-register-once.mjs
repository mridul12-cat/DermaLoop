// A metadata-only, single-use diagnostic. Never calls upload() or any task route.
// This script does not enable live mode, query balances, or activate billing.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  parseUploadHosts,
  validateUploadUrl,
} from "../src/lib/youcam/upload-policy.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidence = path.join(
  root,
  "docs/evidence/phase3b-registration-attempt.json",
);
const responseSchema = z.object({
  status: z.literal(200),
  data: z.object({
    files: z
      .array(
        z.object({
          file_id: z.string().min(1),
          requests: z
            .array(
              z.object({
                method: z.literal("PUT"),
                url: z.string().url(),
                headers: z.record(
                  z.string(),
                  z.union([z.string(), z.number().finite().nonnegative()]),
                ),
              }),
            )
            .length(1),
        }),
      )
      .length(1),
  }),
});
let attempted = false;
const report = {
  phase: "3B revised",
  recordedAt: new Date().toISOString(),
  freeCreditsBasis:
    "User explicitly confirmed existing free credits and accepted possible unit deduction",
  dashboardBalanceBefore: null,
  dashboardBalanceAfter: null,
  dashboardReason:
    "Accessible browser session was signed out; no account usage/billing evidence available",
  billingActivated: false,
  publicLiveDisabled: null,
  postAttempts: 0,
  httpStatus: null,
  authentication: "not attempted",
  registrationSchema: "not evaluated",
  returnedUploadHostname: null,
  allowlistAccepted: null,
  observedUnitBalanceChange: null,
  imagePutRequests: 0,
  analysisTaskRequests: 0,
  automaticRetries: 0,
};
try {
  if (
    !process.argv.includes("--execute-authorized-registration") ||
    !process.argv.includes("--free-credits-confirmed-by-user")
  )
    throw Error("AUTHORIZATION_FLAGS_REQUIRED");
  if (fs.existsSync(evidence))
    throw Error("PRIOR_ATTEMPT_EXISTS_DO_NOT_REPEAT");
  const m = await import("@next/env");
  const load = m.loadEnvConfig ?? m.default?.loadEnvConfig;
  if (!load) throw Error("ENV_LOADER_UNAVAILABLE");
  load(root, true, { info() {}, error() {} }, true);
  if (process.env.YOUCAM_LIVE_ENABLED !== "false")
    throw Error("LIVE_MUST_REMAIN_DISABLED");
  report.publicLiveDisabled = true;
  if (!process.env.YOUCAM_API_KEY?.trim()) throw Error("API_KEY_REQUIRED");
  const base = process.env.YOUCAM_BASE_URL || "https://yce-api-01.makeupar.com";
  if (new URL(base).href !== "https://yce-api-01.makeupar.com/")
    throw Error("API_ORIGIN_NOT_APPROVED_FOR_THIS_SINGLE_REQUEST");
  const hosts = parseUploadHosts(process.env.YOUCAM_UPLOAD_HOSTS);
  const metadata = {
    files: [
      {
        content_type: "image/png",
        file_name: "dermaloop-registration-check.png",
        file_size: 128,
      },
    ],
  };
  // Claim single-use permission before network. An ambiguous failure is never retried.
  fs.writeFileSync(
    evidence,
    JSON.stringify(
      { ...report, outcome: "attempt claimed; do not repeat", postAttempts: 1 },
      null,
      2,
    ),
    { flag: "wx", mode: 0o600 },
  );
  attempted = true;
  report.postAttempts = 1;
  let response;
  try {
    response = await fetch("https://yce-api-01.makeupar.com/s2s/v2.0/file", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.YOUCAM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metadata),
      redirect: "error",
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    });
  } catch {
    report.authentication = "unknown: request failed or timed out; not retried";
    throw Error("REQUEST_FAILED_OR_TIMED_OUT");
  }
  report.httpStatus = response.status;
  if (response.status === 401 || response.status === 403)
    report.authentication = "rejected";
  else if (response.ok)
    report.authentication = "HTTP success; registration schema pending";
  else report.authentication = "not established by error response";
  // Read bounded bytes in memory only. Never print or persist raw response/URLs/file IDs.
  const reader = response.body?.getReader();
  if (!reader) throw Error("EMPTY_PROVIDER_RESPONSE");
  const chunks = [];
  let size = 0;
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    size += next.value.byteLength;
    if (size > 65536) {
      await reader.cancel();
      throw Error("RESPONSE_SIZE_LIMIT");
    }
    chunks.push(Buffer.from(next.value));
  }
  let raw;
  try {
    raw = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Error("MALFORMED_PROVIDER_JSON");
  }
  if (!response.ok) throw Error("PROVIDER_HTTP_ERROR");
  const parsed = responseSchema.safeParse(raw);
  if (!parsed.success) {
    report.registrationSchema = "FAIL: schema mismatch (details withheld)";
    throw Error("REGISTRATION_SCHEMA_MISMATCH");
  }
  report.registrationSchema = "PASS";
  report.authentication =
    "accepted: successful schema-valid registration response";
  const req = parsed.data.data.files[0].requests[0];
  const url = new URL(req.url);
  report.returnedUploadHostname = url.hostname;
  try {
    validateUploadUrl(req.url, hosts);
    report.allowlistAccepted = true;
  } catch {
    report.allowlistAccepted = false;
  }
  report.outcome = report.allowlistAccepted
    ? "registration validated; stopped before upload"
    : "unapproved or unsafe upload destination; stopped before upload";
  fs.writeFileSync(evidence, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  // Only known local messages can reach output. Never emit provider text or error stacks.
  const allowed = new Set([
    "AUTHORIZATION_FLAGS_REQUIRED",
    "PRIOR_ATTEMPT_EXISTS_DO_NOT_REPEAT",
    "ENV_LOADER_UNAVAILABLE",
    "LIVE_MUST_REMAIN_DISABLED",
    "API_KEY_REQUIRED",
    "API_ORIGIN_NOT_APPROVED_FOR_THIS_SINGLE_REQUEST",
    "REQUEST_FAILED_OR_TIMED_OUT",
    "EMPTY_PROVIDER_RESPONSE",
    "RESPONSE_SIZE_LIMIT",
    "MALFORMED_PROVIDER_JSON",
    "PROVIDER_HTTP_ERROR",
    "REGISTRATION_SCHEMA_MISMATCH",
  ]);
  report.outcome = allowed.has(error?.message)
    ? error.message
    : "SAFE_DIAGNOSTIC_FAILURE";
  if (attempted) fs.writeFileSync(evidence, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = 1;
}
