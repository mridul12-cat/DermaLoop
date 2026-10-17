# Secure local YouCam analysis

The public Vercel app stays sample-only. This workflow is a **separate local development companion**, not an activation switch for public Scan Studio. It uses the existing verified File API/upload/task/status adapter and normalization. No provider credential is needed to build or browse the public demo.

## Your own account and credentials

Create your own account through Perfect Corp's [official developer quick start](https://docs.makeupar.com/develop/quick_start_guide). Obtain an API key from your own YouCam dashboard and check its API access, free-unit balance, expiration and billing settings. API calls use `Authorization: Bearer API_KEY`; a separate Secret Key is not required by this server-to-server workflow. Never paste a key into chat, source code or browser inputs, and never use `NEXT_PUBLIC_*` for credentials. Do not reuse the original project's credentials or copy any of its private evidence or portraits.

```sh
git clone https://github.com/mridul12-cat/DermaLoop.git
cd DermaLoop
npm ci
cp .env.example .env.local
```

Edit `.env.local` as plain UTF-8 text in your editor. Set your own key and the local activation flags:

```dotenv
YOUCAM_API_KEY=YOUR_OWN_KEY
YOUCAM_LIVE_ENABLED=true
DERMALOOP_LOCAL_LIVE=true
YOUCAM_BASE_URL=https://yce-api-01.makeupar.com
YOUCAM_UPLOAD_HOSTS=yce-us.s3-accelerate.amazonaws.com
```

`TASK_TOKEN_SECRET` and `REVIEWER_ACCESS_CODE` belong to historical private-review workflows and are not needed by this companion. It generates a fresh in-memory operator session token at each startup. No secrets are logged. The historical `npm run env:check` audits the older private-review workflow, not this companion's requirements; the companion performs its own startup checks. Next's dotenv loader is used; inherited shell variables can override files. Do not print your environment while debugging.

## Start securely and authorize one attempt

```sh
npm run local:live -- --allow-local-live
```

Use exactly **http://127.0.0.1:3210**. The companion defaults an unset `NODE_ENV` to `development`; an explicitly configured production/test environment is rejected. It refuses known hosting/CI environments. There is no host or port override; the socket binds exclusively to IPv4 loopback. The regular `npm run dev`, `next start` and Vercel routes never mount this API.

1. Choose your own adult image or a synthetic adult test image and select its actual provenance.
2. Choose a JPEG or PNG: 32 bytes–3,500,000 bytes, minimum 480px on the short side and maximum 2560px on the long side, single frame, valid decodable content. EXIF orientation is corrected, metadata removed and a clean sRGB JPEG prepared in memory. No upscaling, sharpening or skin alteration. Review the preview for a clear frontal face, good light and close framing; file checks do not certify face detection or capture quality.
3. Confirm ownership/adult consent for a real image, or synthetic-test authorization for a fictional one. Synthetic scores do not validate real skin health.
4. Confirm the current balance and billing state in **your own dashboard**: sufficient existing free units, no paid billing, auto-refill disabled. Confirm the intended budget and the one-attempt scope.
5. Submit once. Registration → one signed JPEG PUT → one V2.1 task with `acne`, `pore`, `texture`, `redness`, `format: json` → bounded polling. No POST or PUT is retried. The server polls at 10-second intervals (at most 12 rounds, at most three HTTP attempts per status GET under the existing adapter, 180-second workflow deadline). The browser only reads local state; it cannot create replacement tasks.
6. The read-only local result screen shows exact genuine raw/UI values, actual provenance and missing UI fields explicitly. It does not use sample fallbacks, invent missing raw metrics, import into personal histories or alter the public verified synthetic baseline.

### Credits are real

The [published unit table](https://docs.makeupar.com/reference/ai_skin_analysis/section/overview/unit-consumption) lists **9 units for 1–4 SD concerns**, checked 17 October 2026. Recheck pricing before your attempt. This is an expected analysis cost, not a guarantee of complete ancillary cost or a provider-enforced 12-unit cap. The app cannot independently inspect balance, free/paid-unit selection or billing. It cannot prevent monetary charges if you misconfigure your account. Do not proceed if pricing, account state or possible ancillary charges exceed your accepted budget. No purchase, subscription or auto-refill functionality is provided. Compare actual dashboard usage afterwards; failures are not a universal refund guarantee.

## Independent security boundaries

- Development environment **and** `DERMALOOP_LOCAL_LIVE=true` **and** `YOUCAM_LIVE_ENABLED=true` **and** explicit CLI opt-in are required.
- Actual server binding and peer socket must be `127.0.0.1`; exact Host `127.0.0.1:3210`, exact Origin on mutation, fetch-site restrictions, no forwarded/proxy headers, and a constant-time checked per-start session token protect requests. No CORS access; restrictive CSP/frame protections; no caching.
- One filesystem-exclusive, fsynced `.private/local-live/attempt.json` claim is consumed **before the first provider request**. Races, process crashes, ambiguous outcomes and terminal errors never return the allowance. There is no reset endpoint or automatic restart/resume. Restarting preserves the spent allowance. This quota bounds application attempts, not provider-side units.
- A global limit of 30 local requests per minute, bounded request bodies/timeouts and strict image decoding limit resource use. This is a single-operator tool, not a multi-user service.
- Fixed official API origin and exact reviewed storage host; authenticated File responses only; HTTPS signed PUT; redirects forbidden; no bearer/API token or arbitrary headers sent to storage. A different returned host is rejected, never automatically trusted. Stop and verify official evidence before making a reviewed code change.
- Existing `/api/scan/start` and `/api/scan/status` remain hard-disabled independently of all environment flags. Tests exercise production with both flags true and assert `403 PUBLIC_SCANNING_DISABLED`.

Never expose this companion through a tunnel, reverse proxy, port forwarding, container bridge, remote workspace or shared computer. A malicious local user/process can read your files or deliberately rewrite/bypass local guards; loopback and quotas are not a sandbox against the machine owner. Do not remove/reset the durable attempt marker to bypass the allowance. No additional live attempts are automatically authorized.

## Privacy and retention

The selected original lives in browser memory; image bytes are transient in the local server and are not written to disk. EXIF and other metadata are stripped before upload. The provider's [retention policy](https://docs.makeupar.com/develop/file_retention_period) currently specifies 30-day uploaded/generated media retention and two-hour download URLs. Local clearing does not retract provider processing or delete its copy. This tool does not fetch masks or offer provider-side deletion/cancellation.

Only a sanitized score baseline is saved in `.private/local-live/result.json` with mode 0600. Its directory is private and symlink-checked. Provider IDs, presigned URLs, keys, portraits and raw responses are not persisted or sent to the UI. Results are private and device-local; never commit or deploy `.private`. Keep the attempt marker even when removing the saved score file. A restarted interrupted attempt cannot be continued from a provider ID because none is retained.

## Errors and troubleshooting

- `LOCAL_LIVE_DISABLED` / refused startup: check the two flags, CLI opt-in, development mode and hosting/CI variables. Do not force this to run on Vercel. An occupied port fails rather than selecting an externally reachable alternative.
- `LOCAL_ORIGIN_REJECTED` / `LOCAL_SESSION_REQUIRED`: open the exact loopback URL directly. Do not use `localhost`, a LAN address or a proxy. Reload after restarting; session tokens rotate.
- `LOCAL_CONFIGURATION_REJECTED`: verify the pinned API origin/storage hostname and your own nonempty key. An unexpected regional host must be independently reviewed; do not add a wildcard or broad suffix.
- `PRIVATE_STORAGE_UNSAFE`: local result storage must not be a symlink and `.private/local-live` must have owner-only permissions. Do not change unrelated historical private records. Storage failures fail closed before requests.
- Invalid image: correct file size, dimensions, format and framing. Validation errors before reservation do not spend the durable allowance. Reload after correcting the input; no automatic upload retry occurs.
- Authentication/quota/provider failure: inspect the dashboard yourself. The UI keeps whitelisted diagnostic codes/categories, without provider prose or IDs. No retry is made for registration, upload or task creation.
- Timeout, server exit or lost connection: the provider may still complete or deduct units. The marker remains consumed. Reload only to view local status; never interpret a network failure as permission to submit another task. Terminal diagnostics remain in memory for the running process; after restart without a saved successful result the UI reports an interrupted attempt.
- Normalization failure or missing requested raw metrics: the task is not resubmitted; missing values are not invented. The allowance remains consumed.
- `LOCAL_RATE_LIMIT`: wait for the next minute; the rate window replenishes, the durable scan allowance does not.

## Return to sample-only mode

Stop the companion with Ctrl-C. Set `YOUCAM_LIVE_ENABLED=false` and `DERMALOOP_LOCAL_LIVE=false` in your local file, and unset any overriding shell flags. Run `npm run dev` for the original sample experience. Keep your key private or remove it from your own dotenv file. Never copy it to Vercel. Preserve all durable attempt evidence. `npm run public:check` intentionally fails while a live flag is active: return to disabled mode before preparing a public release.

## Offline validation boundary

`npm run check`, `npm run test:e2e:production`, `npm run public:check` and `git diff --check` validate the application. The new browser test launches a clearly marked offline fixture with no dotenv loading, a fake key and real network fetch disabled. Its scores are transport fixtures, not another live verification. No new YouCam call is required or authorized by running tests. A future genuine local test requires its operator's own explicit image/credit authorization.
