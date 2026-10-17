# Phase 7 — local live workflow audit

17 October 2026. Implemented locally; not committed, pushed or deployed. No real YouCam API requests, photographs, credit consumption, purchases or production configuration changes were made.

## Architecture and isolation

A separate Node development companion runs at `http://127.0.0.1:3210`, outside the Next route tree. `npm run local:live -- --allow-local-live` requires development mode, both explicit local/live environment flags, the operator's own server-side key and exact approved API/storage origins. Next dotenv loading matches application precedence. Missing opt-ins and known hosting/CI environments refuse startup. The actual socket binding/peer, port, Host, Origin, fetch-site, proxy headers and rotating in-memory session are independently checked.

There are no new public Next routes. Public API handlers, public-access constant, provider adapter/authentication, public four-score projection, personal/sample notebook behavior and historical controlled runners have no diff. No dependencies were added. Companion sources are also excluded by `.vercelignore`; no provider keys are required by builds.

One filesystem-exclusive and fsynced claim per local clone is consumed before provider registration. It persists across restarts and failure; there is no reset route. Registration, signed PUT and task creation happen once with the four exact SD actions. Only existing status GETs may receive bounded retry, with 12 polling rounds and a 180-second overall abort signal. No provider identifier, image or raw response is persisted. Prepared image bytes exist transiently in memory. A validated raw/UI score projection is saved privately; arbitrary JSON fields are stripped and duplicate/unrequested metrics rejected.

The UI distinguishes real adult consent from synthetic-test authorization and requires separate current free-credit and one-task budget confirmations. Billing and balance remain operator attestations, not independently queried facts. An intended 12-unit scope is not an atomic provider cap. Actual account pricing/ancillary costs may differ. The setup guide links current official pricing/retention/authentication documentation and explains shutdown, errors and returning to sample-only mode.

## Verification

- `npm run check`: **PASS** — 228 unit tests in seven files, TypeScript, ESLint and production build.
- 44 new unit cases cover activation/hosting rejection, socket/origin/session restrictions, rate limiting, durable quota races/restart semantics, unsafe private storage, image type/size/corruption/orientation/metadata, provider failures and missing metrics, no mutation retry, upload host/header security, result projection, actual CLI production refusal and production routes with live flags enabled.
- `npm run test:e2e:production`: **PASS — 31 browser tests**, including all existing coverage and a new offline local companion workflow. It tests authorization gates, rejected origin/missing budget, invalid image before quota reservation, exact four-score fixture normalization, persistence, exhausted quota, synthetic disclosure and 320/375px layouts.
- The entire 31-test production browser suite also passed with `YOUCAM_LIVE_ENABLED=true DERMALOOP_LOCAL_LIVE=true` in the production server process. Public routes still return `403 PUBLIC_SCANNING_DISABLED`. The local fixture uses an explicitly injected mock transport; global real fetch is disabled and no dotenv/key is loaded for it.
- Actual CLI startup tested offline with a deliberately fake key and all provider fetch disabled: correct dotenv loading, development opt-ins and loopback binding. It was stopped without any registration or image/task request. Default non-opted-in startup refuses cleanly.
- An existing journey test had matched a textarea draft before save completion. It now waits for the persisted-save confirmation before reload; assertions/coverage were strengthened, not removed. Public notebook implementation is unchanged.
- `npm run public:check`: **PASS**, public live flag remains disabled in the real local file and hard-disabled public routes remain intact. All new public text sources reviewed separately because the default release guard lists tracked files. No credential/signed-URL pattern findings.
- `git diff --check`: **PASS**. Screenshots under `docs/screenshots/local-live-offline-{320,375}.png` remain ignored, explicitly marked offline fixtures, and are not live-analysis evidence.

## Remaining risks and limits

No new live verification was performed. A real local attempt requires its operator's own credentials, suitable image, current account review and explicit image/credit authorization. Capture framing/quality is reviewed by the operator; file validation is not face-detection certification. The tool cannot inspect or enforce provider-side balance, billing, unit caps, cancellation or refunds.

Loopback controls assume a trusted personal machine and no tunneling/proxy/port forwarding. A malicious local process or machine owner can read local secrets or intentionally modify code/quota files. This is not a multi-user/network service. The quota never automatically authorizes another attempt. Terminal diagnostics are sanitized in memory; after a crash without saved successful output the marker yields an interrupted state, without resuming provider polling. Other browsers, physical-device behavior and provider account/region differences remain unverified for this new path.
