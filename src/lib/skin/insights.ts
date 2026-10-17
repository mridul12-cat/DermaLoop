import type { Decision, SkinScan, Routine } from "../models";
import { compare } from "./compare";
export function decide(
  question: string,
  goal: string,
  scans: SkinScan[],
  routines: Routine[],
): Omit<Decision, "id" | "timestamp"> {
  const ordered = [...scans].sort((a, b) =>
    a.capturedAt.localeCompare(b.capturedAt),
  );
  const a = ordered.at(-2),
    b = ordered.at(-1);
  const evidence = ordered.slice(-2).map((s) => s.id);
  const result = compare(a, b, goal);
  let outcome: Decision["outcome"] = "Not enough evidence",
    rule = "D01",
    explanation =
      "Fewer than two readings: a baseline cannot establish a trend or justify a purchase.";
  if (a && b) {
    if (!result.comparable) {
      rule = "D02";
      explanation = "The selected goal has no compatible pair of raw readings.";
    } else if (result.warning.startsWith("Different")) {
      outcome = "Wait for another reading";
      rule = "D03";
      explanation =
        "Capture conditions differ. Repeat under similar lighting before interpreting change.";
    } else if (routines.length) {
      outcome = "Wait for another reading";
      rule = "D04";
      explanation =
        "A routine change is recorded. Keep observing before adding another variable; this is not a causal test.";
    } else {
      outcome = "Worth exploring";
      rule = "D05";
      explanation =
        "Two comparable readings are available and no routine change is recorded. Research ingredients, cost and suitability; these scores do not establish that a product will work.";
    }
  }
  return {
    question,
    goal: goal as NonNullable<Decision["goal"]>,
    outcome,
    evidence,
    rules: [rule],
    explanation,
    disclaimer:
      "Not medical advice. No product efficacy or diagnosis can be inferred from these readings.",
  };
}
