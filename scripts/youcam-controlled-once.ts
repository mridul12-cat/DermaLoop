// Preparation default is offline. Execute only after separate explicit human authorization.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  runControlledScan,
  validateApproval,
} from "../src/lib/youcam/controlled";
import { validateImage } from "../src/lib/youcam/image";
import { ProviderError } from "../src/lib/youcam/client";
import { parseUploadHosts } from "../src/lib/youcam/upload-policy.mjs";
import { measure } from "../src/lib/skin/photo-quality";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, ".private");
const marker = path.join(dir, "phase3c-attempt.json");
if (!process.argv.includes("--execute-explicitly-authorized")) {
  console.log(
    JSON.stringify({
      status: "PREPARED_NOT_EXECUTED",
      actions: ["acne", "pore", "texture", "redness"],
      expectedAnalysisUnits: 9,
      maxAnalysisUnits: 12,
      networkRequests: 0,
      requires:
        "Explicit versioned private authorization, current documented price, provenance disclosure and one-upload/one-task approval. See docs/FIRST_REAL_SCAN.md.",
    }),
  );
  process.exit(0);
}
let claimed = false;
const evidence: Record<string, unknown>[] = [];
function persist(extra: Record<string, unknown> = {}) {
  fs.writeFileSync(
    marker,
    JSON.stringify({
      state: "claimed; never automatically repeat",
      evidence,
      maxAnalysisUnits: 12,
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
    throw new ProviderError("PUBLIC_LIVE_MUST_STAY_DISABLED");
  if (!process.env.YOUCAM_API_KEY?.trim())
    throw new ProviderError("KEY_REQUIRED");
  if (
    new URL(process.env.YOUCAM_BASE_URL || "https://yce-api-01.makeupar.com")
      .href !== "https://yce-api-01.makeupar.com/"
  )
    throw new ProviderError("CONTROLLED_ORIGIN_NOT_APPROVED");
  if (fs.existsSync(marker))
    throw new ProviderError("CONTROLLED_ATTEMPT_ALREADY_CLAIMED");
  const approval = validateApproval(
    JSON.parse(
      fs.readFileSync(path.join(dir, "phase3c-authorization.json"), "utf8"),
    ),
  );
  const c = {
    key: process.env.YOUCAM_API_KEY,
    base: "https://yce-api-01.makeupar.com",
    uploadHosts: parseUploadHosts(process.env.YOUCAM_UPLOAD_HOSTS),
  };
  const result = await runControlledScan(approval, c, {
    now: Date.now,
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    fetcher: fetch,
    record(event) {
      evidence.push({ ...event, recordedAt: new Date().toISOString() });
      persist();
    },
    claim() {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
      fs.writeFileSync(
        marker,
        JSON.stringify({
          claimedAt: new Date().toISOString(),
          state: "claimed; never automatically repeat",
          maxAnalysisUnits: 12,
        }),
        { flag: "wx", mode: 0o600 },
      );
      claimed = true;
    },
    async prepare(filename) {
      // No image is read until all fresh explicit approvals have passed.
      if (!path.isAbsolute(filename) || fs.statSync(filename).size > 15000000)
        throw new ProviderError("CONTROLLED_IMAGE_REQUIRED");
      const input = fs.readFileSync(filename);
      const meta = await sharp(input, {
        limitInputPixels: 20000000,
      }).metadata();
      if (
        !["jpeg", "png"].includes(meta.format || "") ||
        (meta.pages && meta.pages > 1)
      )
        throw new ProviderError("IMAGE_TYPE");
      // rotate() honors EXIF; re-encoding without withMetadata() strips EXIF.
      const bytes = await sharp(input, { limitInputPixels: 20000000 })
        .rotate()
        .resize({
          width: 2560,
          height: 2560,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 92 })
        .toBuffer();
      const dims = await validateImage(bytes, "image/jpeg");
      const { data, info } = await sharp(bytes)
        .resize({ width: 160 })
        .removeAlpha()
        .toColourspace("srgb")
        .raw()
        .toBuffer({ resolveWithObject: true });
      const rgba = new Uint8ClampedArray(info.width * info.height * 4);
      for (let i = 0; i < info.width * info.height; i++) {
        rgba[i * 4] = data[i * 3];
        rgba[i * 4 + 1] = data[i * 3 + 1];
        rgba[i * 4 + 2] = data[i * 3 + 2];
        rgba[i * 4 + 3] = 255;
      }
      return {
        bytes,
        capture: {
          ...dims,
          ...measure(rgba, info.width, info.height),
          frontView: true,
        },
      };
    },
  });
  // Scores/provenance stay in a private, Git-ignored file; no face/overlays/raw provider response saved.
  fs.writeFileSync(
    path.join(dir, "phase3c-baseline.json"),
    JSON.stringify(result.scan, null, 2),
    { mode: 0o600 },
  );
  fs.writeFileSync(
    marker,
    JSON.stringify({
      ...result.summary,
      evidence,
      baselineSaved: true,
      completedAt: new Date().toISOString(),
    }),
    { mode: 0o600 },
  );
  console.log(JSON.stringify(result.summary));
} catch (e) {
  const error =
    e instanceof ProviderError ? e.code : "CONTROLLED_LOCAL_OR_SCHEMA_ERROR";
  const diagnostics = e instanceof ProviderError ? e.diagnostics : undefined;
  if (claimed)
    fs.writeFileSync(
      marker,
      JSON.stringify({
        evidence,
        baselineSaved: false,
        ...(diagnostics ? { diagnostics } : {}),
        state: "stopped; do not resubmit",
        error,
        recordedAt: new Date().toISOString(),
      }),
      { mode: 0o600 },
    );
  console.log(
    JSON.stringify({
      outcome: "stopped",
      error,
      automaticRetry: false,
      ...(diagnostics ? { diagnostics } : {}),
      publicLiveEnabled: false,
    }),
  );
  process.exitCode = 1;
}
