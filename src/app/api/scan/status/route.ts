import { PUBLIC_PROVIDER_ACCESS } from "@/lib/public-demo";
import { config } from "@/lib/youcam/client";
import { status, actions } from "@/lib/youcam/skin";
import { guard, verify, errorResponse } from "@/lib/youcam/security";
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
    const body = await req.text();
    if (body.length > 10000) throw new Error();
    const p = verify(JSON.parse(body).token);
    const result = await status(config(), p.task);
    return Response.json(
      result.state === "success"
        ? {
            state: "success",
            scan: {
              id: p.task,
              capturedAt: p.capturedAt,
              provider: "youcam",
              apiVersion: "2.1",
              engineVersion: "2.1-SD-unpinned",
              source: "live",
              requestedActions: actions,
              capture: p.capture,
              scores: result.scores,
              consent: { version: "1", acceptedAt: p.consentAt },
            },
          }
        : result,
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
