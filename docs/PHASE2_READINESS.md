# Phase 2 readiness evidence — 17 October 2026

**Outcome: local fictional demo validated; submission readiness is NOT established. Live YouCam acceptance and public deployment remain unverified.**

## Isolation
The app remains at `/Users/mriduldabral/Downloads/Codex/Qloo`. There is no Git repository or ancestor repository, hence no remote, branch, commits or tracked-change report. The application identity is DermaLoop; no unrelated Qloo source was found. No files moved, Git initialized or remote published. See [isolation audit](REPOSITORY_ISOLATION.md) for executed commands and boundaries.

## Complete observed journey
Automated Chromium browser interactions began at the landing page and followed actual links/forms. No direct insertion of analyses into IndexedDB was used for the main journey.

| Step | Observed evidence |
| --- | --- |
| Enter sample | Explicit sample CTA → labeled fictional notebook; no provider requests observed |
| Skin Atlas | Four historical entries; selectable readings show moisture raw 62 on Oct 1 and 66 on Oct 15; accessible table has four rows |
| Signal vs. Noise | Oct 1→15 raw delta +4; Oct 1→9 delta −1; Oct 9 brightness 183 and sharpness 29 produce capture-context warning; SVG and table available |
| Routine Lab | Created a clearly fictional experiment with user-entered product, start/checkpoint and notes; added dated observation; both survived reload |
| Decision Studio | Purchase question produced “Wait for another reading,” rule D03, stored goal=moisture, evidence Oct 9 and Oct 15; clicked evidence link and checked actual earlier/later selectors |
| Export | Downloaded real JSON and parsed it: namespace demo_fixture, four fictional scans, two experiments including new observation, decision and rule references |
| Delete | Confirmed deletion; reloaded; switched to sample notebook without seeding; Atlas empty; queried IndexedDB to confirm no surviving scans/routines/decisions |
| Re-import | Imported the exported sample JSON through the UI and recovered four entries, still labeled fictional |
| Empty/baseline | Imported a single fictional reading; baseline copy, no comparable delta, D01 “Not enough evidence”; empty real notebook never receives sample readings |
| Failure recovery | Forced an IndexedDB write failure: visible save error, observation draft retained, experiment form retained |

[Actual fictional export](evidence/phase2-sample-export.json). It contains no face image, live reading, key or reviewer code. It is demonstration evidence only.

## Fixed findings
- Routine cards shared one observation draft: now drafts are keyed by experiment ID.
- Failed saves cleared drafts/closed forms: save outcome now controls clearing and closing; a failed live score save cannot show success.
- Decision records omitted the selected goal: new cards store/display it; existing schema-v1 records remain readable.
- Signed upload header parser rejected numeric Content-Length from official OpenAPI example: safely normalizes strings/numbers before PUT.
- Malformed completed results were classified as user-input errors: now sanitized upstream 502.
- Start/poll browser requests lacked individual timeout bounds: added browser and server pipeline budgets while keeping no automatic task retry.
- Two-point charts occupied only part of the available chart width: spacing now uses the full bounded plot area, single point centered.
- Delete/import lacked explicit completion feedback: added accessible status messages. Existing brand, palette, typography, artwork and layout preserved.

A deeper initial test reproduced the shared-draft bug. A later baseline test initially matched duplicated copy with an ambiguous locator; it was narrowed to the chart panel. No failing test was suppressed or skipped.

## Verification categories
**Completed functionality:** local navigation, real browser storage, form creation, journal persistence, deterministic decisions/evidence, export/re-import/delete, upload preparation, guarded server routes, charts and capture context, empty/error states, mobile layouts.

**Sample/fixture-only evidence:** all historical scores, trajectories, capture values and displayed analysis-derived decisions. Provider transport/response tests use mocks; the neutral JPEG used by browser upload tests is a synthetic gray bitmap, never a live face analysis.

**Independently verified live functionality:** NONE. No actual File API registration, storage upload, provider task, live status/result or unit deduction verified. Official documentation was reviewed, but that does not establish account-specific acceptance. See [integration audit](YOUCAM_INTEGRATION.md).

## Executed checks and artifacts
- `npm run check`: TypeScript, ESLint, **47 Vitest tests passed**, production Next build passed.
- `npx playwright test`: **14 browser tests passed** after fixes. Includes landing/sample journey, persistence, export/delete, denied camera, anonymous API rejection, upload preparation/cancellation, evidence navigation, baseline, storage failure and draft isolation.
- Responsive traversals at 320/375/768/1440 px across all seven routes; no horizontal document overflow.
- 18 screenshot files in `docs/screenshots/`. Reopened actual desktop comparison, mobile routine, populated desktop/mobile decision screenshots during Phase 2; no clipping or horizontal overflow observed. Prior visual identity preserved. This is not a full manual screen-reader or multi-browser certification.
- `npm run youcam:smoke`: exit 0, explicit SAFE/no network. Live invocation not executed.
- Production client files searched for server credential variable names/Bearer references: no matches. No actual API key was present, so this is structural inspection, not proof using a real secret.

## Remaining gates
1. Dedicated owner-approved Git repository and intended remote, with source committed and no secrets.
2. Credentials, regional upload-host confirmation and explicit unit-spend authorization; one consented adult scan with redacted request/result evidence and actual cost. No live task retries on ambiguous outcome.
3. Accessible public deployment, verified against real host request/time limits, HTTPS camera behavior and judge access requirements. Live remains off except controlled private review; no durable public credit-abuse limiter/budget ledger exists.
4. Record/publicly host the honest demonstration video and complete submission. Do not call the project submission-ready before live API integration and public deployment have both been verified.

Phase 2 budget: ₹0. YouCam credits consumed: 0.
