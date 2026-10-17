import { PUBLIC_PROVIDER_ACCESS } from "@/lib/public-demo";
import { config, ProviderError } from "@/lib/youcam/client";
import { start } from "@/lib/youcam/skin";
import { guard, token, errorResponse } from "@/lib/youcam/security";
import { validateImage } from "@/lib/youcam/image";
import { CaptureSchema } from "@/lib/models";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(req: Request) {
  if (!PUBLIC_PROVIDER_ACCESS)
    return Response.json(
      { error: "PUBLIC_SCANNING_DISABLED" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  try {
    guard(req);
    const c = config();
    if (!req.headers.get("content-type")?.startsWith("image/"))
      throw new ProviderError("IMAGE_TYPE", 415);
    if (req.headers.get("x-consent") !== "perfectcorp-v1-adult")
      throw new ProviderError("CONSENT_REQUIRED", 400);
    const reader = req.body?.getReader();
    if (!reader) throw new ProviderError("IMAGE_REQUIRED", 400);
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > 3500000) {
        await reader.cancel();
        throw new ProviderError("IMAGE_SIZE", 413);
      }
      chunks.push(value);
    }
    const bytes = Buffer.concat(chunks);
    const dimensions = await validateImage(
      bytes,
      req.headers.get("content-type")!,
    );
    const capture = CaptureSchema.parse(
      JSON.parse(req.headers.get("x-capture") || "{}"),
    );
    if (
      capture.width !== dimensions.width ||
      capture.height !== dimensions.height
    )
      throw new ProviderError("CAPTURE_DIMENSIONS", 400);
    const capturedAt = new Date().toISOString();
    const task = await start(c, bytes, req.headers.get("content-type")!);
    return Response.json(
      {
        token: token({
          task,
          expires: Date.now() + 180000,
          capture,
          capturedAt,
          consentAt: capturedAt,
        }),
        state: "running",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
