# Devpost submission copy — draft pending deployment and video

**Project:** DermaLoop

**Tagline:** Change less. Choose better. Context before your next skincare purchase.

## Inspiration

Skincare advice is abundant; context is harder to find. A one-off score says little about lighting, a recent routine change or whether another product is justified. We wanted a calmer notebook that makes those limits visible.

## What it does

DermaLoop turns observation into a deliberate loop: Skin Atlas → Signal vs. Noise → Routine Lab → Decision Studio. Compare compatible readings alongside capture conditions, journal one experiment at a time, then see a transparent suggestion with the exact readings and rule behind it. Sometimes the useful decision is to wait.

The complete interactive sample uses clearly labeled fictional readings and needs no account or selfie. Notebook data stays in the browser, with export and deletion. A separate read-only integration page shows genuine saved provider measurements from a synthetic test image; it never enters a real person's progress history.

## YouCam integration

We independently executed Perfect Corp YouCam Skin Analysis V2.1 using secure file registration, one signed JPEG PUT, one asynchronous SD task and bounded status polling. The successful controlled test returned acne, pore, texture and redness raw/UI scores, which were validated and normalized. Its published projection is labeled **Live YouCam API — Synthetic Test Image**. The original private baseline, face image, credentials and provider identifiers are excluded from the public deployment.

An earlier controlled task failed. We preserved its evidence, corrected face framing offline, and separately authorized one further test, which succeeded. That supports the framing hypothesis without proving the original rejection cause. No clinical accuracy or skincare improvement is established by synthetic-image measurements. Public provider scanning is disabled; viewing the demo spends no API units.

## Built with

Next.js, React, TypeScript, Zod, IndexedDB, Sharp, CSS/SVG, Lucide, Vitest and Playwright. No additional paid AI service, product affiliate catalog or tracker.

## Challenges and learning

Asynchronous APIs can return HTTP200 while the task itself fails. We added sanitized error-code preservation, exact upload-host enforcement, durable single-attempt claims, no POST/PUT retries and honest separation of raw/UI scores. We also learned that file resolution alone does not establish usable face framing and that a homemade sharpness proxy is not provider confidence.

## Responsible value

The product helps people ask better questions before adding a skincare variable or buying another product. It does not diagnose, prescribe or claim measured savings, treatment efficacy or clinical outcomes. Live and fictional provenance are explicit, and local data can be exported and removed.

## Judge access and links

- Public demo URL: **pending publication and smoke verification**.
- GitHub URL: [mridul12-cat/DermaLoop](https://github.com/mridul12-cat/DermaLoop).
- Two-minute video: **pending recording/upload**; use `DEMO_SCRIPT.md`.
- Choose **Explore sample journey** on the landing page. Open **Verified integration** for the saved synthetic-test result. No credentials are needed, and no new provider task runs.

The owner must verify current event eligibility, submission rules and required links before submission. The product has not been submitted. Actual Phase3F unit consumption/current account balance were not independently measured; do not replace that with an assumed charge.
