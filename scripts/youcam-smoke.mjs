// Intentionally not an autonomous credit-consuming test.
if (!process.argv.includes("--live")) {
  console.log(
    "SAFE: no network request made. Live smoke requires --live, owner approval, configured server and a consenting adult image. See docs/YOUCAM_INTEGRATION.md.",
  );
  process.exit(0);
}
if (
  process.env.YOUCAM_SMOKE_APPROVED !== "true" ||
  !process.env.YOUCAM_API_KEY ||
  !process.env.REVIEWER_ACCESS_CODE ||
  !process.env.SMOKE_IMAGE
) {
  console.error(
    "BLOCKED: set YOUCAM_SMOKE_APPROVED=true, YOUCAM_API_KEY, REVIEWER_ACCESS_CODE, SMOKE_IMAGE and run the configured local server. Credit approval must be obtained first.",
  );
  process.exit(1);
}
const { readFile } = await import("node:fs/promises");
const bytes = await readFile(process.env.SMOKE_IMAGE);
const origin = process.env.SMOKE_ORIGIN || "http://localhost:3000";
if (origin !== "http://localhost:3000")
  throw Error("Smoke is restricted to localhost.");
// Capture header must be derived from the actual local image; never fabricate quality values.
if (!process.env.SMOKE_CAPTURE)
  throw Error(
    "SMOKE_CAPTURE must contain actual measured image capture JSON. Prefer guided browser flow.",
  );
const r = await fetch(origin + "/api/scan/start", {
  method: "POST",
  headers: {
    "Content-Type": process.env.SMOKE_MIME || "image/jpeg",
    "x-reviewer-code": process.env.REVIEWER_ACCESS_CODE,
    "x-consent": "perfectcorp-v1-adult",
    "x-capture": process.env.SMOKE_CAPTURE,
  },
  body: bytes,
});
const data = await r.json();
if (!r.ok) throw Error(data.error);
for (let i = 0; i < 15; i++) {
  await new Promise((r) => setTimeout(r, 10000));
  const res = await fetch(origin + "/api/scan/status", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-reviewer-code": process.env.REVIEWER_ACCESS_CODE,
    },
    body: JSON.stringify({ token: data.token }),
  });
  const result = await res.json();
  if (!res.ok) throw Error(result.error);
  if (result.state === "success") {
    console.log(
      "LIVE VERIFIED: completed V2.1 task; score count:",
      result.scan.scores.length,
    );
    process.exit(0);
  }
}
throw Error("Timed out. Do not auto-resubmit.");
