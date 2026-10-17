import { z } from "zod";
export const metrics = [
  "moisture",
  "texture",
  "pore",
  "redness",
  "oiliness",
  "radiance",
  "acne",
] as const;
export const CaptureSchema = z.object({
  brightness: z.number().min(0).max(255),
  sharpness: z.number().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  frontView: z.boolean(),
});
export const ScoreSchema = z.object({
  metricKey: z.enum(metrics),
  providerAction: z.string(),
  region: z.string(),
  rawScore: z.number().finite().min(0).max(100).nullable(),
  uiScore: z.number().finite().min(0).max(100).optional(),
  unit: z.literal("provider_raw_0_100"),
  mode: z.enum(["SD", "HD"]),
  missingReason: z.string().optional(),
});
export const ScanSchema = z.object({
  id: z.string(),
  capturedAt: z.string().datetime(),
  provider: z.literal("youcam"),
  apiVersion: z.string(),
  engineVersion: z.string(),
  source: z.enum(["live", "demo_fixture"]),
  imageProvenance: z
    .enum(["real_person_image", "synthetic_test_image"])
    .optional(),
  sourceLabel: z.literal("Live YouCam API — Synthetic Test Image").optional(),
  requestedActions: z.array(z.string()),
  capture: CaptureSchema,
  scores: z.array(ScoreSchema),
  consent: z
    .object({
      version: z.literal("1"),
      acceptedAt: z.string().datetime(),
      kind: z
        .enum(["adult_owner_consent", "synthetic_test_authorization"])
        .optional(),
    })
    .optional(),
});
export type SkinScan = z.infer<typeof ScanSchema>;
export type CaptureConditions = z.infer<typeof CaptureSchema>;
export type ConcernScore = z.infer<typeof ScoreSchema>;
export const RoutineSchema = z.object({
  id: z.string(),
  label: z.string().min(1).max(160),
  category: z.string(),
  products: z.array(z.string()),
  startDate: z.string(),
  checkpoint: z.string(),
  startScan: z.string().optional(),
  notes: z.string().max(2000),
  observations: z.array(
    z.object({ date: z.string(), note: z.string().max(2000) }),
  ),
});
export type Routine = z.infer<typeof RoutineSchema>;
export const DecisionSchema = z.object({
  goal: z.enum(metrics).optional(),
  id: z.string(),
  question: z.string(),
  outcome: z.enum([
    "Worth exploring",
    "Wait for another reading",
    "Not enough evidence",
  ]),
  evidence: z.array(z.string()),
  rules: z.array(z.string()),
  explanation: z.string(),
  disclaimer: z.string(),
  timestamp: z.string(),
});
export type Decision = z.infer<typeof DecisionSchema>;
export const WorkspaceSchema = z
  .object({
    schemaVersion: z.literal(1),
    namespace: z.enum(["demo_fixture", "live"]),
    scans: z.array(ScanSchema),
    routines: z.array(RoutineSchema),
    decisions: z.array(DecisionSchema),
  })
  .superRefine((w, c) => {
    if (w.scans.some((s) => s.source !== w.namespace))
      c.addIssue({
        code: "custom",
        message: "Mixed sample and live data rejected",
      });
  });
export type Workspace = z.infer<typeof WorkspaceSchema>;
