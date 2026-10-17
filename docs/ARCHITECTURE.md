# Architecture
Next.js App Router with Node server routes; React, TypeScript, CSS, Lucide icons, Zod, idb, Sharp; Vitest and Playwright. No analytics, external fonts, commercial assets or additional AI APIs.

`/` introduces the philosophy. `/app` Atlas, `/app/timeline` comparisons, `/app/routine` experiments, `/app/decision` auditable suggestions, `/app/scan` capture and `/app/privacy` storage controls. All direct links work. Browser history uses normal links.

## Trust boundaries
Browser: orientation-aware bitmap decode, resize preserving short side >=480, JPEG re-encode stripping EXIF; local preview, pixel heuristics, consent, private reviewer code in memory only. IndexedDB v1 contains two separate namespaces. Scores, routines, observations and decision evidence persist; face images do not. Schema version 1 is validated on read/write/import; unknown future versions rejected rather than guessed. No migration from a preexisting version exists because this is the first version.

Server: `server-only` provider and security modules; image stream limited to 3.5 MB, magic and decode/dimension validation with Sharp. File init → signed PUT → asynchronous task start. No disk persistence. An HMAC token binds task, capture metadata, consent time and 3-minute expiry. Capture quality is explicitly user-device supplied, not authenticated provider output. Results are normalized only by the server.

Storage host: exact environment allowlist, HTTPS, no credentials, ports or redirects. Provider bearer is sent only to the configured API origin. Unknown scores are skipped; malformed known rows fail. No mask URLs persisted. JSON SD only; ZIP/HD/v2.0 alternate adapters are outside this release.

## Quota boundary and limitations
Live defaults off. Private reviewer access uses an independent >=32-character secret, plus same-origin check. This is a private reviewer mechanism, NOT a distributed abuse limiter. Never expose the secret in a public page. Enable only for controlled review after unit-cost approval; rotate/disable immediately afterwards. No durable budget counter is configured. Anonymous public live scanning remains disabled.

The UI locks while a scan is submitted and does not automatically retry creation. Manual resubmission, network loss after submission, or malicious requests with a reviewer secret can duplicate a charge. No claim of provider idempotency. A production public live service needs durable per-user and global budget enforcement before enabling it.

Poll every 10 seconds for <=150 seconds. GET-only bounded transient retries. Client abort stops local work, not an upstream task. Ambiguous creation failure tells the user no automatic resubmission occurred. No upstream cancellation/deletion endpoint is asserted.

Comparison uses source, provider, API/engine version, metric, whole region, SD/HD mode and raw-score unit. Engine builds are not pinned by the provider contract; same API version is a practical proxy, not a guarantee of unchanged weights. No clinical inference, significance or causality. Photo quality thresholds are descriptive UI heuristics, not validated confidence.
