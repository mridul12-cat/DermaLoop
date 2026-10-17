import { start } from "../src/lib/youcam/skin";
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  parseUploadHosts,
  validateUploadUrl,
  DOCUMENTED_UPLOAD_HOSTS,
} from "../src/lib/youcam/upload-policy.mjs";
import { upload, config, type Config } from "../src/lib/youcam/client";
const host = "yce-us.s3-accelerate.amazonaws.com";
afterEach(() => vi.unstubAllEnvs());
describe("documented conservative upload policy", () => {
  it.each([undefined, "", "   "])(
    "uses exactly the documented host when unset/blank (%s)",
    (value) => {
      expect(parseUploadHosts(value)).toEqual([host]);
      expect(DOCUMENTED_UPLOAD_HOSTS).toEqual([host]);
    },
  );
  it("parses reviewed exact overrides and replaces rather than extends the default", () => {
    expect(
      parseUploadHosts(
        " APPROVED.provider-storage.net,approved.provider-storage.net ",
      ),
    ).toEqual(["approved.provider-storage.net"]);
    expect(() =>
      validateUploadUrl(
        `https://${host}/signed`,
        parseUploadHosts("approved.provider-storage.net"),
      ),
    ).toThrow();
  });
  it.each([
    "*",
    "*.amazonaws.com",
    ".amazonaws.com",
    "https://example.org",
    "example.org/path",
    "example.org:443",
    "127.0.0.1",
    "169.254.169.254",
    "[::1]",
    "localhost",
    "foo.local",
    "foo.internal",
    "approved.net,",
    "approved.net,,second.net",
    "evil@approved.net",
    "host..net",
    "approved.net.",
  ])("rejects invalid allowlist entry %s", (value) =>
    expect(() => parseUploadHosts(value)).toThrow(
      "INVALID_UPLOAD_HOST_CONFIGURATION",
    ),
  );
  it.each([
    `http://${host}/signed`,
    `https://${host}.evil.net/signed`,
    `https://evil${host}/signed`,
    "https://another-bucket.s3-accelerate.amazonaws.com/signed",
    "https://127.0.0.1/signed",
    "https://2130706433/signed",
    "https://169.254.169.254/signed",
    "https://[::1]/signed",
    `https://user:pass@${host}/signed`,
    `https://${host}:444/signed`,
    `https://${host}/signed#fragment`,
    ` https://${host}/signed`,
    `https://${host}\\@evil.net/signed`,
    "file:///etc/passwd",
  ])("rejects unsafe or unapproved destination %s", (url) =>
    expect(() => validateUploadUrl(url, [host])).toThrow("UNSAFE_UPLOAD_URL"),
  );
  it("retains signed query and path without requiring an invented signature format", () => {
    const url = `https://${host}/demo/ttl30/opaque%2Fobject?X-Amz-Signature=fixture-only&X-Amz-Credential=a%2Fb`;
    expect(validateUploadUrl(url, [host])).toBe(url);
  });
  it("config and env checker share default semantics while live stays opt-in", () => {
    vi.stubEnv("YOUCAM_LIVE_ENABLED", "false");
    expect(() => config()).toThrow("LIVE_DISABLED");
    vi.stubEnv("YOUCAM_LIVE_ENABLED", "true");
    vi.stubEnv("YOUCAM_API_KEY", "fixture-only");
    vi.stubEnv("YOUCAM_UPLOAD_HOSTS", "");
    expect(config().uploadHosts).toEqual([host]);
    vi.stubEnv("YOUCAM_UPLOAD_HOSTS", "*.amazonaws.com");
    expect(() => config()).toThrow("INVALID_UPLOAD_HOST_CONFIGURATION");
  });
  it("does not PUT or start a task for an unapproved provider-returned host", async () => {
    const mock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            files: [
              {
                file_id: "fixture-only",
                requests: [
                  {
                    method: "PUT",
                    url: "https://unapproved.example.net/signed",
                    headers: {},
                  },
                ],
              },
            ],
          },
        }),
      ),
    );
    const c: Config = {
      key: "fixture-only",
      base: "https://api.fixture.invalid",
      uploadHosts: [host],
    };
    await expect(
      start(c, new Uint8Array([1]), "image/jpeg", mock),
    ).rejects.toThrow("UNSAFE_UPLOAD_URL");
    expect(mock).toHaveBeenCalledTimes(1);
  });
  it("forbids redirects on the approved upload and never attaches provider bearer", async () => {
    const mock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              files: [
                {
                  file_id: "fixture",
                  requests: [
                    {
                      method: "PUT",
                      url: `https://${host}/signed`,
                      headers: { "Content-Type": "image/jpeg" },
                    },
                  ],
                },
              ],
            },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(null, {
          status: 307,
          headers: { location: "https://169.254.169.254/" },
        }),
      );
    await expect(
      upload(
        {
          key: "fixture-only",
          base: "https://api.fixture.invalid",
          uploadHosts: [host],
        },
        new Uint8Array([1]),
        "image/jpeg",
        mock,
      ),
    ).rejects.toThrow("UPLOAD_FAILED");
    expect(mock.mock.calls[1][1].redirect).toBe("error");
    expect(mock.mock.calls[1][1].headers.Authorization).toBeUndefined();
    expect(mock).toHaveBeenCalledTimes(2);
  });
});
