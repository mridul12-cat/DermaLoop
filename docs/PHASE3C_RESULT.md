> Subsequent Phase3D evidence: the user reports screenshot-supported−9/+9 analysis transactions (zero net) and displayed balance1,040. See [the offline investigation](PHASE3D_INVESTIGATION.md). Usage was unknown at the original execution time.

# Phase 3C controlled attempt — provider terminal error

17 October 2026, 16:02:22–16:02:38 IST. One user-authorized synthetic-image attempt was executed. Registration, signed upload and V2.1 task creation succeeded; the first status response reported terminal `error`. No replacement task or second attempt was made.

| Operation | Actual evidence |
| --- | --- |
| File registration | One POST, HTTP 200; registration schema accepted |
| JPEG upload | One PUT, HTTP 200; exact host `yce-us.s3-accelerate.amazonaws.com` accepted |
| V2.1 task creation | One POST, HTTP 200; nonempty task identifier validated privately |
| Status | One GET, HTTP 200; validated task_status=`error` |
| Requested SD actions | acne, pore, texture, redness |
| Returned measurements | None obtained; no raw/UI scores fabricated |
| Live normalization | Not reached because the provider task failed |
| Private baseline | Not saved |
| Automatic retries | Zero; durable single-use marker retained |
| Public live scanning | Disabled throughout and after execution |
| Account usage delta / current balance | Unknown; no fresh dashboard observation |

[Sanitized execution evidence](evidence/phase3c-controlled-attempt.json) contains statuses, counters, times and the approved hostname. Credentials, signed URLs, input image paths, file/task identifiers and raw provider payloads are excluded. The recorded failure code is `ANALYSIS_FAILED`; its underlying provider cause is **not established**. A terminal error does not establish that synthetic provenance caused rejection. No further provider GET was made after the terminal response.

## Authorization and budget boundary
The user's revised instruction explicitly accepted the historical account evidence and unknown ancillary File API unit cost. New private authorization schemaVersion3 records that acceptance while leaving `currentBalanceVerified=false` and `allProviderCostsWithinBudgetConfirmed=false`. It preserves the previous screenshot evidence unchanged: user-reported approximately 15:42 IST, 1,040 bonus units, no paid subscription, auto-refill disabled and zero recent usage. None of this is represented as a fresh dashboard reading. The authorization recording timestamp is the actual local recording time, not a fabricated balance observation or human confirmation time.

Versions1/2 retain their stricter fresh-balance/confirmed-total-cost requirements. Version3 applies only to synthetic tests, still requires a current documented analysis price and recent authorization record, rejects contradictory billing evidence, and preserves free-credit-only scope, intended12-unit ceiling, exact-host validation and one-attempt transport counters. No subscription, purchase or auto-refill action was performed. There was no evidence of monetary billing or a cost above the intended ceiling; no provider-side hard cap exists.

The official [unit table](https://docs.makeupar.com/reference/ai_skin_analysis/section/overview/unit-consumption), rechecked before execution, lists9 units for1–4 SD concerns. Its general workflow says failed analysis tasks consume no analysis units; that is documentation, **not observed account usage evidence**. Registration/ancillary usage remains unknown, and no deduction or remaining balance is asserted. Do not infer a current balance of1,040 or1,031.

## Image, privacy and security
The selected user-provided AI-generated adult portrait was prepared in memory as a1346×1169 JPEG within the existing byte and dimension limits. Decoding succeeded; orientation correction, metadata stripping and explicit sRGB pixel measurement were applied. Provenance was `synthetic_test_image`; authorization did not assert consent from a real photographed adult. Pixel quality proxies and earlier visual inspection were not claimed as validated provider acceptance or clinical confidence.

API Bearer authentication stayed on the approved API origin. Storage PUT used provider-returned headers without the application's API bearer, HTTPS and the exact approved hostname; redirects were forbidden. No credentials, signed destination, original image path or provider identifiers were logged. `.env.local` was not modified, and `.env*`/`.private/` ignore rules remain intact. The exclusive attempt marker prevents re-execution; it must not be removed to obtain an unauthorized retry.

[Provider retention policy](https://docs.makeupar.com/develop/file_retention_period) describes uploaded/generated media and identifiers retained up to30 days. The application persisted no prepared photo, mask URL or raw provider response; it cannot promise early upstream deletion. No measurements from this synthetic attempt entered a real-person notebook.

## Local validation and readiness
After execution, `npm run env:check` passed with all credential validation checks passing and liveDisabled=true. TypeScript, ESLint, all130 mocked tests and the production build passed. Tests include revised authorization truthfulness, unchanged strict versions, billing contradictions, exact action payload, one-shot POST/PUT behavior, host rejection, bounded polling, synthetic provenance and preservation of terminal error/success evidence before normalization. Automated tests do not prove provider score validity.

**Successful live result normalization remains unverified. No genuine baseline exists.** Public deployment is also not verified, so submission readiness is not claimed. Any second live attempt needs fresh user authorization. If a later authorized attempt produces a validated baseline, expose it through a private authenticated read-only Skin Atlas review path that reads only server-generated evidence, strips identifiers, labels synthetic provenance prominently, rejects arbitrary imports and excludes it from personal histories. No display endpoint or public scan access was enabled here.
