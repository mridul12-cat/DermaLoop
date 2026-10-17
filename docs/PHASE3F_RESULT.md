# Phase 3F — successful controlled live YouCam integration test

17 October 2026. **One separately authorized test succeeded using the corrected synthetic portrait.** The private controlled CLI exercised the actual File API, signed PUT, Skin Analysis V2.1 creation, terminal polling and four-metric normalization. Public application scanning remains disabled; the public browser-to-provider flow and external deployment are not verified by this test.

Execution timestamps (actual UTC): 2026-10-17T10:59:41.069Z to 2026-10-17T10:59:55.675Z. [Sanitized operation evidence](evidence/phase3f-live-attempt.json).

| Area | Actual result |
| --- | --- |
| File registration | Exactly one authenticated POST; HTTP200; file response schema accepted |
| Signed JPEG upload | Exactly one PUT; HTTP200; HTTPS/exact approved host accepted, redirects forbidden |
| Storage host | yce-us.s3-accelerate.amazonaws.com |
| V2.1 task creation | Exactly one POST; HTTP200; returned task identifier validated privately |
| Polling | Exactly one GET; HTTP200; validated terminal task_status=success |
| Requested/returned concerns | acne, pore, texture, redness; all four returned |
| Normalization | PASS for the supported SD JSON response; genuine raw and UI numeric scores present and kept separate for every concern |
| Private baseline | Saved, schema-revalidated, mode0600; labeled Live YouCam API — Synthetic Test Image |
| Provider error code | None; successful task |
| Phase3F unit consumption | Unknown; no measured account balance/transaction delta |
| Remaining balance | Not independently observed |
| Public live flag | false throughout and after execution |

## Preflight and authorization evidence

`npm run env:check` passed before and after execution. API key, task secret and reviewer credential loaded privately; no secret was printed or changed. The corrected680×850 JPEG (550,743 bytes) matched the pinned SHA-256 and exact reviewed artifact. Its existing bytes were used without re-encoding. The source portrait, reviewed JPEG, secret file, every guarded private Phase3C record, original Phase3C execution marker and public Phase3C result/evidence files were preserved; guarded files were hash-compared unchanged after execution.

The human's new explicit second-attempt authorization was recorded in a separate private Phase3F envelope with actual recording/price-review timestamps. The prior authorization was not reused as permission: only its explicitly historical account observation was preserved unchanged. The runner exclusively claimed a new Phase3F marker before any provider request. Both execution markers remain in place; neither authorizes another attempt. No duplicate, replacement or automatically retried POST/PUT occurred.

The [current published cost table](https://docs.makeupar.com/reference/ai_skin_analysis/section/overview/unit-consumption) was rechecked before execution and lists9 units for1–4 SD concerns. Intended total boundary12 existing free units; no documented atomic provider cap exists. There was no evidence of a charge above this scope or monetary billing, but no new dashboard access or fresh account observation was performed. The prior screenshot-supported−9/+9 reversal and displayed1,040 balance apply to the earlier failed attempt. **They do not establish this attempt's deduction or a current balance.** No purchases, subscriptions, paid billing or auto-refill actions occurred. Do not infer a1,031 balance or report9 units as measured consumption.

## Response, privacy and interpretation

The actual returned metrics passed the selected JSON normalizer and SkinScan schema. Every authorized concern has a whole-region raw score and a separately stored UI score; no missing metric, confidence, history or sample result was fabricated. Numeric measurements and provider identifiers stay in private storage; public evidence exposes only metric presence, result states and operation counts. Raw provider payloads, signed URLs, facial images, request credentials and private image paths are absent from logs/evidence.

The saved baseline has source=live, imageProvenance=synthetic_test_image, synthetic-test consent/disclosure and sourceLabel=Live YouCam API — Synthetic Test Image. It was not imported into the browser notebook or merged with a real person's progress. The provider engine build remains unpinned; a successful integration test on generated skin establishes neither clinical validity nor real-world measurement accuracy.

The success is consistent with the framing hypothesis, but does not prove the first failure's cause: its diagnostic detail was lost, the JPEG encoding also differs, and provider conditions may differ. There is no basis to retrofit an error code onto the Phase3C failure.

## Final validation and remaining blockers

After execution, `npm run check` passed TypeScript, ESLint, **179 mocked automated tests across5 files**, and the production Next.js build. `npm run env:check` passed. An additional local postflight parsed the actual saved baseline, checked all four raw/UI fields, verified mode0600, and rechecked the image hash and protected evidence. No further provider GET or live scan was performed for verification. Browser screenshots/e2e were not rerun for this CLI-only execution.

The controlled synthetic-image end-to-end provider path is now independently observed successful. Remaining unverified items: this attempt's actual credit transaction/balance, public deployment, deployed request limits and the public browser integration path. Public live access still needs durable abuse/budget controls. Submission readiness is not claimed. No third attempt is authorized.

For future private Skin Atlas review, read only this server-generated baseline through an authenticated read-only route or operator-controlled fixture binding; strip provider identifiers, visibly retain synthetic provenance, reject arbitrary live JSON imports and exclude it from personal histories. No such route, import or public access was enabled in this phase.
