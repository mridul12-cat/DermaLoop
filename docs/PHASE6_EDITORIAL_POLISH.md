# Phase 6 — Living Editorial polish

Local implementation and audit, 17 October 2026. No commit, push or deployment was performed in this phase. No YouCam requests were made.

## Inspection and plan

The initial repository audit found an isolated DermaLoop Git root on `main`, clean against the initial release. The application uses Next.js App Router, handcrafted global CSS, Georgia/Arial typography, Lucide icons and an original SVG face illustration. There is no Tailwind or animation dependency. The relevant installed Next.js documentation was read before editing.

The initial production-build screenshots covered eight routes at 1440px and 375px (16 captures). The cream/sage/green palette, editorial composition, fictional-data disclosures and read-only verification page were already coherent. Buttons, sidebar selection, metric selection and journal actions lacked connected feedback. Charts had an exact-value table but no selected-observation emphasis. Routine entries could not fold. Decision validation used only native required-field UI. The saved reduced-motion preference applied within the notebook but not the landing or verification pages.

The implementation therefore retained the identity and existing deterministic logic, added a shared CSS motion vocabulary, extended preferences globally, then refined data selection, journal folds, validation and scan-status clarity. Reading-heavy context, warnings, privacy text and capture limitations remain static. No result depends on completing an animation.

## Components changed

| Component | Refinement |
| --- | --- |
| Root layout + new `MotionPreferences` | Prepaint preference application; system/saved reduction and contrast across every route; one entry observer; lifecycle cleanup. |
| Global CSS | Shared timing/easing; reversible button/navigation/input feedback; native details progressive enhancement; restrained reveals; tablet verification layout. |
| `Face` in `brand.tsx` | Existing decorative orbital ellipses grouped for very small drift. Face paths and illustration geometry unchanged. |
| Workspace navigation/introduction | Soft active rules, hover/focus equivalents, section-heading entrance; state and route handling unchanged. |
| `Chart` + Atlas | First-visible recorded-path reveal, exact-value transition, selected point/table-row emphasis, accessible description. No interpolated scores or extra data. |
| Signal vs. Noise | Earlier/later dates and actual raw values connected by an editorial rule; actual delta transition; compatibility gate and warnings unchanged. |
| Routine Lab | Native open-by-default journal folds, retained observation drafts, editorial rules/date hierarchy, save/remove confirmations after successful persistence. |
| Decision Studio | Whitespace validation, focused invalid input with linked error, quiet save status, reasoning reveal and small existing-brand closing-loop motif. Decision rules/evidence unchanged. |
| Verification | Four measurement entrances staggered by 60ms, clearer raw/UI spacing and numbered provider workflow. Exact public projection unchanged. |
| Scan Studio | Explicit verified-integration/public-disabled notice and routes to the genuine synthetic test or complete fictional journey. Capture/submission safeguards unchanged. |

## Motion contract

- Press: 150ms. Hover/focus/color: 200ms. Native folds: 280ms where supported.
- Section/hero entry: 440ms, 6px maximum translation; hero stagger 50ms. Annotation reveal: 500ms, opacity only.
- Recorded chart path: 680ms. Actual numeric replacement: 180ms fade/2px translation; no intermediate count-up values.
- Decorative orbit: 20 seconds, ±0.65° and 2px. Only one continuous animation, paused off screen and when the document is hidden. The face itself never animates.
- Closing loop: 700ms, once. Evidence text uses restrained 60ms spacing.
- Content is visible by default; entry observation adds enhancement. No scroll handlers, JS animation loops, scroll-jacking, animated filters or new dependencies.
- Details use native semantics and keyboard controls; browsers without intrinsic-size interpolation retain immediate, functional disclosure.

Either OS `prefers-reduced-motion: reduce` **or** the saved “Reduce motion” setting removes nonessential animation and transitions globally. The app never overrides OS reduction with a full-motion setting. Preference changes take effect immediately and persist across reloads/public pages. Focus outlines, metric selection, exact tables, warnings and all functionality remain available. Higher contrast also extends to public pages.

## Validation evidence

- `npm run check`: **PASS** — 184 unit tests in six files, TypeScript, ESLint and production build.
- `npm run test:e2e:production`: **PASS — 30 tests** (all 20 existing tests plus 10 new checks). No existing coverage removed.
- New browser coverage: OS/saved reduction; immediate preference updates; ambient scope/pause; exact chart values/selected reading; keyboard/history/direct navigation; journal draft folding and persisted save/delete; decision error focus and evidence links; immutable four-score verification and disabled scan endpoints; mobile CPU-throttled stability; meaningful public content without JavaScript.
- Existing journey tests still validate export contents, actual IndexedDB deletion, namespace separation, sample import, failed-save recovery and sample-only baseline behavior.
- 4× CPU-throttled Chromium at 375px passed the layout-shift threshold of <0.01 for landing entrance and a settled Atlas metric change, with no page errors. This is a bounded local check, not field Core Web Vitals or a physical-device benchmark.
- `npm run public:check`: **PASS**, zero blocked tracked files; public live flag and hard-disabled routes confirmed. Newly added source, tests, screenshot utility and this document were reviewed separately because the default guard enumerates tracked files.
- Contrast calculations for the principal solid-color pairs: body/paper 12.19:1, muted/paper 4.77:1, save notice 6.41:1, error/paper 5.20:1 and white/button 7.43:1. The existing keyboard outline/paper is 3.95:1. This checks these pairs, not every rendered combination.
- `git diff --check`: **PASS**.
- Protected files have no diff: provider adapter, API routes, public-access constant, controlled runners, public baseline JSON, package/dependency manifests. Public endpoints still return `403 PUBLIC_SCANNING_DISABLED`.

## Visual review

Before: 16 captures at 1440/375px. After: 32 captures across all eight routes at 1440/768/375/320px; zero horizontal-overflow failures. Landing, Atlas, comparison, routine, populated decision, verification, privacy and scan were captured. Actual desktop/mobile images and representative tablet images were visually inspected. The final review improved scan-notice readability and stacked the verification layout at tablet widths to avoid cramped columns. Palette, fonts, illustration, hero message and genuine saved measurements remain intact.

Local artifacts are intentionally Git-ignored:

- `docs/screenshots/phase6-before/{route}-{width}.png`
- `docs/screenshots/phase6-after/{route}-{width}.png`
- `.private/phase6-before-capture.json` and `.private/phase6-after-capture.json` (layout metadata only).

Reproduce final captures: run the production build on `127.0.0.1:3102`, then `node scripts/capture-polish.mjs --after`. The capture utility blocks external-origin requests. `--before` is intended for the unchanged baseline checkout; it must not be used to overwrite the historical baseline captures after editing.

## Release boundary and limits

Ready for review and an authorized GitHub/Vercel release. This phase remains local and uncommitted. The production URL has not received these changes. Deployment and post-deployment smoke validation still require authorization.

`YOUCAM_LIVE_ENABLED=false` is preserved. No auth, request, credit-spending, provider-score, private-evidence or attempt-marker changes were made. No provider requests, purchases or paid dependencies were introduced. Synthetic measurements remain separate from personal histories and are not clinical evidence.

Keyboard focus, native disclosure semantics, chart labels/tables, reduction, contrast preference propagation and 320px layout were checked. A full assistive-technology audit, Safari/Firefox execution and physical lower-powered mobile battery/CPU profiling were not performed. No universal WCAG conformance or field-performance claim is made.
