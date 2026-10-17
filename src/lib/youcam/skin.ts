import "server-only";
import { z } from "zod";
import { metrics } from "../models";
import { request, ProviderError, type Config, upload } from "./client";
import { normalize } from "./normalize";
import { providerDiagnostics, type ProviderDiagnostics } from "./diagnostics";
export const actions = [...metrics];
export function validateActions(input: readonly string[]) {
  if (
    !input.length ||
    input.length > metrics.length ||
    new Set(input).size !== input.length ||
    input.some(
      (action) => !metrics.includes(action as (typeof metrics)[number]),
    )
  )
    throw new ProviderError("UNSUPPORTED_ACTIONS", 400);
}
export async function start(
  c: Config,
  bytes: Uint8Array,
  mime: string,
  fetcher: typeof fetch = fetch,
) {
  validateActions(actions);
  c = { ...c, signal: AbortSignal.timeout(55000) };
  const id = await upload(c, bytes, mime, fetcher);
  const raw = await request(
    c,
    "/s2s/v2.1/task/skin-analysis",
    { src_file_id: id, dst_actions: actions, format: "json" },
    fetcher,
  );
  const p = z
    .object({ data: z.object({ task_id: z.string().min(1) }) })
    .safeParse(raw);
  if (!p.success) throw new ProviderError("MALFORMED_TASK_RESPONSE");
  return p.data.data.task_id;
}
export async function status(
  c: Config,
  id: string,
  fetcher: typeof fetch = fetch,
  recordState?: (
    state: "running" | "pending" | "success" | "error",
    diagnostics?: ProviderDiagnostics,
  ) => void,
) {
  const raw = await request(
    {
      ...c,
      signal: AbortSignal.any([
        AbortSignal.timeout(45000),
        ...(c.signal ? [c.signal] : []),
      ]),
    },
    `/s2s/v2.1/task/skin-analysis/${encodeURIComponent(id)}`,
    undefined,
    fetcher,
  );
  const p = z
    .object({
      data: z.object({
        task_status: z.enum(["running", "pending", "success", "error"]),
      }),
    })
    .safeParse(raw);
  if (!p.success)
    throw new ProviderError(
      "UNKNOWN_TASK_STATUS",
      502,
      providerDiagnostics(raw),
    );
  if (p.data.data.task_status === "error") {
    const diagnostics = providerDiagnostics(raw);
    recordState?.("error", diagnostics);
    throw new ProviderError("ANALYSIS_FAILED", 422, diagnostics);
  }
  recordState?.(p.data.data.task_status);
  return p.data.data.task_status === "success"
    ? { state: "success" as const, scores: normalizeResult(raw) }
    : { state: "running" as const };
}

function normalizeResult(raw: unknown) {
  try {
    return normalize(raw);
  } catch {
    throw new ProviderError("MALFORMED_RESULT", 502);
  }
}
