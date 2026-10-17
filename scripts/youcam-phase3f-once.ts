// Default performs local preflight only. This command does not create authorization.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runControlledScan } from "../src/lib/youcam/controlled";
import { ProviderError } from "../src/lib/youcam/client";
import { parseUploadHosts } from "../src/lib/youcam/upload-policy.mjs";
import {
  PHASE3F_IMAGE_SHA256,
  PHASE3C_MARKER_SHA256,
  sha256,
  prepareReviewedJpeg,
  validatePhase3FAuthorization,
  verifyPriorAttempt,
  validatePhase3FConfig,
} from "../src/lib/youcam/phase3f";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, ".private");
const imagePath = path.join(dir, "phase3e", "portrait-framed.jpg");
const marker = path.join(dir, "phase3f-attempt.json");
const baseline = path.join(dir, "phase3f-baseline.json");
const authorization = path.join(dir, "phase3f-authorization.json");
const execute = process.argv.includes("--execute-phase3f-authorized");
const evidence: Record<string, unknown>[] = [];
let claimed = false;
let claimedAt: string | undefined;
function prior() {
  verifyPriorAttempt(fs.readFileSync(path.join(dir, "phase3c-attempt.json")));
}
function save(extra: Record<string, unknown> = {}) {
  fs.writeFileSync(
    marker,
    JSON.stringify({
      phase: "3F",
      claimedAt,
      state: "claimed; never automatically repeat",
      imageSha256: PHASE3F_IMAGE_SHA256,
      priorAttemptSha256: PHASE3C_MARKER_SHA256,
      intendedMaximumFreeUnits: 12,
      evidence,
      ...extra,
    }),
    { mode: 0o600 },
  );
}
try {
  const m = await import("@next/env");
  const load = m.loadEnvConfig ?? m.default?.loadEnvConfig;
  load(root, true, { info() {}, error() {} }, true);
  if (process.env.YOUCAM_LIVE_ENABLED !== "false")
    throw new ProviderError("PUBLIC_LIVE_MUST_STAY_DISABLED", 403);
  const c = validatePhase3FConfig({
    key: process.env.YOUCAM_API_KEY || "",
    base: process.env.YOUCAM_BASE_URL || "https://yce-api-01.makeupar.com",
    uploadHosts: parseUploadHosts(process.env.YOUCAM_UPLOAD_HOSTS),
  });
  prior();
  if (fs.existsSync(marker) || fs.existsSync(baseline))
    throw new ProviderError("PHASE3F_ATTEMPT_ALREADY_CLAIMED", 403);
  const imageSpec = { sha256: PHASE3F_IMAGE_SHA256, width: 680, height: 850 };
  if (!execute) {
    const prepared = await prepareReviewedJpeg(
      fs.readFileSync(imagePath),
      imageSpec,
    );
    console.log(
      JSON.stringify({
        phase: "3F",
        state: "PREPARED_PENDING_FRESH_AUTHORIZATION",
        providerRequests: 0,
        imageHashMatched: sha256(prepared.bytes) === PHASE3F_IMAGE_SHA256,
        imageDimensions: { width: 680, height: 850 },
        imageBytes: prepared.bytes.length,
        imageReencoded: false,
        priorAttemptPreserved: true,
        expectedAnalysisUnits: 9,
        intendedMaximumFreeUnits: 12,
        publicLiveEnabled: false,
        authorizationFilePresent: fs.existsSync(authorization),
      }),
    );
  } else {
    if (!fs.existsSync(authorization))
      throw new ProviderError("PHASE3F_FRESH_AUTHORIZATION_REQUIRED", 403);
    const approval = validatePhase3FAuthorization(
      JSON.parse(fs.readFileSync(authorization, "utf8")),
      imagePath,
    );
    const result = await runControlledScan(approval, c, {
      now: Date.now,
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
      fetcher: fetch,
      prepare: async () =>
        prepareReviewedJpeg(fs.readFileSync(imagePath), imageSpec),
      claim() {
        prior();
        claimedAt = new Date().toISOString();
        fs.writeFileSync(
          marker,
          JSON.stringify({
            phase: "3F",
            claimedAt,
            state: "claimed; never automatically repeat",
            imageSha256: PHASE3F_IMAGE_SHA256,
            priorAttemptSha256: PHASE3C_MARKER_SHA256,
          }),
          { flag: "wx", mode: 0o600 },
        );
        claimed = true;
      },
      record(event) {
        evidence.push({ ...event, recordedAt: new Date().toISOString() });
        save();
      },
    });
    fs.writeFileSync(baseline, JSON.stringify(result.scan, null, 2), {
      flag: "wx",
      mode: 0o600,
    });
    save({
      ...result.summary,
      baselineSaved: true,
      completedAt: new Date().toISOString(),
    });
    console.log(
      JSON.stringify({ phase: "3F", ...result.summary, baselineSaved: true }),
    );
  }
} catch (e) {
  const error =
    e instanceof ProviderError ? e.code : "PHASE3F_LOCAL_OR_SCHEMA_ERROR";
  const diagnostics = e instanceof ProviderError ? e.diagnostics : undefined;
  if (claimed)
    save({
      state: "stopped; do not resubmit",
      error,
      ...(diagnostics ? { diagnostics } : {}),
      baselineSaved: fs.existsSync(baseline),
      recordedAt: new Date().toISOString(),
    });
  console.log(
    JSON.stringify({
      phase: "3F",
      state: "stopped",
      error,
      ...(diagnostics ? { diagnostics } : {}),
      automaticRetry: false,
      publicLiveEnabled: false,
    }),
  );
  process.exitCode = 1;
}
