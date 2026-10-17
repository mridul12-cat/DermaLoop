# Phase 3D offline failure investigation

17 October 2026. **The upstream root cause remains unconfirmed. Face framing is the strongest specific hypothesis. Diagnostic information loss in the adapter is confirmed and fixed for future authorized attempts.** No provider API request was made in this phase.

## Confirmed facts and recoverability

The Phase3C evidence records exactly one file registration, one signed JPEG PUT, one V2.1 task creation and one status GET. Every HTTP response was200; the validated terminal task state was `error`. The local code raised `ANALYSIS_FAILED`. No scores were normalized and no baseline was saved. This was an engine/task failure, not a local polling timeout or successful-result normalization failure.

Before this correction, the status parser selected only `data.task_status`. Zod discarded other fields from its parsed object, and the error branch threw a generic exception without diagnostic metadata. The original in-memory JSON was not written to disk. Inspection of existing private JSON artifacts found only authorization, image preflight and sanitized attempt events—not a raw response or detailed provider error. There is no retained task identifier in those evidence events to aid offline reconstruction. **The original underlying error cannot be recovered from the inspected local evidence.** Documentation proves additional error fields can exist; it does not prove which fields this particular response actually contained. No new status request was made to try to recover them.

## Contract comparison

The official [V2.1 reference](https://docs.makeupar.com/reference/ai_skin_analysis/v2.1) and downloaded [official OpenAPI bundle](https://docs.makeupar.com/_bundle/reference/ai_skin_analysis.json?download=) agree with the selected operation and JSON format. Runtime source reconstructs the submitted body as:

```json
{"src_file_id":"<runtime file identifier, omitted>","dst_actions":["acne","pore","texture","redness"],"format":"json"}
```

This is a code/evidence reconstruction, not a retained wire capture. The uploader passed the returned file identifier directly into task creation after a successful PUT. All four names are supported SD actions; no HD concern was mixed in. The approved origin and `/s2s/v2.1/task/skin-analysis` POST/GET paths are correct. HTTP200 creation and subsequent accounting are evidence of task acceptance, not guaranteed downstream image suitability.

The OpenAPI status schema documents running/success/error plus `data.error` and `data.error_message`. Our parser handles those states; legacy `pending` is additionally treated as nonterminal. Unknown states fail closed. Documented engine codes include `error_no_face`, `error_pose`, `error_face_parsing`, `error_inference`, source-media download/decode failures and internal errors. The separate [image guide](https://docs.makeupar.com/reference/ai_skin_analysis/section/overview/file-specs-and-errors) additionally lists framing, dimension and lighting codes. These are possible diagnostic outcomes, **not codes recovered from this attempt**. [Contract excerpt](evidence/phase3d-error-contract.json).

## Offline image findings

The original is a1346×1169 PNG with no EXIF/orientation tag. Repeating the exact preparation pipeline offline produced a1346×1169 sRGB JPEG of309,506 bytes, with no EXIF/orientation tag. Dimensions and size satisfy both the existing local limits and documented SD minimum. Prepared bytes were reconstructed in memory; the original transmitted JPEG was not retained, so this is reproducibility evidence rather than a byte-for-byte archived transmission comparison.

Local visual review shows a centered frontal face, open eyes, closed mouth, visible forehead, even-looking illumination and visible hair/eye detail. The image has a mildly landscape aspect ratio. The visible face itself, excluding hair, spans roughly35–40% of image width by manual visual estimate. This is not a detector bounding box or provider measurement. The image guide requires a face wider than60% and recommends portrait framing. The runner resized the entire image and never cropped to a face; `frontView=true` was a recorded visual assertion, not automated face-size, pose or detection validation.

The existing160-pixel thumbnail produces brightness141.39/255 and edge proxy13.40. The proxy is mean absolute Laplacian, not a calibrated blur score or confidence. It averages the entire image, including background/hair, and discards detail through downsampling. Measurements at widths80/320/640 produce20.16/10.92/11.12 respectively. Deliberately blurring the160-pixel thumbnail with sigma2 lowers it to2.54. This shows sensitivity to blur and measurement scale; it neither proves the original is sufficiently sharp nor establishes a provider rejection. The app's `<35` comparison warning is a local heuristic with no mapping to YouCam acceptance. Whole-image brightness likewise cannot validate face-specific lighting. [Sanitized offline measurements](evidence/phase3d-offline-image-review.json).

## Ranked hypotheses

| Rank | Possible cause | Evidence and uncertainty |
| --- | --- | --- |
|1| Face too small / unsuitable framing | Strongest specific lead: visible face estimate35–40% versus documented>60%; original preparation does not crop or validate face area. Compatible with `error_src_face_too_small`, but no actual code survives. |
|2| Face detection, pose or segmentation failure on this input | Documented pipeline failures; synthetic portrait and framing have not been validated by the provider. Human-visible face clarity does not prove detector success. No evidence of a blanket synthetic-image prohibition or provenance rejection. |
|3| Provider processing or source-media access/decode failure | Documented alternatives; upload200 does not prove the engine could retrieve/decode the object. No preserved error supports a specific internal cause. Local JPEG decoding succeeds. |
|4| Blur, face-specific lighting or subtle pose | Possible capture issues, but weaker evidence: proxy13.4 is uncalibrated and visual detail is present. Mean brightness does not suggest gross darkness and cannot exclude local lighting problems. |
|5| Incorrect action names/request structure or local response handling caused the engine failure | Low support: supported SD payload, correct endpoint and accepted task. Local parsing did lose diagnostics, but it did not create the provider's explicit terminal error. |

No numerical probabilities or clinical conclusions are justified. Synthetic measurements would not establish real-world skin-health accuracy even after successful processing.

## Corrections implemented and tested

- New diagnostic parser accepts only exact documented code tokens from known code fields and emits a static category plus boolean indicators. Optional alternative code/description field locations are handled defensively, without claiming those extensions occurred in the real response.
- Free-text descriptions are never stored or logged; only their presence is recorded. Unknown tokens, unexpected objects, identifiers, URLs and image fields are discarded. Conflicting known codes produce an unknown category rather than an invented specific diagnosis.
- `ProviderError` carries sanitized diagnostics for terminal task and non-2xx query failures. The controlled status callback and future CLI failure evidence preserve them before throwing. Public API error bodies remain stable and generic; private diagnostics do not expose provider prose.
- App action validation rejects unsupported, HD, duplicate or empty app action selections before upload. It validates DermaLoop's supported SD subset, not every provider capability. The authorized four-action payload is unchanged.
- No success-shaped empty result is interpreted as missing-face proof; it remains a malformed result. Malformed status envelopes fail closed.

`npm run check` passed TypeScript, ESLint, **159 tests across4 files** and the production build. There are29 new tests plus an updated controlled-run regression. They cover documented terminal codes, no-face, empty output, malformed envelopes/diagnostic fields, unsupported action rejection before upload, HTTP400 code preservation without POST retry, unknown-code secrecy, conflicting codes, stable public errors and a controlled blur experiment. Fixtures are mocked, not recovered provider payloads. Existing upload-host, single-use, no-retry and provenance tests still pass. `npm run env:check` also passed; the credential file and durable attempt marker were hash-compared and remained unchanged; public live=false and no baseline exists.

## Financial evidence

The user reports screenshot-supported dashboard history of **−9 analysis units followed by+9 reversal**, returning the displayed balance to**1,040**. Record **zero net analysis units for this observed attempt**. This phase did not independently open the dashboard or receive an observation timestamp;1,040 is the screenshot-reported post-reversal balance, not a fresh current account read. This does not establish ancillary File API costs or guarantee refunds for future failed tasks. The earlier Phase3C report correctly marked usage unknown at execution time; this later evidence supplements it. [Financial record](evidence/phase3d-financial-evidence.json).

## Would a second attempt test something new?

Repeating the identical input would mainly add diagnostic observability and test a possible transient provider failure; it would not isolate the leading framing hypothesis. A future separately authorized test using a reviewed crop of the same original face without geometric distortion to the documented60–80% width, retaining the forehead/chin, frontal pose and minimum480-pixel short side, would meaningfully test framing while keeping the four concerns fixed. Review crop suitability offline first; do not upscale or sharpen to manufacture skin detail. Detector disagreement or synthetic-image domain differences would remain possible even after reframing. Consider a trusted offline face detector or provider Camera Kit review later only after dependency/privacy review; neither was added or called here.

**No second attempt is requested or authorized here.** The existing attempt marker stays intact; this work does not reopen execution, enable public scanning, purchase credits or change billing. Public deployment and successful live result normalization remain unverified.
