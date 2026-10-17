import type { SkinScan } from "../models";
export function compare(
  a: SkinScan | undefined,
  b: SkinScan | undefined,
  metric: string,
) {
  if (!a || !b || a.id === b.id)
    return {
      delta: null,
      warning: "Your baseline is ready. Return later to see a trend.",
      comparable: false,
    };
  if (a.capturedAt >= b.capturedAt)
    return {
      delta: null,
      warning: "Choose two distinct readings in chronological order.",
      comparable: false,
    };
  const x = a.scores.find(
      (s) => s.metricKey === metric && s.region === "whole",
    ),
    y = b.scores.find((s) => s.metricKey === metric && s.region === "whole");
  if (
    a.source !== b.source ||
    a.imageProvenance !== b.imageProvenance ||
    a.provider !== b.provider ||
    a.apiVersion !== b.apiVersion ||
    a.engineVersion !== b.engineVersion ||
    !x ||
    !y ||
    x.mode !== y.mode ||
    x.providerAction !== y.providerAction ||
    x.region !== y.region ||
    x.unit !== y.unit ||
    x.rawScore === null ||
    y.rawScore === null
  )
    return {
      delta: null,
      warning:
        "Not directly comparable: source, model, region or raw score differs.",
      comparable: false,
    };
  const light = Math.abs(a.capture.brightness - b.capture.brightness) > 25;
  const blur = Math.min(a.capture.sharpness, b.capture.sharpness) < 35;
  const pose = !a.capture.frontView || !b.capture.frontView;
  return {
    delta: Math.round((y.rawScore - x.rawScore) * 100) / 100,
    comparable: true,
    warning:
      light || blur || pose
        ? "Different light, different story. Capture conditions vary; recheck under similar lighting."
        : "Capture measurements are similar. A photo alone cannot tell us why a score changed.",
  };
}
