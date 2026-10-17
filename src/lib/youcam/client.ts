import "server-only";
import { z } from "zod";
import { providerDiagnostics, type ProviderDiagnostics } from "./diagnostics";
import { parseUploadHosts, validateUploadUrl } from "./upload-policy.mjs";
export class ProviderError extends Error {
  constructor(
    public code: string,
    public status = 502,
    public diagnostics?: ProviderDiagnostics,
  ) {
    super(code);
  }
}
export type Config = {
  key: string;
  base: string;
  uploadHosts: string[];
  signal?: AbortSignal;
};
export function config(): Config {
  if (process.env.YOUCAM_LIVE_ENABLED !== "true")
    throw new ProviderError("LIVE_DISABLED", 403);
  if (!process.env.YOUCAM_API_KEY) throw new ProviderError("KEY_REQUIRED", 503);
  const base = process.env.YOUCAM_BASE_URL || "https://yce-api-01.makeupar.com";
  const url = new URL(base);
  if (url.protocol !== "https:" || url.username || url.password)
    throw new ProviderError("INVALID_CONFIGURATION", 503);
  let uploadHosts: string[];
  try {
    uploadHosts = parseUploadHosts(process.env.YOUCAM_UPLOAD_HOSTS);
  } catch {
    throw new ProviderError("INVALID_UPLOAD_HOST_CONFIGURATION", 503);
  }
  return {
    key: process.env.YOUCAM_API_KEY,
    base: url.origin,
    uploadHosts,
  };
}
export const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
export async function request(
  c: Config,
  path: string,
  body?: unknown,
  fetcher: typeof fetch = fetch,
) {
  for (let attempt = 0; attempt < 3; attempt++) {
    let r: Response;
    try {
      r = await fetcher(c.base + path, {
        method: body ? "POST" : "GET",
        headers: {
          Authorization: `Bearer ${c.key}`,
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.any([
          AbortSignal.timeout(20000),
          ...(c.signal ? [c.signal] : []),
        ]),
        redirect: "error",
        cache: "no-store",
      });
    } catch {
      throw new ProviderError("PROVIDER_TIMEOUT");
    }
    if (r.ok) {
      try {
        return await r.json();
      } catch {
        throw new ProviderError("MALFORMED_RESPONSE");
      }
    }
    let code = "";
    let diagnostics: ProviderDiagnostics | undefined;
    try {
      const e: unknown = await r.json();
      diagnostics = providerDiagnostics(e);
      if (e && typeof e === "object" && !Array.isArray(e)) {
        const fields = e as Record<string, unknown>;
        code =
          typeof fields.error_code === "string"
            ? fields.error_code
            : typeof fields.error === "string"
              ? fields.error
              : "";
      }
    } catch {
      /* Non-JSON errors are mapped to a safe code below. */
    }
    if (r.status === 401 || r.status === 403)
      throw new ProviderError("PROVIDER_AUTH", 503, diagnostics);
    if (r.status === 402 || /quota|credit|insufficient.*unit/i.test(code))
      throw new ProviderError("QUOTA_EXHAUSTED", 409, diagnostics);
    if (!body && (r.status === 429 || r.status >= 500) && attempt < 2) {
      await delay(500 * 2 ** attempt);
      continue;
    }
    throw new ProviderError(
      r.status === 429 ? "RATE_LIMITED" : "PROVIDER_ERROR",
      r.status === 429 ? 429 : 502,
      diagnostics,
    );
  }
  throw new ProviderError("PROVIDER_ERROR");
}
const fileResponse = z.object({
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
                  z
                    .union([z.string(), z.number().finite().nonnegative()])
                    .transform((v) => String(v)),
                ),
              }),
            )
            .min(1),
        }),
      )
      .length(1),
  }),
});
export function safeUpload(url: string, hosts: string[]) {
  try {
    return validateUploadUrl(url, hosts);
  } catch {
    throw new ProviderError("UNSAFE_UPLOAD_URL");
  }
}
export async function upload(
  c: Config,
  bytes: Uint8Array,
  mime: string,
  fetcher: typeof fetch = fetch,
) {
  const raw = await request(
    c,
    "/s2s/v2.0/file",
    {
      files: [
        {
          content_type: mime,
          file_name: mime === "image/png" ? "capture.png" : "capture.jpg",
          file_size: bytes.length,
        },
      ],
    },
    fetcher,
  );
  const parsed = fileResponse.safeParse(raw);
  if (!parsed.success) throw new ProviderError("MALFORMED_UPLOAD_RESPONSE");
  const f = parsed.data.data.files[0];
  if (f.requests.length !== 1)
    throw new ProviderError("UNSUPPORTED_UPLOAD_PARTS");
  const req = f.requests[0];
  const url = safeUpload(req.url, c.uploadHosts);
  // The API key is never sent to the storage host; redirects are forbidden.
  let result: Response;
  try {
    result = await fetcher(url, {
      method: req.method,
      headers: req.headers,
      body: bytes as BodyInit,
      redirect: "error",
      signal: AbortSignal.any([
        AbortSignal.timeout(30000),
        ...(c.signal ? [c.signal] : []),
      ]),
    });
  } catch {
    throw new ProviderError("UPLOAD_FAILED");
  }
  if (!result.ok) throw new ProviderError("UPLOAD_FAILED");
  return f.file_id;
}
