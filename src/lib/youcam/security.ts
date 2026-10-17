import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { ProviderError } from "./client";
import { z } from "zod";
import { CaptureSchema } from "../models";
export function guard(req: Request) {
  const expected = process.env.REVIEWER_ACCESS_CODE;
  if (
    !expected ||
    expected.length < 32 ||
    !process.env.TASK_TOKEN_SECRET ||
    process.env.TASK_TOKEN_SECRET.length < 32
  )
    throw new ProviderError("REVIEWER_SETUP_REQUIRED", 503);
  const actual = req.headers.get("x-reviewer-code") || "";
  const a = Buffer.from(actual),
    b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b))
    throw new ProviderError("REVIEWER_ACCESS_REQUIRED", 403);
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin)
    throw new ProviderError("ORIGIN_REJECTED", 403);
}
const payload = z.object({
  task: z.string(),
  expires: z.number(),
  capture: CaptureSchema,
  capturedAt: z.string().datetime(),
  consentAt: z.string().datetime(),
});
type Payload = z.infer<typeof payload>;
function sign(s: string) {
  const secret = process.env.TASK_TOKEN_SECRET;
  if (!secret || secret.length < 32)
    throw new ProviderError("REVIEWER_SETUP_REQUIRED", 503);
  return createHmac("sha256", secret).update(s).digest("base64url");
}
export function token(p: Payload) {
  const s = Buffer.from(JSON.stringify(p)).toString("base64url");
  return s + "." + sign(s);
}
export function verify(t: string) {
  try {
    const [s, h, ...extra] = t.split(".");
    if (extra.length || !h) throw 0;
    const expected = Buffer.from(sign(s)),
      actual = Buffer.from(h);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
      throw 0;
    const p = payload.parse(JSON.parse(Buffer.from(s, "base64url").toString()));
    if (p.expires < Date.now()) throw 0;
    return p;
  } catch {
    throw new ProviderError("INVALID_TASK_TOKEN", 403);
  }
}
export function errorResponse(e: unknown) {
  return Response.json(
    { error: e instanceof ProviderError ? e.code : "INVALID_REQUEST" },
    {
      status: e instanceof ProviderError ? e.status : 400,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
