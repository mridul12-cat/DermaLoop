import { describe, it, expect, vi, afterEach } from "vitest";
import { normalize } from "../src/lib/youcam/normalize";
import {
  config,
  request,
  safeUpload,
  upload,
  type Config,
} from "../src/lib/youcam/client";
import { start, status } from "../src/lib/youcam/skin";
import { token, verify, guard } from "../src/lib/youcam/security";
import { validateImage } from "../src/lib/youcam/image";
import { compare } from "../src/lib/skin/compare";
import { decide } from "../src/lib/skin/insights";
import { measure } from "../src/lib/skin/photo-quality";
import { sample } from "../src/lib/fixtures";
import { WorkspaceSchema } from "../src/lib/models";
import { parseImport } from "../src/lib/storage";
import fixture from "../fixtures/youcam-json.json";
import sharp from "sharp";
const c: Config = {
  key: "test-key-only",
  base: "https://api.example",
  uploadHosts: ["yce-us.s3-accelerate.amazonaws.com"],
};
const json = (v: unknown, code = 200) =>
  new Response(JSON.stringify(v), { status: code });
const file = {
  data: {
    files: [
      {
        file_id: "opaque-file",
        requests: [
          {
            method: "PUT",
            url: "https://yce-us.s3-accelerate.amazonaws.com/upload",
            headers: { "Content-Type": "image/jpeg" },
          },
        ],
      },
    ],
  },
};
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
describe("normalization and integrity", () => {
  it("preserves documented raw and UI separately; drops mask URLs", () => {
    const r = normalize(fixture);
    expect(r[0].rawScore).toBe(57.33);
    expect(r[0].uiScore).toBe(68);
    expect(JSON.stringify(r)).not.toContain("https");
  });
  it("preserves zero and missing as distinct", () => {
    const r = normalize({
      data: {
        results: {
          output: [{ type: "acne", raw_score: 0 }, { type: "texture" }],
        },
      },
    });
    expect(r[0].rawScore).toBe(0);
    expect(r[1].rawScore).toBeNull();
  });
  it("ignores unknown metric", () => {
    const f = structuredClone(fixture);
    f.data.results.output.push({
      type: "future",
      raw_score: 20,
      ui_score: 30,
      mask_urls: [],
    });
    expect(normalize(f)).toHaveLength(2);
  });
  it.each([NaN, Infinity, 101, -1, "34"])("rejects invalid score %s", (v) => {
    expect(() =>
      normalize({
        data: { results: { output: [{ type: "acne", raw_score: v }] } },
      }),
    ).toThrow();
  });
  it("rejects ZIP/nested HD and v2.0 alternate structure", () => {
    expect(() => normalize({ hd_pore: { nose: { raw_score: 40 } } })).toThrow();
    expect(() =>
      normalize({ data: { results: { url: "archive.zip" } } }),
    ).toThrow();
  });
  it("rejects duplicate metrics", () => {
    expect(() =>
      normalize({
        data: {
          results: {
            output: [
              { type: "acne", raw_score: 2 },
              { type: "acne", raw_score: 4 },
            ],
          },
        },
      }),
    ).toThrow();
  });
  it("compares raw only despite adjusted values", () => {
    const [a, b] = sample().scans;
    b.scores[0].uiScore = 99;
    expect(compare(a, b, "moisture").delta).toBe(3);
  });
  it.each(["apiVersion", "engineVersion", "source"] as const)(
    "rejects mismatched %s",
    (key) => {
      const [a, b] = sample().scans;
      const altered = { ...b, [key]: "other" };
      expect(compare(a, altered as typeof a, "moisture").comparable).toBe(
        false,
      );
    },
  );
  it("gates HD vs SD, missing scores and regions", () => {
    const [a, b] = sample().scans;
    b.scores[0].mode = "HD";
    expect(compare(a, b, "moisture").delta).toBeNull();
    b.scores[0].mode = "SD";
    b.scores[0].rawScore = null;
    expect(compare(a, b, "moisture").delta).toBeNull();
    b.scores[0].region = "nose";
    expect(compare(a, b, "moisture").delta).toBeNull();
  });
  it("has honest baseline and capture variation", () => {
    const w = sample();
    expect(compare(w.scans[0], w.scans[0], "moisture").warning).toContain(
      "baseline",
    );
    expect(compare(w.scans[0], w.scans[2], "moisture").warning).toContain(
      "Different light",
    );
  });
  it("sample schema validates; namespaces cannot mix", () => {
    const w = sample();
    expect(WorkspaceSchema.parse(w)).toEqual(w);
    w.scans[0].source = "live";
    expect(() => WorkspaceSchema.parse(w)).toThrow();
  });
  it("sample import validates and refuses forged live import", () => {
    expect(parseImport(JSON.stringify(sample())).scans).toHaveLength(4);
    expect(() =>
      parseImport(JSON.stringify({ ...sample(), namespace: "live" })),
    ).toThrow();
  });
  it("decision evidence references actual scans", () => {
    const w = sample();
    const d = decide("new cream", "moisture", w.scans, w.routines);
    expect(d.outcome).toBe("Wait for another reading");
    expect(d.rules).toEqual(["D03"]);
    expect(d.evidence.every((id) => w.scans.some((s) => s.id === id))).toBe(
      true,
    );
    expect(decide("cream", "moisture", w.scans.slice(0, 1), []).rules).toEqual([
      "D01",
    ]);
  });
  it("measures pixels without skin inference", () => {
    const pixels = new Uint8ClampedArray(8 * 8 * 4).fill(120);
    expect(measure(pixels, 8, 8)).toEqual({ brightness: 120, sharpness: 0 });
  });
});
describe("provider pipeline, no live network", () => {
  it("registers, actually PUTs, creates task once, polls and normalizes", async () => {
    const mock = vi
      .fn()
      .mockResolvedValueOnce(json(file))
      .mockResolvedValueOnce(new Response("", { status: 200 }))
      .mockResolvedValueOnce(json({ data: { task_id: "task/opaque" } }))
      .mockResolvedValueOnce(json(fixture));
    const f = mock as unknown as typeof fetch;
    expect(await start(c, new Uint8Array([1, 2, 3]), "image/jpeg", f)).toBe(
      "task/opaque",
    );
    const body = JSON.parse(mock.mock.calls[2][1].body);
    expect(body).toEqual({
      src_file_id: "opaque-file",
      dst_actions: expect.arrayContaining(["moisture", "acne"]),
      format: "json",
    });
    expect(mock.mock.calls[1][1].method).toBe("PUT");
    expect(mock.mock.calls[1][1].headers.Authorization).toBeUndefined();
    expect(JSON.parse(mock.mock.calls[0][1].body).files[0].file_size).toBe(3);
    expect((await status(c, "task/opaque", f)).state).toBe("success");
    expect(mock.mock.calls[3][0]).toContain("task%2Fopaque");
  });
  it("live defaults off and missing key fails closed", () => {
    vi.stubEnv("YOUCAM_LIVE_ENABLED", "false");
    expect(() => config()).toThrow("LIVE_DISABLED");
    vi.stubEnv("YOUCAM_LIVE_ENABLED", "true");
    vi.stubEnv("YOUCAM_API_KEY", "");
    expect(() => config()).toThrow("KEY_REQUIRED");
  });
  it.each([
    "http://yce-us.s3-accelerate.amazonaws.com/a",
    "https://localhost/a",
    "https://yce-us.s3-accelerate.amazonaws.com.evil/a",
    "https://u:p@yce-us.s3-accelerate.amazonaws.com/a",
    "https://yce-us.s3-accelerate.amazonaws.com:8080/a",
  ])("rejects unsafe upload %s", (u) => {
    expect(() => safeUpload(u, c.uploadHosts)).toThrow("UNSAFE");
  });
  it("rejects missing signed request", async () => {
    await expect(
      upload(
        c,
        new Uint8Array(),
        "image/png",
        vi
          .fn()
          .mockResolvedValue(
            json({ data: { files: [{ file_id: "f", requests: [] }] } }),
          ),
      ),
    ).rejects.toThrow("MALFORMED_UPLOAD");
  });
  it("stops on PUT failure before task creation", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(json(file))
      .mockResolvedValueOnce(new Response("", { status: 500 }));
    await expect(start(c, new Uint8Array(), "image/jpeg", f)).rejects.toThrow(
      "UPLOAD_FAILED",
    );
    expect(f).toHaveBeenCalledTimes(2);
  });
  it.each([
    [401, "PROVIDER_AUTH"],
    [402, "QUOTA_EXHAUSTED"],
    [429, "RATE_LIMITED"],
    [500, "PROVIDER_ERROR"],
  ])("does not retry POST %s", async (code, error) => {
    const f = vi.fn().mockResolvedValue(json({}, Number(code)));
    await expect(request(c, "/task", {}, f)).rejects.toThrow(String(error));
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("distinguishes quota from transient throttle", async () => {
    const f = vi
      .fn()
      .mockResolvedValue(json({ error_code: "InsufficientCredit" }, 429));
    await expect(request(c, "/status", undefined, f)).rejects.toThrow(
      "QUOTA_EXHAUSTED",
    );
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("bounds GET retries with backoff", async () => {
    vi.useFakeTimers();
    const f = vi
      .fn()
      .mockResolvedValueOnce(json({}, 429))
      .mockResolvedValueOnce(json({}, 503))
      .mockResolvedValueOnce(json({ ok: true }));
    const p = request(c, "/status", undefined, f);
    await vi.runAllTimersAsync();
    expect(await p).toEqual({ ok: true });
    expect(f).toHaveBeenCalledTimes(3);
  });
  it("handles timeout and malformed JSON safely", async () => {
    await expect(
      request(
        c,
        "/task",
        {},
        vi.fn().mockRejectedValue(new Error("private secret")),
      ),
    ).rejects.toThrow("PROVIDER_TIMEOUT");
    await expect(
      request(
        c,
        "/status",
        undefined,
        vi.fn().mockResolvedValue(new Response("not json")),
      ),
    ).rejects.toThrow("MALFORMED_RESPONSE");
  });
  it.each(["future", "error"])(
    "terminal or unknown state %s fails",
    async (state) => {
      await expect(
        status(
          c,
          "t",
          vi.fn().mockResolvedValue(json({ data: { task_status: state } })),
        ),
      ).rejects.toThrow();
    },
  );
  it("running stays running", async () => {
    expect(
      await status(
        c,
        "t",
        vi.fn().mockResolvedValue(json({ data: { task_status: "running" } })),
      ),
    ).toEqual({ state: "running" });
  });
  it("validates image bytes, dimensions and decode", async () => {
    const b = await sharp({
      create: { width: 600, height: 800, channels: 3, background: "#888888" },
    })
      .jpeg()
      .toBuffer();
    expect(await validateImage(b, "image/jpeg")).toEqual({
      width: 600,
      height: 800,
    });
    await expect(validateImage(b, "image/png")).rejects.toThrow("IMAGE_TYPE");
    await expect(
      validateImage(new Uint8Array(3500001), "image/jpeg"),
    ).rejects.toThrow("IMAGE_SIZE");
    const small = await sharp({
      create: { width: 200, height: 200, channels: 3, background: "#888" },
    })
      .png()
      .toBuffer();
    await expect(validateImage(small, "image/png")).rejects.toThrow(
      "DIMENSIONS",
    );
    const corrupt = new Uint8Array(100);
    corrupt.set([255, 216, 255]);
    await expect(validateImage(corrupt, "image/jpeg")).rejects.toThrow(
      "CORRUPT",
    );
  });
  it("scopes expiring tokens; prevents tampering and wrong reviewer", () => {
    vi.stubEnv("TASK_TOKEN_SECRET", "s".repeat(32));
    vi.stubEnv("REVIEWER_ACCESS_CODE", "r".repeat(32));
    const p = {
      task: "opaque",
      expires: Date.now() + 1000,
      capture: sample().scans[0].capture,
      capturedAt: new Date().toISOString(),
      consentAt: new Date().toISOString(),
    };
    const t = token(p);
    expect(verify(t).task).toBe("opaque");
    expect(() => verify(t + "x")).toThrow();
    expect(() => verify(token({ ...p, expires: 0 }))).toThrow();
    expect(() => guard(new Request("https://app.test/api"))).toThrow(
      "ACCESS_REQUIRED",
    );
    expect(() =>
      guard(
        new Request("https://app.test/api", {
          headers: {
            "x-reviewer-code": "r".repeat(32),
            origin: "https://evil.test",
          },
        }),
      ),
    ).toThrow("ORIGIN_REJECTED");
  });
});

describe("additional integrity boundaries", () => {
  it("ignores future metric shapes without breaking known scores", () => {
    const f = {
      data: {
        results: {
          output: [
            { type: "future_metric", raw_score: { nested: "future" } },
            { type: "texture", raw_score: 42 },
          ],
        },
      },
    };
    expect(normalize(f)).toHaveLength(1);
  });
  it("rejects reversed chronology and different actions", () => {
    const [a, b] = sample().scans;
    expect(compare(b, a, "moisture").comparable).toBe(false);
    b.scores[0].providerAction = "hd_moisture";
    expect(compare(a, b, "moisture").comparable).toBe(false);
  });
  it("requires explicit schema migration and exercises explainable decisions", () => {
    expect(() =>
      WorkspaceSchema.parse({ ...sample(), schemaVersion: 2 }),
    ).toThrow();
    const w = sample();
    const scans = [w.scans[0], w.scans[3]];
    expect(decide("q", "moisture", scans, w.routines).rules).toEqual(["D04"]);
    expect(decide("q", "moisture", scans, []).rules).toEqual(["D05"]);
    scans[1].apiVersion = "2.0";
    expect(decide("q", "moisture", scans, []).rules).toEqual(["D02"]);
  });
});

describe("Phase 2 documented edge cases", () => {
  it("accepts numeric Content-Length from official File API schema and forwards normalized headers", async () => {
    const response = structuredClone(file) as {
      data: {
        files: {
          file_id: string;
          requests: {
            method: string;
            url: string;
            headers: Record<string, string | number>;
          }[];
        }[];
      };
    };
    response.data.files[0].requests[0].headers["Content-Length"] = 3;
    const f = vi
      .fn()
      .mockResolvedValueOnce(json(response))
      .mockResolvedValueOnce(new Response("", { status: 200 }));
    expect(await upload(c, new Uint8Array([1, 2, 3]), "image/jpeg", f)).toBe(
      "opaque-file",
    );
    expect(f.mock.calls[1][1].headers["Content-Length"]).toBe("3");
  });
  it("reports invalid completed provider data as upstream error, not invalid user input", async () => {
    await expect(
      status(
        c,
        "task",
        vi.fn().mockResolvedValue(
          json({
            data: {
              task_status: "success",
              results: {
                output: [{ type: "moisture", raw_score: "corrupt" }],
              },
            },
          }),
        ),
      ),
    ).rejects.toMatchObject({ code: "MALFORMED_RESULT", status: 502 });
  });
  it("preserves decision goal in export schema while accepting existing v1 records without goal", () => {
    const w = sample();
    const d = decide("Fictional purchase", "texture", w.scans, w.routines);
    expect(d.goal).toBe("texture");
    w.decisions = [
      { ...d, id: "decision", timestamp: new Date().toISOString() },
    ];
    expect(WorkspaceSchema.parse(w).decisions[0].goal).toBe("texture");
    delete w.decisions[0].goal;
    expect(WorkspaceSchema.parse(w).decisions).toHaveLength(1);
  });
});

it("does not compare synthetic and real-image provenance as a personal trend", () => {
  const [a, b] = sample().scans;
  a.source = "live";
  b.source = "live";
  a.imageProvenance = "real_person_image";
  b.imageProvenance = "synthetic_test_image";
  expect(compare(a, b, "moisture").comparable).toBe(false);
});
