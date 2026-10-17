import { z } from "zod";
import { ScanSchema } from "./models";
const concerns = ["acne", "pore", "texture", "redness"] as const;
export const VerificationSchema = z
  .object({
    sourceLabel: z.literal("Live YouCam API — Synthetic Test Image"),
    provider: z.literal("Perfect Corp YouCam Skin Analysis V2.1"),
    capturedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    metrics: z
      .array(
        z
          .object({
            action: z.enum(concerns),
            raw: z.number().finite().min(0).max(100),
            ui: z.number().finite().min(0).max(100),
          })
          .strict(),
      )
      .length(4)
      .refine((rows) => new Set(rows.map((r) => r.action)).size === 4),
  })
  .strict();
// Explicit allowlist projection. Never spread a private provider record into public data.
export function projectVerifiedBaseline(input: unknown) {
  const scan = ScanSchema.parse(input);
  if (
    scan.source !== "live" ||
    scan.provider !== "youcam" ||
    scan.apiVersion !== "2.1" ||
    scan.imageProvenance !== "synthetic_test_image" ||
    scan.sourceLabel !== "Live YouCam API — Synthetic Test Image"
  )
    throw new Error("Verified synthetic baseline required");
  return VerificationSchema.parse({
    sourceLabel: scan.sourceLabel,
    provider: "Perfect Corp YouCam Skin Analysis V2.1",
    capturedDate: scan.capturedAt.slice(0, 10),
    metrics: concerns.map((action) => {
      const row = scan.scores.find(
        (score) =>
          score.providerAction === action &&
          score.region === "whole" &&
          score.mode === "SD",
      );
      if (!row || row.rawScore === null || row.uiScore === undefined)
        throw new Error("Actual raw and UI scores required");
      return { action, raw: row.rawScore, ui: row.uiScore };
    }),
  });
}
