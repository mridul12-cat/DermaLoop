import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm, symlink, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import {
  activation,
  localRequest,
  RateLimit,
  reserveAttempt,
  hasAttempt,
  prepareImage,
  analyze,
  safeFailure,
  localConfig,
  projectResult,
  saveResult,
  storedResult,
} from "../src/local-live/service";

import { POST as publicStart } from "../src/app/api/scan/start/route";
import { POST as publicStatus } from "../src/app/api/scan/status/route";
const active = {
  NODE_ENV: "development",
  DERMALOOP_LOCAL_LIVE: "true",
  YOUCAM_LIVE_ENABLED: "true",
};
const cfg = {
  key: "offline-test-key",
  base: "https://yce-api-01.makeupar.com",
  uploadHosts: ["yce-us.s3-accelerate.amazonaws.com"],
};
const paths: string[] = [];
async function root() {
  const p = await mkdtemp(path.join(tmpdir(), "dermaloop-local-test-"));
  paths.push(p);
  return p;
}
afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(
    paths.splice(0).map((p) => rm(p, { recursive: true, force: true })),
  );
});
const valid = {
  remote: "127.0.0.1",
  bound: "127.0.0.1",
  port: 3210,
  host: "127.0.0.1:3210",
  origin: "http://127.0.0.1:3210",
  site: "same-origin",
  forwarded: false,
  mutation: true,
  session: "test-session",
};
const output = ["acne", "pore", "texture", "redness"].map((type, i) => ({
  type,
  raw_score: 61 + i + 0.25,
  ui_score: 70 + i,
}));
function transport(
  options: {
    failure?: string;
    missing?: boolean;
    uploadHost?: string;
    storageAuth?: boolean;
    postTimeout?: boolean;
    alwaysRunning?: boolean;
  } = {},
) {
  const calls: {
    method: string;
    url: string;
    body?: string;
    headers: Headers;
  }[] = [];
  const fetcher = vi.fn(
    async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const url = String(input),
        method = init?.method || "GET";
      calls.push({
        method,
        url,
        body: init?.body as string,
        headers: new Headers(init?.headers),
      });
      if (url.endsWith("/file"))
        return Response.json({
          data: {
            files: [
              {
                file_id: "offline-file",
                requests: [
                  {
                    method: "PUT",
                    url: `https://${options.uploadHost || "yce-us.s3-accelerate.amazonaws.com"}/offline`,
                    headers: options.storageAuth
                      ? { Authorization: "forbidden" }
                      : { "Content-Type": "image/jpeg" },
                  },
                ],
              },
            ],
          },
        });
      if (method === "PUT") return new Response(null, { status: 200 });
      if (method === "POST") {
        if (options.postTimeout) throw new Error("offline timeout");
        return Response.json({ data: { task_id: "offline-task" } });
      }
      if (options.failure)
        return Response.json({
          data: {
            task_status: "error",
            error: options.failure,
            message: "not retained",
          },
        });
      if (options.alwaysRunning)
        return Response.json({ data: { task_status: "running" } });
      return Response.json({
        data: {
          task_status: "success",
          results: { output: options.missing ? output.slice(0, 3) : output },
        },
      });
    },
  );
  return { fetcher: fetcher as typeof fetch, calls };
}
describe("independent local activation", () => {
  it("requires all development, env and CLI opt-ins", () => {
    expect(() => activation(active, true)).not.toThrow();
    for (const patch of [
      { NODE_ENV: "production" },
      { NODE_ENV: "test" },
      { DERMALOOP_LOCAL_LIVE: "false" },
      { YOUCAM_LIVE_ENABLED: "false" },
    ])
      expect(() => activation({ ...active, ...patch }, true)).toThrow();
    expect(() => activation(active, false)).toThrow();
  });
  for (const variable of [
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
  ])
    it("rejects deployed environment " + variable, () =>
      expect(() =>
        activation({ ...active, [variable]: "true" }, true),
      ).toThrow(),
    );
  it("pins API origin and storage policy", () => {
    for (const [k, v] of Object.entries(active)) vi.stubEnv(k, v);
    vi.stubEnv("YOUCAM_API_KEY", "offline-key");
    expect(localConfig().base).toBe(cfg.base);
    vi.stubEnv("YOUCAM_BASE_URL", "https://unapproved.invalid");
    expect(() => localConfig()).toThrow();
    vi.stubEnv("YOUCAM_BASE_URL", cfg.base);
    vi.stubEnv("YOUCAM_UPLOAD_HOSTS", "unapproved.invalid");
    expect(() => localConfig()).toThrow();
  });
});
describe("local socket, origin and operator session", () => {
  it("accepts only the exact bound socket, host and origin", () =>
    expect(() => localRequest(valid, "test-session")).not.toThrow());
  for (const patch of [
    { remote: "10.0.0.1" },
    { bound: "0.0.0.0" },
    { port: 1234 },
    { host: "attacker.test:3210" },
    { host: "localhost:3210" },
    { origin: "https://attacker.test" },
    { origin: undefined },
    { site: "cross-site" },
    { forwarded: true },
    { session: undefined },
    { session: "wrong" },
  ])
    it("rejects " + JSON.stringify(patch), () =>
      expect(() =>
        localRequest({ ...valid, ...patch }, "test-session"),
      ).toThrow(),
    );
  it("protects result reads without requiring a browser GET Origin header", () => {
    expect(() =>
      localRequest(
        { ...valid, origin: undefined, mutation: false, authenticated: true },
        "test-session",
      ),
    ).not.toThrow();
    expect(() =>
      localRequest(
        {
          ...valid,
          origin: undefined,
          mutation: false,
          authenticated: true,
          session: undefined,
        },
        "test-session",
      ),
    ).toThrow();
  });
  it("bounds local requests and replenishes only the rate window", () => {
    const limit = new RateLimit();
    for (let i = 0; i < 30; i++) limit.check(60000);
    expect(() => limit.check(60001)).toThrow("LOCAL_RATE_LIMIT");
    expect(() => limit.check(120000)).not.toThrow();
  });
});
describe("durable one-attempt allowance", () => {
  it("claims exclusively across races and stays exhausted after restart", async () => {
    const r = await root();
    expect(await hasAttempt(r)).toBe(false);
    const results = await Promise.allSettled([
      reserveAttempt(r, "synthetic_test_image"),
      reserveAttempt(r, "synthetic_test_image"),
    ]);
    expect(results.filter((v) => v.status === "fulfilled")).toHaveLength(1);
    expect(await hasAttempt(r)).toBe(true);
    await expect(reserveAttempt(r, "real_adult")).rejects.toThrow(
      "LOCAL_QUOTA_EXHAUSTED",
    );
    const marker = JSON.parse(
      await readFile(path.join(r, ".private/local-live/attempt.json"), "utf8"),
    );
    expect(marker.actions).toEqual(["acne", "pore", "texture", "redness"]);
    expect(marker.reservedAt).toBeTruthy();
    expect(JSON.stringify(marker)).not.toContain("offline-key");
  });
  it("rejects symlinked private storage", async () => {
    const r = await root(),
      dest = await root();
    await symlink(dest, path.join(r, ".private"));
    await expect(reserveAttempt(r, "real_adult")).rejects.toThrow(
      "PRIVATE_STORAGE_UNSAFE",
    );
  });
  it("rejects permissive local result directories", async () => {
    const r = await root();
    await mkdir(path.join(r, ".private/local-live"), {
      recursive: true,
      mode: 0o755,
    });
    await expect(hasAttempt(r)).rejects.toThrow("PRIVATE_STORAGE_UNSAFE");
  });
});
describe("image validation and preparation", () => {
  it("rotates, strips metadata and exports sRGB JPEG without upscaling", async () => {
    const input = await sharp({
      create: { width: 800, height: 600, channels: 3, background: "#aaa" },
    })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
    const b = await prepareImage(input, "image/jpeg"),
      meta = await sharp(b).metadata();
    expect(meta.width).toBe(600);
    expect(meta.height).toBe(800);
    expect(meta.format).toBe("jpeg");
    expect(meta.space).toBe("srgb");
    expect(meta.exif).toBeUndefined();
    expect(meta.orientation).toBeUndefined();
  });
  it("rejects unsupported, oversized and corrupt files", async () => {
    await expect(
      prepareImage(new Uint8Array(3500001), "image/jpeg"),
    ).rejects.toThrow("IMAGE_SIZE");
    await expect(
      prepareImage(new Uint8Array(100), "image/gif"),
    ).rejects.toThrow("IMAGE_TYPE");
    await expect(
      prepareImage(
        Uint8Array.from([255, 216, 255, ...new Array(100).fill(0)]),
        "image/jpeg",
      ),
    ).rejects.toThrow("IMAGE_DIMENSIONS_OR_CORRUPT");
  });
  it("rejects undersized images", async () => {
    const b = await sharp({
      create: { width: 479, height: 800, channels: 3, background: "#aaa" },
    })
      .png()
      .toBuffer();
    await expect(prepareImage(b, "image/png")).rejects.toThrow();
  });
});
describe("one provider workflow with offline transport", () => {
  it("performs one registration, PUT and exact four-action task, then normalizes genuine fixture fields", async () => {
    const mock = transport(),
      result = await analyze(
        cfg,
        new Uint8Array(100),
        "synthetic_test_image",
        mock.fetcher,
        async () => {},
      );
    expect(mock.calls.map((c) => c.method)).toEqual([
      "POST",
      "PUT",
      "POST",
      "GET",
    ]);
    expect(JSON.parse(mock.calls[2].body!)).toEqual({
      src_file_id: "offline-file",
      dst_actions: ["acne", "pore", "texture", "redness"],
      format: "json",
    });
    expect(mock.calls[1].headers.has("Authorization")).toBe(false);
    expect(result.scores[0]).toMatchObject({
      rawScore: 61.25,
      uiScore: 70,
      providerAction: "acne",
    });
    expect(JSON.stringify(result)).not.toMatch(
      /offline-file|offline-task|offline-test-key/,
    );
    const r = await root();
    await reserveAttempt(r, "synthetic_test_image");
    await saveResult(r, result);
    expect(await storedResult(r)).toEqual(result);
  });
  it("retains sanitized documented provider failure and never resubmits", async () => {
    const mock = transport({ failure: "error_no_face" });
    let failure;
    try {
      await analyze(
        cfg,
        new Uint8Array(100),
        "real_adult",
        mock.fetcher,
        async () => {},
      );
    } catch (e) {
      failure = safeFailure(e);
    }
    expect(failure).toMatchObject({
      state: "error",
      error: "ANALYSIS_FAILED",
      providerCode: "error_no_face",
      category: "face_detection",
      quotaUsed: true,
    });
    expect(JSON.stringify(failure)).not.toContain("not retained");
    expect(mock.calls.filter((c) => c.method === "POST")).toHaveLength(2);
  });
  it("does not retry ambiguous task creation", async () => {
    const mock = transport({ postTimeout: true });
    await expect(
      analyze(
        cfg,
        new Uint8Array(100),
        "real_adult",
        mock.fetcher,
        async () => {},
      ),
    ).rejects.toThrow("PROVIDER_TIMEOUT");
    expect(mock.calls.filter((c) => c.method === "POST")).toHaveLength(2);
  });
  it("stops on an unknown upload host before PUT", async () => {
    const mock = transport({ uploadHost: "attacker.invalid" });
    await expect(
      analyze(
        cfg,
        new Uint8Array(100),
        "real_adult",
        mock.fetcher,
        async () => {},
      ),
    ).rejects.toThrow("UNSAFE_UPLOAD_URL");
    expect(mock.calls).toHaveLength(1);
  });
  it("rejects authorization headers returned for storage", async () => {
    const mock = transport({ storageAuth: true });
    await expect(
      analyze(
        cfg,
        new Uint8Array(100),
        "real_adult",
        mock.fetcher,
        async () => {},
      ),
    ).rejects.toThrow("UPLOAD_FAILED");
    expect(mock.calls).toHaveLength(1);
  });
  it("does not invent a missing requested metric", async () => {
    const mock = transport({ missing: true });
    await expect(
      analyze(
        cfg,
        new Uint8Array(100),
        "real_adult",
        mock.fetcher,
        async () => {},
      ),
    ).rejects.toThrow("MISSING_REQUESTED_METRICS");
    expect(mock.calls.filter((c) => c.method === "POST")).toHaveLength(2);
  });
  it("bounds status polling without creating a replacement task", async () => {
    const mock = transport({ alwaysRunning: true });
    await expect(
      analyze(
        cfg,
        new Uint8Array(100),
        "real_adult",
        mock.fetcher,
        async () => {},
      ),
    ).rejects.toThrow("LOCAL_POLL_TIMEOUT");
    expect(mock.calls.filter((c) => c.method === "GET")).toHaveLength(12);
    expect(mock.calls.filter((c) => c.method === "POST")).toHaveLength(2);
  });
  it("sanitizes unexpected internal failures", () =>
    expect(safeFailure(new Error("private value"))).toEqual({
      state: "error",
      quotaUsed: true,
      error: "LOCAL_ANALYSIS_FAILED",
    }));
});
it("production public endpoints stay blocked even with every live flag true", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("YOUCAM_LIVE_ENABLED", "true");
  vi.stubEnv("DERMALOOP_LOCAL_LIVE", "true");
  const request = new Request("https://deployed.test/api/scan/start", {
    method: "POST",
  });
  for (const handler of [publicStart, publicStatus]) {
    const response = await handler(request);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "PUBLIC_SCANNING_DISABLED",
    });
  }
});

it("actual CLI entrypoint refuses production even with live opt-ins", () => {
  const run = spawnSync(
    process.execPath,
    [
      "--conditions=react-server",
      "--import",
      "tsx",
      "scripts/local-live-dev.ts",
      "--allow-local-live",
    ],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: "production",
        YOUCAM_LIVE_ENABLED: "true",
        DERMALOOP_LOCAL_LIVE: "true",
      },
      encoding: "utf8",
      timeout: 10000,
    },
  );
  expect(run.status).toBe(1);
  expect(run.stderr).toContain("Local live mode refused");
  expect(run.stderr).not.toContain("SyntaxError");
});
it("saved result projection strips unexpected fields", async () => {
  const mock = transport(),
    result = await analyze(
      cfg,
      new Uint8Array(100),
      "real_adult",
      mock.fetcher,
      async () => {},
    );
  const projected = projectResult({
    ...result,
    providerId: "offline-private-id",
    scores: result.scores.map((s) => ({
      ...s,
      privateField: "offline-private-id",
    })),
  });
  expect(JSON.stringify(projected)).not.toContain("offline-private-id");
});
it("saved result projection rejects duplicate or unrequested concerns", async () => {
  const mock = transport(),
    result = await analyze(
      cfg,
      new Uint8Array(100),
      "real_adult",
      mock.fetcher,
      async () => {},
    );
  expect(() =>
    projectResult({
      ...result,
      scores: result.scores.map(() => result.scores[0]),
    }),
  ).toThrow();
  expect(() =>
    projectResult({
      ...result,
      scores: result.scores.map((s) => ({ ...s, providerAction: "hd_acne" })),
    }),
  ).toThrow();
});
