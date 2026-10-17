# Production deployment — prepared, not published

Deploy only the isolated DermaLoop directory. Never choose the parent Qloo workspace as project/root directory. No provider credentials or private baseline files are required by the public app.

## Local verification

1. `npm ci` using the committed lockfile. Use a currently supported Vercel Node runtime (Node24 recommended), then verify again on the host.
2. `npm run check` for types, lint, automated tests and production build.
3. `npm run test:e2e:production` for the browser suite against `next start` on port3100.
4. `git config core.hooksPath .githooks`, inspect `git diff --cached`, and run `npm run public:check`. This catches accidentally included private paths; review remains necessary.

The public sample and fixed verification projection work without an API key. `.env.local` is ignored; the local isolated copy contains only `YOUCAM_LIVE_ENABLED=false`. The original credential file and operator records remain outside the repository/deployment root.

## Publication steps requiring account access / approval

No remote repository, push or deployment has been created. Obtain explicit approval before a GitHub push. Select the intended GitHub repository/visibility and Vercel account/project before publishing. Do not purchase a domain, upgrade a plan, activate billing or paid add-ons.

Use Vercel's Next.js framework preset with `npm ci`, `npm run build` and the framework-managed output. `vercel.json` sets the framework/build command and live flag=false. Keep auto-refill and all provider billing controls untouched. Select an eligible free plan only; if the account/workload requires a paid plan, stop.

The [official Next.js deployment guide](https://vercel.com/docs/frameworks/full-stack/nextjs) describes framework detection. [`.vercelignore`](https://vercel.com/docs/deployments/vercel-ignore) provides an additional CLI-upload exclusion layer; do not rely on it to sanitize a Git repository. Git tracking checks and absence of private files from this root are the primary boundary.

Do **not** set YOUCAM_API_KEY, TASK_TOKEN_SECRET or REVIEWER_ACCESS_CODE on this public project. Set `YOUCAM_LIVE_ENABLED=false` for every deployment environment. The source constant `PUBLIC_PROVIDER_ACCESS=false` also returns403 from both scan endpoints before body parsing or provider use, even if an environment value is accidentally true. Changing that code would require a new review; this release does not support public provider scanning.

`src/lib/verified-baseline.json` is an explicit public projection of four actual raw/UI scores and safe provenance. It contains no original baseline record, provider identifier, URL, face pixels, capture metadata or credential. Its publication is intentional. No arbitrary import or upload updates it; no cloud database is used. Keep all private operator CLI records outside this deployment.

## Required checks after a public URL exists

- Open the landing page and `/verification` anonymously, in desktop/mobile private windows.
- Complete Atlas → comparisons → experiment/observation → decision/evidence → export → delete → reload. Confirm fictional labels and namespace separation.
- Confirm the verified synthetic reading matches the four approved public score values, is read-only and never becomes personal history.
- Confirm `POST /api/scan/start` and `POST /api/scan/status` return403/PUBLIC_SCANNING_DISABLED without credentials or provider traffic; no scan is authorized by this smoke check.
- Confirm no overflow at320/375/768/1440px, working keyboard focus, reduced motion and useful errors when browser storage is unavailable.
- Inspect the deployed client assets for credential/provider-identifier leakage; verify security headers, correct404 responses and that HTTPS/public access do not require judge sign-in.
- Record the actual URL, runtime, deployment revision, checks and screenshots in the final audit. This is not yet completed.

A local production build is evidence of build compatibility, not proof of a public deployment or its limits. Public provider scanning remains off regardless of hosting capacity.
