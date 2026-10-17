import { describe, it, expect, vi } from "vitest";
import sharp from "sharp";
import { providerDiagnostics } from "../src/lib/youcam/diagnostics";
import { request, ProviderError, type Config } from "../src/lib/youcam/client";
import {
  status,
  start,
  actions,
  validateActions,
} from "../src/lib/youcam/skin";
import { errorResponse } from "../src/lib/youcam/security";
import { measure } from "../src/lib/skin/photo-quality";
const c: Config = {
  key: "fixture-only",
  base: "https://provider.fixture.invalid",
  uploadHosts: [],
};
const json = (v: unknown, status = 200) =>
  new Response(JSON.stringify(v), { status });
async function failure(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (e) {
    expect(e).toBeInstanceOf(ProviderError);
    return e as ProviderError;
  }
  throw new Error("Expected mock failure");
}
describe("documented provider diagnostics, offline mocks only", () => {
  it.each([
    ["error_no_face", "face_detection"],
    ["error_src_face_too_small", "face_framing"],
    ["error_src_face_out_of_bound", "face_framing"],
    ["error_pose", "pose"],
    ["error_face_parsing", "face_segmentation"],
    ["error_lighting_dark", "lighting"],
    ["error_decode_image", "image_decode"],
    ["error_inference", "provider_processing"],
  ])("preserves terminal %s without provider prose", async (code, category) => {
    const f = vi.fn().mockResolvedValue(
      json({
        status: 200,
        data: {
          task_status: "error",
          error: code,
          error_message:
            "private text fixture https://storage.invalid/signed?secret=fixture",
          task_id: "private-id-fixture",
        },
      }),
    );
    const record = vi.fn();
    const e = await failure(status(c, "fixture-task", f, record));
    expect(e.code).toBe("ANALYSIS_FAILED");
    expect(e.diagnostics).toMatchObject({
      providerCode: code,
      category,
      messagePresent: true,
    });
    expect(record).toHaveBeenCalledWith("error", e.diagnostics);
    expect(JSON.stringify(e)).not.toMatch(
      /private text|storage.invalid|private-id|secret=/,
    );
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("drops unknown tokens, nested objects, descriptions and identifiers", () => {
    const d = providerDiagnostics({
      error_code: "token_private_fixture",
      request_id: "opaque-fixture",
      data: {
        error: { code: "error_no_face", secret: "secret-fixture" },
        error_code: "https://signed.invalid/fixture",
        error_message: "Bearer private-fixture",
        status_description: "private-image-fixture",
        results: { image: "base64-private-fixture" },
      },
    });
    expect(d).toEqual({
      category: "unknown",
      unknownCodePresent: true,
      messagePresent: true,
      malformedDiagnosticFields: true,
      conflictingCodes: false,
    });
    expect(JSON.stringify(d)).not.toMatch(/fixture|Bearer|https|base64/);
  });
  it("does not infer no-face from missing diagnostics", async () => {
    const e = await failure(
      status(
        c,
        "fixture-task",
        vi.fn().mockResolvedValue(json({ data: { task_status: "error" } })),
      ),
    );
    expect(e.diagnostics).toMatchObject({
      category: "unknown",
      unknownCodePresent: false,
      messagePresent: false,
    });
    expect(e.diagnostics?.providerCode).toBeUndefined();
  });
  it("does not infer no-face from an empty result or missing detection list", async () => {
    const e = await failure(
      status(
        c,
        "fixture-task",
        vi
          .fn()
          .mockResolvedValue(
            json({ data: { task_status: "success", results: { output: [] } } }),
          ),
      ),
    );
    expect(e.code).toBe("MALFORMED_RESULT");
    expect(e.diagnostics?.providerCode).toBeUndefined();
  });
  it.each([
    null,
    [],
    { data: null },
    { data: [] },
    { data: { task_status: "future-state" } },
    { data: { task_status: 1 } },
  ])("rejects malformed/unknown status envelope %#", async (body) => {
    const f = vi.fn().mockResolvedValue(json(body));
    const e = await failure(status(c, "fixture-task", f));
    expect(e.code).toBe("UNKNOWN_TASK_STATUS");
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("preserves an unambiguous known code but flags conflicting known codes", () => {
    expect(
      providerDiagnostics({
        error_code: "InvalidParameters",
        data: { error: "error_no_face" },
      }),
    ).toMatchObject({ category: "unknown", conflictingCodes: true });
    expect(
      providerDiagnostics({
        data: { error: "error_no_face" },
        error_code: "error_no_face",
      }).providerCode,
    ).toBe("error_no_face");
  });
  it("never treats inherited properties as approved provider codes", () => {
    expect(
      providerDiagnostics({ data: { error: "constructor" } }),
    ).toMatchObject({ category: "unknown", unknownCodePresent: true });
  });
  it("tolerates malformed diagnostic fields without hiding terminal error", async () => {
    const e = await failure(
      status(
        c,
        "fixture-task",
        vi.fn().mockResolvedValue(
          json({
            data: {
              task_status: "error",
              error: "error_no_face",
              error_message: { unsafe: "fixture" },
            },
          }),
        ),
      ),
    );
    expect(e.diagnostics).toMatchObject({
      providerCode: "error_no_face",
      malformedDiagnosticFields: true,
      messagePresent: false,
    });
  });
  it("retains only documented InvalidParameters on unsupported-action HTTP rejection, with no POST retry", async () => {
    const f = vi.fn().mockResolvedValue(
      json(
        {
          status: 400,
          error_code: "InvalidParameters",
          error: "Not available dst_action private_fixture",
        },
        400,
      ),
    );
    const e = await failure(
      request(
        c,
        "/s2s/v2.1/task/skin-analysis",
        { dst_actions: ["unsupported_fixture"] },
        f,
      ),
    );
    expect(e.code).toBe("PROVIDER_ERROR");
    expect(e.diagnostics).toMatchObject({
      providerCode: "InvalidParameters",
      category: "request_parameters",
    });
    expect(JSON.stringify(e)).not.toContain("private_fixture");
    expect(f).toHaveBeenCalledTimes(1);
  });
  it.each([
    { selection: [] },
    { selection: ["pores"] },
    { selection: ["hd_pore"] },
    { selection: ["pore", "pore"] },
  ])(
    "rejects unsupported app action selections before provider work %#",
    ({ selection }) => {
      expect(() => validateActions(selection)).toThrow("UNSUPPORTED_ACTIONS");
    },
  );
  it("fails before upload if internal app actions are corrupted", async () => {
    const f = vi.fn();
    const old = actions[0];
    try {
      actions[0] = "unsupported-fixture" as typeof old;
      await expect(start(c, new Uint8Array(), "image/jpeg", f)).rejects.toThrow(
        "UNSUPPORTED_ACTIONS",
      );
      expect(f).not.toHaveBeenCalled();
    } finally {
      actions[0] = old;
    }
  });
  it("accepts the authorized four-action SD selection", () => {
    expect(() =>
      validateActions(["acne", "pore", "texture", "redness"]),
    ).not.toThrow();
  });
  it("keeps public errors stable while private diagnostics remain available", async () => {
    const d = providerDiagnostics({ data: { error: "error_no_face" } });
    const response = errorResponse(
      new ProviderError("ANALYSIS_FAILED", 422, d),
    );
    expect(await response.json()).toEqual({ error: "ANALYSIS_FAILED" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
it("edge proxy responds to blur in a controlled pattern without defining a face-quality threshold", async () => {
  const width = 160,
    height = 160;
  const pixels = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const v = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 ? 220 : 30;
      pixels.fill(v, (y * width + x) * 3, (y * width + x) * 3 + 3);
    }
  const original = sharp(pixels, { raw: { width, height, channels: 3 } });
  const bytes = await original.clone().ensureAlpha().raw().toBuffer();
  const blurred = await original.clone().blur(2).ensureAlpha().raw().toBuffer();
  const before = measure(new Uint8ClampedArray(bytes), width, height);
  const after = measure(new Uint8ClampedArray(blurred), width, height);
  expect(after.sharpness).toBeLessThan(before.sharpness);
  // This is a non-face checkerboard: a large proxy value cannot prove face presence.
});
