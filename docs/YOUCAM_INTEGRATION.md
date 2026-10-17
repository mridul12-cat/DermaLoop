> Current verification update — 17 October2026: [Phase3F succeeded](PHASE3F_RESULT.md) with one actual synthetic-image registration/upload/task/status workflow and four-metric normalization. Private baseline saved;179 tests/type/lint/build/env checks pass. Public scanning stays disabled; deployment and this attempt's actual credit usage/balance remain unverified. Earlier phase statements below are historical.

# YouCam integration evidence
Status: **LIVE VERIFIED: one File API metadata registration only (HTTP 200, schema PASS, approved upload hostname). Skin Analysis task pipeline remains MOCK TESTED; no image upload or analysis task submitted.** Credentials are configured. A separate explicit authorization is required before any real scan. Unit deduction for registration was not measured; see [actual handshake evidence](PROVIDER_HANDSHAKE.md).

## Contract reviewed 17 October 2026
- [V2.1 reference](https://docs.makeupar.com/reference/ai_skin_analysis/v2.1)
- [File and result workflow](https://docs.makeupar.com/reference/ai_skin_analysis/section/overview/unit-consumption)
- [File API](https://docs.makeupar.com/reference/file)
- [API regions](https://docs.makeupar.com/develop/api_server)
- [Retention](https://docs.makeupar.com/develop/file_retention_period)
- [Rate limits](https://docs.makeupar.com/develop/rate_limit)

Selected base is `https://yce-api-01.makeupar.com`; verify account region and set server-only override. File reference on docs.perfectcorp.com was inaccessible during research; the India workflow and File Management reference supplied the contract. The overview’s general upload example uses v2.0 task paths; implementation deliberately selects the v2.1 task paths verified in the V2.1 reference. Its JSON schema still needs a real account response check.

## Request/response structures (abridged, adapted)
File init POST `/s2s/v2.0/file`:
```json
{"files":[{"content_type":"image/jpeg","file_name":"capture.jpg","file_size":547541}]}
```
Expected response structure: `data.files[0].file_id` plus `requests[0].method`, `url`, `headers`. These are not image results. Perform the returned PUT with actual bytes, required headers, and no bearer key. Upload URL must match the exact configured host (documented example: yce-us.s3-accelerate.amazonaws.com). Other account regions may return different hosts: verify and configure deliberately.

Task POST `/s2s/v2.1/task/skin-analysis`:
```json
{"src_file_id":"opaque-provider-file-id","dst_actions":["moisture","texture","pore","redness","oiliness","radiance","acne"],"format":"json"}
```
Expected task ID: `data.task_id`. No mixed HD actions or unsupported camera flags.

GET `/s2s/v2.1/task/skin-analysis/{encoded-task-id}`: running/pending → success/error. Completed output is parsed at `data.results.output[]`; the selected JSON fixture is in `fixtures/youcam-json.json`, with score examples adapted from the official guide. Its values are documented examples, NOT a live DermaLoop response. Fictional historical app samples are separately generated deterministically in `src/lib/fixtures.ts` and labeled throughout.

| Provider key | Canonical key | Comparison |
| --- | --- | --- |
| moisture | moisture | raw_score, whole, SD |
| texture | texture | raw_score, whole, SD |
| pore | pore | raw_score, whole, SD |
| redness | redness | raw_score, whole, SD |
| oiliness | oiliness | raw_score, whole, SD |
| radiance | radiance | raw_score, whole, SD |
| acne | acne | raw_score, whole, SD |

`ui_score` is retained separately as consumer-adjusted; charts always plot raw. Missing raw is null, not zero. Unknown metric names are ignored. Mask URLs discarded; scores-only UI. ZIP, nested HD archives and alternate v2.0 schemas deliberately fail closed. A live scan stores source=live, provider, API version, engine proxy, actions, raw/UI values, region, capture and consent timestamp. Never infer live provenance from imported JSON.

## Local setup and exact remaining verification
1. Use the [event resources](https://youcam-api-skin-ai-ecommerce.devpost.com/resources) India account link. Establish eligibility independently; request/redeem participant units if permitted. No billing activation needed by this project.
2. Check your account balance and current feature costs using the official console or read-only `/s2s/v2.0/credit/feature-cost` documentation. Units are not requests; seven actions may cost more than one unit. No cost estimate is assumed here.
3. Copy `.env.example` to `.env.local`; supply key, exact regional base and upload hostname(s), independent reviewer code and HMAC secret (>=32 random characters each). Keep `YOUCAM_LIVE_ENABLED=false` until explicit owner approval to spend units.
4. With approval, enable live briefly; run `npm run dev`. In a private session open Scan Studio, consent as an adult, prepare a photo locally, enter reviewer code and submit once. Confirm signed PUT, actual task ID, completed JSON, raw/UI normalization and local baseline. Do not log secrets, signed URLs or face data.
5. Record a redacted dated evidence note with endpoint/version, completion, score count, credit delta and verified schema. Keep live status blocked in submission copy until this passes. Disable live afterwards.
6. Optional CLI smoke: default `npm run youcam:smoke` makes no network calls. `npm run youcam:smoke -- --live` additionally needs YOUCAM_SMOKE_APPROVED=true, configured env, SMOKE_IMAGE and actual SMOKE_CAPTURE JSON. It submits ONCE; do not loop it.

## Errors and recovery
Auth: verify server key/region, never expose it to browser. Quota: stop and inspect remaining approved units; no auto retry. 429: GET-only bounded backoff, POST not retried. 5xx/timeout on task creation: outcome may be ambiguous; inspect provider before manual resubmission. Upload errors: no task start if PUT failed. Malformed JSON/unknown status fail visibly. Cancel stops local polling only; no unsupported upstream cancellation promise.

## Verification boundary
Mock transport asserts actual signed PUT invocation before task POST; it proves orchestration, not account authorization, provider acceptance, facial suitability, score accuracy, charging or region behavior. A real end-to-end provider call and accessible deployment remain mandatory before claiming competition API compliance.

## Phase 2 audit — 17 October 2026
Rechecked the official V2.1 reference, India API server, workflow, File Management OpenAPI, rate-limit and retention pages. This is **documentation verification**, not live integration verification.

- [File Management OpenAPI](https://docs.makeupar.com/_bundle/reference/file.json?download=) explicitly describes Bearer authentication, file metadata, returned upload method/URL/headers and subsequent use of file ID. Its header example includes numeric Content-Length. Parser now accepts finite nonnegative numeric header values and converts them to strings; a transport test proves the normalized header reaches PUT. The OpenAPI response envelope is underspecified (`data: null` alongside a response reference); the published workflow's `data.files` example remains the selected fixture shape.
- Selected seven actions are SD actions listed in the [V2.1 reference](https://docs.makeupar.com/reference/ai_skin_analysis/v2.1). No HD mixing, extra camera flags or invented mask layers. Dedicated status operation page and skin OpenAPI bundle failed to load via the research tool; status envelope and JSON adapter are supported by the general official workflow but still require an actual V2.1 account response before acceptance can be claimed.
- [Current published table](https://docs.makeupar.com/reference/ai_skin_analysis/section/overview/unit-consumption) lists 5–8 concerns as **12 SD units**. Seven selected actions fall in that published bracket. This is indicative documentation pricing, not an account quote, approved budget or observed deduction. Confirm regional/account feature costs immediately before one explicitly approved scan.
- [Rate-limit page](https://docs.makeupar.com/develop/rate_limit) lists 250 requests per 300 seconds for both IP and access token. Normal browser polling is 10 seconds; transient GET retries are bounded. No POST automatic retry. Provider limits do not replace application abuse/budget protection.
- Timeout budget is now bounded across the server start pipeline (55 seconds), each REST call (20 seconds) and upload (30 seconds). Server status has a 45-second total signal and declared 60-second function maximum. Browser start times out at 60 seconds; each browser status request is limited to the smaller of 25 seconds and remaining time in the 150-second polling window. Shorter hosting limits still need deployment verification. Stopping local fetches does not cancel provider work or reverse units.
- Malformed completed JSON is now a sanitized `MALFORMED_RESULT` upstream 502 instead of being reported as invalid user input. Upload failure, auth, quota, throttle, unknown task state and normalization cases remain mock tested.

**Independently verified live scans: zero. Provider requests in Phase 2: zero. Public deployment: not verified.** Shared reviewer access is private-review only; public anonymous live access remains off pending durable budget enforcement.

## Authentication clarification — 17 October 2026
For the selected **current Skin Analysis V2.1 REST API**, the official [Quick Start authentication section](https://docs.makeupar.com/develop/quick_start_guide) instructs sending the API Key as a Bearer credential. The [V2.1 reference](https://docs.makeupar.com/reference/ai_skin_analysis/v2.1) uses BearerAuthenticationV2. Neither requires an additional YouCam Secret Key, token-signing step or credential exchange for this flow. The official [Perfect Corp FAQ](https://docs.perfectcorp.com/develop/faq) also explicitly identifies the API Key as the Bearer token, while separately acknowledging that account secret keys exist. This is specific to these endpoints, not a blanket assertion about every Perfect Corp product or older API.

Implementation matches: `src/lib/youcam/client.ts` loads `YOUCAM_API_KEY` server-side and builds the Authorization header. File registration and task creation/status use this client. Signed image upload uses only provider-returned upload headers, not the API bearer. No provider `YOUCAM_SECRET_KEY` variable is needed or read. `.env.example` now states that explicitly.

`TASK_TOKEN_SECRET` is a separately generated **DermaLoop HMAC signing secret**, and `REVIEWER_ACCESS_CODE` is a separately generated private reviewer credential. Neither should reuse the YouCam API Key or Secret Key. Leave `YOUCAM_LIVE_ENABLED=false`. No credential values were read, printed or logged for this audit; no authenticated/live API request or credit-consuming operation was made. This confirms the documented authentication method, not validity of an account credential.

## Current upload configuration resolution
`YOUCAM_UPLOAD_HOSTS` is now optional: unset/blank uses only the exact hostname shown in the official workflow example. Explicit reviewed lists replace that default and fail on malformed entries. Adapter and environment audit share the same parser; neither auto-approves returned hosts. See [upload security policy and regional limitations](UPLOAD_SECURITY.md). This supersedes earlier instructions that treated the variable's mere absence as an error. The complete regional hostname set is not documented; the example is not a guarantee of account compatibility. No live verification performed.

## Actual Phase 3B registration result
The user subsequently authorized exactly one metadata registration, accepting potential free-unit deduction. HTTP 200 and schema validation confirmed File API credential acceptance and the existing approved storage hostname. No PUT/task/retry occurred, live remains false, and account usage delta is unavailable. The earlier zero-request statements above describe prior phases; [Phase 3B evidence](PROVIDER_HANDSHAKE.md) is the current provider-verification boundary.


## Actual Phase 3C controlled attempt
See [Phase 3C result](PHASE3C_RESULT.md) for the current evidence boundary. One registration, one signed image PUT and one V2.1 four-SD task creation returned HTTP200. One status GET returned task_status=error. No scores, normalization success or saved baseline are claimed; no retry occurred. Credit consumption/current balance are unmeasured. Public live scanning remains false. This supersedes preparation-only statements above without converting a failed task into a successful integration result.


## Phase3D offline diagnosis
The original engine error detail was discarded and cannot be recovered from retained local evidence. The official status schema supports data.error/data.error_message. Future failures now preserve exact documented diagnostic codes/categories and message-presence flags, never provider prose or unknown tokens. Face framing is the leading unconfirmed hypothesis. All159 tests, type/lint/build and environment checks pass. The user reports screenshot-supported−9/+9 transactions, zero net analysis units for the observed attempt; no future refund guarantee is asserted. No provider requests were made, no attempt marker was reset and live stays disabled. See [investigation and ranked causes](PHASE3D_INVESTIGATION.md).
