> Historical preparation record. A later separately authorized Phase3F attempt succeeded. See [actual execution results](PHASE3F_RESULT.md). The Phase3F attempt is now consumed; do not rerun it.

# Phase 3F — second controlled test prepared, not authorized or executed

17 October 2026. **Only offline checks were performed.** The user explicitly requires a new authorization before the second attempt. The previous Phase3C authorization is exhausted; its durable marker and evidence remain unchanged. No Phase3F authorization, execution marker or baseline has been created.

## Reviewed artifact binding

The selected artifact is the separately saved Phase3E cropped synthetic JPEG:680×850,550,743 bytes, sRGB, no metadata, estimated visible face width66–72% (central estimate69%). It passed the existing decoder/dimension/size validator and the new exact-format checks. Phase3E visual review retained the forehead, chin, both eyes and facial outline. That review is not provider face-detection approval.

The earlier Phase3E report did not record an output hash. During this preparation the crop was reproduced from the unchanged original with the exact Phase3E rectangle/encoding, and its bytes matched the saved reviewed JPEG exactly. Its SHA-256 is now recorded and pinned in the Phase3F runner:

```text
335b1d952d0ec5effc9569ec253ffad2ebbf37d1a5fdf70fd609f756d598c8b6
```

This is an image integrity digest, not a credential hash. Do not claim it was recorded at the earlier visual-review time. The helper returns the verified JPEG bytes unchanged for upload; a thumbnail is decoded only for local pixel proxies. It does not resize, rotate, re-encode, sharpen or retouch the upload artifact. Hash/format mismatch stops before any provider operation.

## Current local and documentation checks

`npm run env:check` passed; the existing API key, task secret and reviewer code load and validate without printing values. `.env.local` is unchanged. Public live remains false. Configuration is restricted to the approved HTTPS API origin and the single exact host `yce-us.s3-accelerate.amazonaws.com`. This runner rejects host-list expansions, alternative origins and non-root base paths; accepted base URLs are normalized to their origin. The shared storage policy still rejects userinfo, IP/internal destinations, non-HTTPS links and redirects. New provider-returned hosts are not automatically trusted.

The official [current unit table](https://docs.makeupar.com/reference/ai_skin_analysis/section/overview/unit-consumption) was checked:1–4 SD concerns cost9 units. Selected actions remain acne/pore/texture/redness. Intended complete-attempt budget12 existing free units; no documented atomic provider cap exists and ancillary cost is not guaranteed. No current provider/account price endpoint was called. No fresh dashboard billing or balance observation is claimed. Latest supplied financial evidence remains the user's screenshot-supported−9/+9 reversal and displayed1,040 balance; historical no-subscription/auto-refill-disabled evidence is not relabeled fresh.

## Separate execution path

`npm run youcam:phase3f` performs local preparation and reports `PREPARED_PENDING_FRESH_AUTHORIZATION`, zero provider requests, hash match and whether an authorization file exists. It does not create authorization or claim an attempt. It has been run only in this safe default mode.

After the human explicitly authorizes this second attempt, an operator may create a new private `.private/phase3f-authorization.json`. The [example](phase3f-authorization.example.json) is deliberately invalid: authorization=false, missing timestamps and missing account evidence. Do not turn its flags true until the human grants authorization. Do not invent balance observation times, current billing evidence or cost guarantees. It uses a distinct phase3F/second-test envelope around the existing synthetic schemaVersion3, with the exact image hash and immutable previous-marker digest. Authorization recording and price review must be recent; any historical billing evidence/risk acceptance must be represented honestly. A Phase3C record alone cannot authorize Phase3F. No real-person adult-owner consent is fabricated.

Execution additionally requires the explicit operator flag `--execute-phase3f-authorized`. It must **not** be used until fresh human authorization is recorded. The CLI has no public route and does not enable the application's scan flag. This document and the preparation command are not execution authorization.

The Phase3F marker is claimed with exclusive creation before the first provider request, after authorization/image checks. Only `.private/phase3f-attempt.json` and a successful `.private/phase3f-baseline.json` are written; neither is the Phase3C record. The prior marker's hash is checked at preflight and again at claim. An existing Phase3F marker or baseline prevents execution. Never remove a claimed marker to retry.

The existing controlled engine sends exactly one metadata POST, one validated storage PUT and one V2.1 task POST with four SD actions and format=json. POST/PUT are not retried. Polling is limited to the same task,10-second intervals,150-second deadline and45 maximum GET transport attempts including transient GET retries. A terminal error, unknown state, timeout or malformed success stops without resubmission. Sanitized documented diagnostic codes/categories and presence flags are retained; prose, unknown tokens, signed URLs, image paths and provider IDs are excluded from logs.

Only a validated actual four-metric success can create a private baseline. Raw/UI scores remain separate, synthetic provenance and `Live YouCam API — Synthetic Test Image` labeling are preserved, missing measurements are not invented, and no sample fallback or personal-history merge occurs. A failure retains sanitized evidence without a fabricated baseline. Account usage is reported only with actual evidence, not by subtracting the published price.

## Validation and actual operation results

`npm run check` passed TypeScript, ESLint, **179 tests across5 files** and production build. New Phase3F tests cover distinct authorization scope, stale authorization rejection, exact image/path/previous-marker binding, configuration restrictions, byte preservation, hash mismatch, metadata rejection and dimension limits. Existing mocked workflow tests cover request counts, no POST/PUT retries, polling, diagnostics and normalization. The default CLI verified the real local crop hash, dimensions and zero-request preflight. Tests are offline; none claim successful live measurements.

| Operation | Actual Phase3F result |
| --- | --- |
| Registration / upload | Not attempted |
| Analysis task / status GET | Not attempted |
| Live normalization | Not exercised |
| Saved baseline | None |
| Measured unit consumption | Not measured; no provider operations in this phase |
| Phase3C marker / secret file | Hash-verified unchanged |
| Public scanning | Disabled |

[Sanitized offline evidence](evidence/phase3f-offline-preflight.json). **The remaining execution prerequisite is explicit fresh authorization of this second attempt**, followed by a truthful final preflight immediately before any request. Do not claim clinical validity, successful live normalization or submission readiness.
