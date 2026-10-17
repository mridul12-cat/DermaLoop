# DermaLoop

**Change less. Choose better.** A skincare decision notebook that puts context around a score before another purchase.

**Judge journey:** Landing → **Explore sample journey** → Skin Atlas → Signal vs. Noise → Routine Lab → Decision Studio. No account, API key or selfie required. The sample history and journal are visibly fictional.

**Real integration evidence:** `/verification` displays a fixed, read-only projection of genuine acne, pore, texture and redness measurements from one successful Perfect Corp YouCam Skin Analysis V2.1 SD task. It is labeled **Live YouCam API — Synthetic Test Image**. Raw/UI scores remain distinct. The original private baseline, portrait, provider identifiers and credentials are excluded. This is integration verification, not clinical validation.

Public scan endpoints are hard-disabled independently of environment settings. The verified result cannot be imported into a personal notebook. No API calls are needed to browse the public demo.

## Run

Node22.12+ and npm are required. The release was validated locally with the installed Node runtime; select a supported Node24 runtime on Vercel and verify after deployment.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. The sample journey and verification page need **no credentials**. Keep `YOUCAM_LIVE_ENABLED=false`; never configure provider credentials on the public deployment.

```sh
npm run check
npm run test:e2e
npm run public:check
```

Playwright uses an isolated local port3100. Install Chromium if unavailable with `npx playwright install chromium`. Screenshots and browser traces stay ignored under `docs/screenshots/` and `test-results/`. `npm run test:e2e:production` runs the same suite against the built production server after `npm run build`.

## Optional local live testing

Developers can use their own YouCam account in a separate loopback-only development companion. Follow [LOCAL_LIVE_SETUP.md](LOCAL_LIVE_SETUP.md) for explicit activation, consent, credits and the durable one-attempt allowance. This never enables public Scan Studio or changes the verified public baseline.

## What works

- Skin Atlas: four fictional historical readings, selectable signals, charts and accessible data tables.
- Signal vs. Noise: compatible raw-score comparisons plus lighting/sharpness context; no claim that a change proves improvement.
- Routine Lab: create experiments, checkpoints, dated observations and persistent local records.
- Decision Studio: rule-based suggestions with traceable readings and explicit reasons.
- Privacy: separate fictional/personal namespaces, export, validated sample-only import, deletion and accessibility preferences.
- Verified baseline: actual saved four-metric provider output in a separate read-only view, with no face image or provider identifier.

Notebook persistence is per browser and origin using IndexedDB. No account sync, cloud storage, advertising, affiliate catalog or additional AI API is used. The app is not medical advice and does not establish product efficacy.

## Optional listening

The miniature **Morning Stillness** cassette plays the original user-supplied composition once at an initial 15% volume. Browser-blocked autoplay offers a direct tap-to-play fallback. Pause preserves your place. Previously saved sound-off preferences remain respected. OS and saved reduced motion stop the reels without disabling chosen audio. [Playback behavior and validation](docs/MORNING_STILLNESS.md).

## Repository and privacy

This is the isolated `DermaLoop` repository. The parent Qloo workspace and its private Phase3C/3F records are preserved separately; do not deploy the parent directory or copy its `.private`/credential files here. This repository contains only curated historical evidence and the explicitly allowlisted public score projection.

`.gitignore` excludes secrets, private storage, raster photos, captures, generated screenshots, caches and test artifacts. `.vercelignore` excludes development/audit assets from CLI uploads. Enable the staged-file guard after cloning:

```sh
git config core.hooksPath .githooks
```

The hook rejects sensitive paths even when force-staged. As with any local hook, an operator can explicitly bypass it; it is an accidental-disclosure safeguard, not a permission system. Before publishing run `npm run public:check` and review staged files. Never put provider keys in `NEXT_PUBLIC_*` variables.

## Evidence and submission

- [Living Editorial motion and QA audit](docs/PHASE6_EDITORIAL_POLISH.md)
- [Current readiness audit](docs/FINAL_AUDIT.md)
- [Production deployment instructions](docs/DEPLOYMENT.md)
- [Devpost copy](docs/SUBMISSION.md)
- [Two-minute demonstration script](docs/DEMO_SCRIPT.md)
- [Successful real integration evidence](docs/PHASE3F_RESULT.md)
- [Isolation audit](docs/REPOSITORY_ISOLATION.md)

The earlier Phase3C task failed; the subsequent separately authorized Phase3F task succeeded. Neither execution marker was reset. This phase makes no new YouCam requests. Actual Phase3F unit deduction/current balance remain unmeasured. No paid service or billing activation was performed.

**Public deployment and final submission are pending.** Official code repository: [mridul12-cat/DermaLoop](https://github.com/mridul12-cat/DermaLoop). A public URL and an uploaded video are still required. Do not claim full submission readiness until the deployed site passes the documented smoke checks.

## License

MIT for original application code and illustrations; dependencies retain their own licenses. Portraits and private operator artifacts are not distributed. The intentionally published verification projection contains synthetic-test scores only.
