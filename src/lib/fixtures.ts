import { metrics, type Workspace, type SkinScan } from "./models";
export function sample(): Workspace {
  const values = [
    [62, 68, 73, 66, 69, 71, 78],
    [65, 70, 72, 68, 68, 72, 77],
    [61, 67, 74, 65, 70, 70, 79],
    [66, 71, 73, 69, 69, 73, 78],
  ];
  const scans: SkinScan[] = values.map((v, i) => ({
    id: `sample-${i + 1}`,
    capturedAt: `2026-10-${["01", "05", "09", "15"][i]}T08:00:00.000Z`,
    provider: "youcam",
    apiVersion: "2.1",
    engineVersion: "2.1-SD-illustrative",
    source: "demo_fixture",
    requestedActions: [...metrics],
    capture: {
      brightness: [132, 137, 183, 138][i],
      sharpness: [54, 52, 29, 53][i],
      width: 1200,
      height: 1600,
      frontView: true,
    },
    scores: metrics.map((m, j) => ({
      metricKey: m,
      providerAction: m,
      region: "whole",
      rawScore: v[j],
      uiScore: Math.min(v[j] + 7, 100),
      unit: "provider_raw_0_100",
      mode: "SD",
    })),
  }));
  return {
    schemaVersion: 1,
    namespace: "demo_fixture",
    scans,
    routines: [
      {
        id: "sample-routine",
        label: "A simpler evening routine",
        category: "Simplify",
        products: [
          "Fictional gentle cleanser",
          "Fictional fragrance-free moisturizer",
        ],
        startDate: "2026-10-05",
        checkpoint: "2026-10-22",
        startScan: "sample-2",
        notes:
          "Illustrative journal: keeping everything else consistent where possible.",
        observations: [
          {
            date: "2026-10-09",
            note: "Photographed by a brighter window. No conclusions from this reading.",
          },
        ],
      },
    ],
    decisions: [],
  };
}
