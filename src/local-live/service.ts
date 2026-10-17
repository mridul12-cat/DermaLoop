import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { constants } from "node:fs";
import { mkdir, lstat, open, rename } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { z } from "zod";
import {
  config,
  request,
  upload,
  ProviderError,
  type Config,
} from "../lib/youcam/client";
import { validateImage } from "../lib/youcam/image";
import { status } from "../lib/youcam/skin";
import { ScoreSchema, type ConcernScore } from "../lib/models";

export const LOCAL_ACTIONS = ["acne", "pore", "texture", "redness"] as const;
export const LOCAL_ORIGIN = "http://127.0.0.1:3210";
const API_ORIGIN = "https://yce-api-01.makeupar.com";
const STORAGE_HOST = "yce-us.s3-accelerate.amazonaws.com";
export const MAX_BYTES = 3500000;
const deployed = [
  "VERCEL",
  "VERCEL_ENV",
  "NETLIFY",
  "AWS_LAMBDA_FUNCTION_NAME",
  "CF_PAGES",
  "RENDER",
  "FLY_APP_NAME",
  "CODESPACES",
  "GITPOD_WORKSPACE_ID",
  "CI",
];
export function activation(
  env: Record<string, string | undefined>,
  optedIn: boolean,
) {
  if (
    env.NODE_ENV !== "development" ||
    !optedIn ||
    env.DERMALOOP_LOCAL_LIVE !== "true" ||
    env.YOUCAM_LIVE_ENABLED !== "true" ||
    deployed.some((k) => Boolean(env[k]))
  )
    throw new ProviderError("LOCAL_LIVE_DISABLED", 403);
}
export function localConfig(env = process.env): Config {
  activation(env, true);
  const c = config();
  if (
    c.base !== API_ORIGIN ||
    (env.YOUCAM_BASE_URL && env.YOUCAM_BASE_URL !== API_ORIGIN) ||
    c.uploadHosts.length !== 1 ||
    c.uploadHosts[0] !== STORAGE_HOST ||
    !c.key.trim() ||
    /\s/.test(c.key)
  )
    throw new ProviderError("LOCAL_CONFIGURATION_REJECTED", 503);
  return c;
}
export function localRequest(
  input: {
    remote?: string;
    bound?: string;
    port?: number;
    host?: string;
    origin?: string;
    site?: string;
    forwarded: boolean;
    mutation: boolean;
    authenticated?: boolean;
    session?: string;
  },
  secret: string,
) {
  if (
    input.remote !== "127.0.0.1" ||
    input.bound !== "127.0.0.1" ||
    input.port !== 3210 ||
    input.host !== "127.0.0.1:3210" ||
    input.forwarded ||
    (input.origin !== undefined && input.origin !== LOCAL_ORIGIN) ||
    (input.site !== undefined && !["same-origin", "none"].includes(input.site))
  )
    throw new ProviderError("LOCAL_ORIGIN_REJECTED", 403);
  if (input.mutation && input.origin !== LOCAL_ORIGIN)
    throw new ProviderError("LOCAL_ORIGIN_REJECTED", 403);
  if (input.mutation || input.authenticated || input.session !== undefined) {
    const actual = Buffer.from(input.session || ""),
      expected = Buffer.from(secret);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      throw new ProviderError("LOCAL_SESSION_REQUIRED", 403);
  }
}
export class RateLimit {
  private count = 0;
  private since = 0;
  check(now = Date.now()) {
    if (now - this.since >= 60000) {
      this.since = now;
      this.count = 0;
    }
    if (++this.count > 30) throw new ProviderError("LOCAL_RATE_LIMIT", 429);
  }
}
async function privateDirectory(root: string) {
  let dir = root;
  for (const part of [".private", "local-live"]) {
    dir = path.join(dir, part);
    await mkdir(dir, { mode: 0o700 }).catch((e: NodeJS.ErrnoException) => {
      if (e.code !== "EEXIST") throw e;
    });
    const stat = await lstat(dir);
    if (
      !stat.isDirectory() ||
      stat.isSymbolicLink() ||
      (part === "local-live" && (stat.mode & 0o077) !== 0)
    )
      throw new ProviderError("PRIVATE_STORAGE_UNSAFE", 503);
  }
  return dir;
}
export async function reserveAttempt(root: string, provenance: string) {
  const dir = await privateDirectory(root);
  let file;
  try {
    file = await open(
      path.join(dir, "attempt.json"),
      constants.O_WRONLY |
        constants.O_CREAT |
        constants.O_EXCL |
        constants.O_NOFOLLOW,
      0o600,
    );
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "EEXIST")
      throw new ProviderError("LOCAL_QUOTA_EXHAUSTED", 409);
    throw new ProviderError("PRIVATE_STORAGE_UNAVAILABLE", 503);
  }
  try {
    await file.writeFile(
      JSON.stringify({
        version: 1,
        reservedAt: new Date().toISOString(),
        provenance,
        actions: LOCAL_ACTIONS,
        intendedUnitCeiling: 12,
        warning:
          "Consumed before provider registration; no reset or automatic retry.",
      }),
    );
    await file.sync();
  } finally {
    await file.close();
  }
  const directory = await open(dir, "r");
  try {
    await directory.sync();
  } finally {
    await directory.close();
  }
}
export async function hasAttempt(root: string) {
  // Never follow a substituted quota marker or treat a storage error as unused quota.
  const dir = await privateDirectory(root);
  try {
    await lstat(path.join(dir, "attempt.json"));
    return true;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw e;
  }
}
export async function prepareImage(bytes: Uint8Array, mime: string) {
  await validateImage(bytes, mime);
  const prepared = await sharp(bytes, { limitInputPixels: 20000000 })
    .rotate()
    .toColourspace("srgb")
    .jpeg({ quality: 94 })
    .toBuffer();
  await validateImage(prepared, "image/jpeg");
  return prepared;
}
export type LocalResult = {
  source: "Live YouCam API — Local Operator Image";
  provenance: "real_adult" | "synthetic_test_image";
  capturedAt: string;
  actions: typeof LOCAL_ACTIONS;
  scores: ConcernScore[];
};
export type LocalState = {
  state: "idle" | "running" | "success" | "error" | "interrupted";
  result?: LocalResult;
  error?: string;
  providerCode?: string;
  category?: string;
  quotaUsed: boolean;
};
export function safeFailure(error: unknown): LocalState {
  return {
    state: "error",
    quotaUsed: true,
    error:
      error instanceof ProviderError ? error.code : "LOCAL_ANALYSIS_FAILED",
    ...(error instanceof ProviderError && error.diagnostics
      ? {
          providerCode: error.diagnostics.providerCode,
          category: error.diagnostics.category,
        }
      : {}),
  };
}
export async function analyze(
  c: Config,
  bytes: Uint8Array,
  provenance: LocalResult["provenance"],
  fetcher: typeof fetch = fetch,
  pause = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)),
) {
  const signal = AbortSignal.timeout(180000);
  c = { ...c, signal };
  // Existing upload policy and redirect rejection remain in force. Reject unexpected
  // storage headers too: a File response cannot cause bearer credentials to go to S3.
  const transport: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    if (init?.method === "PUT") {
      const headers = new Headers(init.headers);
      for (const [name] of headers)
        if (
          !["content-type", "content-length"].includes(name) &&
          !name.startsWith("x-amz-")
        )
          throw new ProviderError("UNSAFE_STORAGE_HEADERS");
    } else if (url.origin !== API_ORIGIN || !url.pathname.startsWith("/s2s/"))
      throw new ProviderError("UNSAFE_API_ORIGIN");
    return fetcher(input, init);
  };
  const fileId = await upload(c, bytes, "image/jpeg", transport);
  const task = z
    .object({ data: z.object({ task_id: z.string().min(1) }) })
    .safeParse(
      await request(
        c,
        "/s2s/v2.1/task/skin-analysis",
        { src_file_id: fileId, dst_actions: LOCAL_ACTIONS, format: "json" },
        transport,
      ),
    );
  if (!task.success) throw new ProviderError("MALFORMED_TASK_RESPONSE");
  for (let i = 0; i < 12; i++) {
    if (signal.aborted) break;
    await pause(10000);
    if (signal.aborted) break;
    const result = await status(c, task.data.data.task_id, transport);
    if (result.state === "success") {
      const scores = result.scores;
      if (
        scores.length !== 4 ||
        LOCAL_ACTIONS.some(
          (action) =>
            !scores.some(
              (s) =>
                s.providerAction === action &&
                s.region === "whole" &&
                s.rawScore !== null,
            ),
        )
      )
        throw new ProviderError("MISSING_REQUESTED_METRICS");
      return {
        source: "Live YouCam API — Local Operator Image" as const,
        provenance,
        capturedAt: new Date().toISOString(),
        actions: LOCAL_ACTIONS,
        scores,
      };
    }
  }
  throw new ProviderError("LOCAL_POLL_TIMEOUT");
}
export async function saveResult(root: string, result: LocalResult) {
  const dir = await privateDirectory(root),
    temp = path.join(dir, `${randomBytes(16).toString("hex")}.tmp`);
  const file = await open(temp, "wx", 0o600);
  try {
    await file.writeFile(JSON.stringify(projectResult(result)));
    await file.sync();
  } finally {
    await file.close();
  }
  await rename(temp, path.join(dir, "result.json"));
}
export async function storedResult(
  root: string,
): Promise<LocalResult | undefined> {
  const dir = await privateDirectory(root);
  try {
    const file = await open(
      path.join(dir, "result.json"),
      constants.O_RDONLY | constants.O_NOFOLLOW,
    );
    try {
      return projectResult(JSON.parse(await file.readFile("utf8")));
    } finally {
      await file.close();
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw e;
  }
}

// Revalidate the private projection on save and read; unknown fields never reach UI.
export function projectResult(value: unknown): LocalResult {
  return z
    .object({
      source: z.literal("Live YouCam API — Local Operator Image"),
      provenance: z.enum(["real_adult", "synthetic_test_image"]),
      capturedAt: z.string().datetime(),
      actions: z.tuple([
        z.literal("acne"),
        z.literal("pore"),
        z.literal("texture"),
        z.literal("redness"),
      ]),
      scores: z
        .array(
          ScoreSchema.omit({ missingReason: true }).extend({
            metricKey: z.enum(LOCAL_ACTIONS),
            providerAction: z.enum(LOCAL_ACTIONS),
            region: z.literal("whole"),
            mode: z.literal("SD"),
            rawScore: z.number().finite().min(0).max(100),
          }),
        )
        .length(4),
    })
    .refine((result) =>
      LOCAL_ACTIONS.every(
        (action) =>
          result.scores.filter(
            (score) =>
              score.metricKey === action && score.providerAction === action,
          ).length === 1,
      ),
    )
    .parse(value) as LocalResult;
}
