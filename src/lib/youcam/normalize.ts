import { z } from "zod";
import { metrics, type ConcernScore } from "../models";
const row = z.object({
  type: z.string(),
  raw_score: z.number().finite().min(0).max(100).nullable().optional(),
  ui_score: z.number().finite().min(0).max(100).optional(),
  region: z.string().optional(),
});
// Only the selected JSON output adapter. ZIP, v2.0 and nested HD archives are deliberately unsupported.
export function normalize(input: unknown): ConcernScore[] {
  const body = z
    .object({
      data: z.object({ results: z.object({ output: z.array(z.unknown()) }) }),
    })
    .parse(input);
  const scores: ConcernScore[] = [];
  for (const value of body.data.results.output) {
    const key = z.object({ type: z.string() }).safeParse(value);
    if (
      key.success &&
      !metrics.includes(key.data.type as (typeof metrics)[number])
    )
      continue;
    const p = row.safeParse(value);
    if (!p.success) throw new Error("Malformed provider score");
    const r = p.data;
    if (!metrics.includes(r.type as (typeof metrics)[number])) continue;
    scores.push({
      metricKey: r.type as (typeof metrics)[number],
      providerAction: r.type,
      region: r.region ?? "whole",
      rawScore: r.raw_score ?? null,
      uiScore: r.ui_score,
      mode: "SD",
      unit: "provider_raw_0_100",
      ...(r.raw_score == null
        ? { missingReason: "Provider omitted raw score" }
        : {}),
    });
  }
  if (!scores.length) throw new Error("No supported scores in response");
  if (
    new Set(scores.map((s) => `${s.metricKey}:${s.region}`)).size !==
    scores.length
  )
    throw new Error("Duplicate scores");
  return scores;
}
