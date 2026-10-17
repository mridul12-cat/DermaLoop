> Historical preparation record. Superseded for current execution status by [the Phase 3C result](PHASE3C_RESULT.md): one attempt executed and returned a provider terminal error. Do not rerun the claimed attempt.

# Phase 3C — first real scan, prepared only

**NOT EXECUTED. No new provider request, image read/upload or task created in this phase.** Public `YOUCAM_LIVE_ENABLED` must remain false, including during a future private controlled test. This preparation is not authorization to execute.

## Official contract and cost reviewed 17 October 2026
[V2.1 reference](https://docs.makeupar.com/reference/ai_skin_analysis/v2.1) lists **acne, pore, texture, redness** as SD actions that may be combined. `pore` is singular; no HD actions or unsupported fields will be included. JSON results selected explicitly.

[Published unit table](https://docs.makeupar.com/reference/ai_skin_analysis/section/overview/unit-consumption) lists 1–4 concerns as **9 SD units** (12 is the HD bracket, not the selected mode). Maximum proposed authorization: **12 existing free units for the complete single attempt**, no purchase/billing activation or automatic retry. Expected analysis cost is within this limit. Reconfirm current account/region cost immediately before approval; stop if it changes or exceeds the ceiling. File registration's actual deduction was not measured in Phase 3B, so the 3-unit headroom is not evidence that all ancillary costs fit. Execution approval must explicitly confirm total costs fit <=12, existing-free-credit-only funding and a current free balance >=12. If that cannot be confirmed, do not execute.

The provider request schema has no documented atomic `max_units` cap. DermaLoop enforces a fixed four-action payload, fresh confirmed pricing, budget gates and one-attempt counters; it cannot guarantee provider-side pricing or account billing behavior. This remains a technical/economic limitation, not a proven hard server-side ledger limit.

## Exact intended requests after separate authorization
1. `POST https://yce-api-01.makeupar.com/s2s/v2.0/file`, server Bearer authentication, JSON:
```json
{"files":[{"content_type":"image/jpeg","file_name":"capture.jpg","file_size":"<actual prepared byte count as integer>"}]}
```
The placeholder above is documentation only. Runtime sends the actual integer and no original personal filename. File API returns file ID plus one schema-validated PUT URL and headers. This will be a NEW registration tied to the actual bytes; the old metadata-only placeholder record is not reused.
2. **One PUT** of locally prepared JPEG bytes to the exact provider-returned signed URL. Existing HTTPS/exact-host/redirect guards apply. Only approved `yce-us.s3-accelerate.amazonaws.com` (or explicitly reviewed override) is accepted. No API bearer on this storage request. Signed URL never printed or persisted. An unexpected host stops before upload/task.
3. **One** `POST https://yce-api-01.makeupar.com/s2s/v2.1/task/skin-analysis`:
```json
{"src_file_id":"<opaque ID from step 1>","dst_actions":["acne","pore","texture","redness"],"format":"json"}
```
4. `GET https://yce-api-01.makeupar.com/s2s/v2.1/task/skin-analysis/<encoded task ID>`, server Bearer authentication; poll every 10 seconds for <=150 seconds. Known terminal success/error; unknown state fails closed. At most 45 transport GET attempts, including bounded 429/5xx retries. No POST or PUT retry, including auth/quota/network/ambiguous timeout failures.

No balance/feature-cost query is automatically added by the runner. If account usage is visible, record before/after manually and label observed deduction; otherwise keep it unknown. Do not claim an unmeasured balance delta of zero.

## Image and consent requirements
[Official file requirements](https://docs.makeupar.com/reference/ai_skin_analysis/section/overview/file-specs-and-errors): JPEG/PNG, <10 MB, SD short side >=480 pixels; provider resizes long side above2560. Portrait recommended; sharp front view, even lighting, no filters/occlusion; face about60–80% of width, forehead visible, neutral relaxed expression, eyes open, mouth closed. Remove glasses/makeup when practical. These are capture guidelines, not validated diagnostic confidence.

Runner is stricter: input JPEG/PNG <=15 MB / <=20 million decoded pixels, no animated/multipage images. Correct EXIF orientation, resize inside2560 without enlarging, JPEG re-encode stripping metadata; reject if prepared short side <480 or bytes >3.5 MB. Pixel brightness/sharpness computed locally. No image is read until the approval schema passes. No selected image/path exists yet.

DermaLoop requires explicit consent from the adult image owner to transmit the selected face image to Perfect Corp, plus explicit authorization of one upload and one analysis. The owner must acknowledge this is consumer AI, not diagnosis, clinical efficacy evidence or a product recommendation. Local preparation is reversible; after transmission, stopping polling does not cancel provider processing or reverse units.

[Dedicated provider retention policy](https://docs.makeupar.com/develop/file_retention_period): uploaded/generated media and file/task identifiers retained up to30 days; download URLs valid2 hours. The general workflow still mentions a different shorter result window; disclose/reconfirm the dedicated policy before execution. DermaLoop does not persist face photos or mask URLs; it cannot guarantee provider deletion earlier than its policy.

## Single-use execution path and audit
- `npm run youcam:controlled` is a **safe offline preparation command**: prints plan/status, reads no image and sends no requests.
- Future execution additionally requires the explicit operator flag `--execute-explicitly-authorized` and a valid private `.private/phase3c-authorization.json` created only AFTER a new human authorization. [Example](phase3c-authorization.example.json) is deliberately invalid/incomplete. Do not fill it from this preparation request.
- Balance, price and consent confirmations must be <=15 minutes old and not future-dated. Explicit fields acknowledge total cost <=12, free credits, image-owner consent, retention, front view and upload/task authorization. Application live flag must remain false and origin must remain the verified India origin.
- `.private/phase3c-attempt.json` is claimed with exclusive filesystem creation BEFORE any provider request; concurrent/second attempts stop. Never remove the marker to retry without a new review/authorization. One registration, one upload and one task enforced independently in the controlled transport wrapper. No public API route exposes this runner; normal app gates and seven-metric behavior are unchanged.
- Existing server upload client, result normalization and guarded status handling are reused. Normalized raw/UI scores remain distinct, all four whole-region raw scores required before reporting full success. Unknown provider shapes may fail AFTER an upstream successful charge; no task is resubmitted.
- Private baseline saved only on success in Git-ignored `.private/phase3c-baseline.json` with restrictive file permissions. It contains normalized scores/provenance, not photos, signed links or masks. Public logs/evidence contain only status, action names and counts. Raw provider responses, image paths, task/file IDs, credentials and scores are not printed. This CLI baseline is not automatically inserted into the browser notebook; live JSON import remains blocked against forgery.

## Inspection findings / remaining risks
Public POST create uses no automatic retry; storage PUT is one-shot; only GET transient retries exist. Client repeat-click lock prevents concurrent submission within a component, but public manual resubmission is not durable idempotency. This private runner adds the durable one-attempt claim and stays independent of public live enablement.

A provider operation may complete after local timeout or process loss. Polling must stop at the deadline, and a claimed attempt must never be rerun to recover a result. Provider engine build is unpinned, JSON V2.1 acceptance is not yet observed, facial suitability is not validated by local heuristics, and the account pricing/balance remain unconfirmed. No arbitrary heatmap or trend will be inferred from a baseline. Existing quota/public deployment blockers remain.

## Required next human confirmations (none received for Phase 3C)
1. Exact current available **free** unit balance, observation time and source; confirm funding/billing and total-operation costs fit the 12-unit ceiling.
2. Explicit authorization for transmission of one specified adult-owned/consented photo to Perfect Corp, and exactly one four-metric V2.1 SD task.
3. Selected private local image path and adult owner's acknowledgment of 30-day provider retention and limitations; a suitable image must then pass local preparation.
4. Reconfirm documented/current account tariff remains9 analysis units, plus any ancillary cost fits the total cap. If uncertain or above12, stop.

**Waiting for explicit authorization; do not execute now.**

## Preparation validation executed
`npm run check` passed TypeScript, ESLint, **108 mocked tests** and production build. The 22 added controlled-run cases cover explicit/fresh consent, free-balance and budget gates, fixed four-action payload, one-shot task failure, host rejection, claim refusal, bounded polling and incomplete results. Existing 86 tests remain passing.

`npm run youcam:controlled` returned `PREPARED_NOT_EXECUTED` with zero network requests. Read-only environment check returned PASS with live disabled. Neither a private Phase 3C authorization nor an attempt marker exists; no image was opened/prepared and no actual skin result was generated. Phase 3B registration evidence remains the only real provider verification.

## Latest execution request outcome
The user subsequently authorized one synthetic-image test, but its preflight was stopped before provider requests because fresh account evidence and complete-attempt ancillary pricing remain unresolved. The private runner now supports explicit synthetic authorization/provenance and cannot compare that baseline against real-image provenance. See [current preflight evidence](PHASE3C_PREFLIGHT.md). Authorization intent is preserved without a fabricated executable approval. Current validation:112 tests plus type/lint/build PASS. Public live remains false.
