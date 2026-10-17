# Read-only environment investigation — 17 October 2026

Root and resolved file: `/Users/mriduldabral/Downloads/Codex/Qloo/.env.local`.

Root cause: file has an RTF header, encoding controls, font table and formatting controls around the API-key declaration. Rich-text line continuations occur at the security-variable declarations. It is not a plain-text dotenv file, even though its filename ends in `.env.local`. Next.js does not interpret rich-text formatting.

Actual Next.js `@next/env` loader, run in fresh development and production processes with logs suppressed, reports:
- YOUCAM_API_KEY: absent under the required name.
- TASK_TOKEN_SECRET and REVIEWER_ACCESS_CODE: declared but empty; fail the application’s minimum 32-character checks.
- YOUCAM_UPLOAD_HOSTS: absent, so signed-upload allowlist cannot accept a host.
- YOUCAM_BASE_URL: absent; application’s documented default passes URL validation.
- YOUCAM_LIVE_ENABLED: explicitly false; passes disabled-mode requirement.

No inherited shell value or other environment file overrides the checked variables. Only `.env.local` was loaded. No duplicate declarations of checked names, accidental comments, UTF-8/UTF-16 BOM, null bytes or replacement-character decoding issues were detected. The Node parseEnv result and Next parser agree on checked variables. The issue is rich-text markup, not a valid plain-text secret rejected by an overly strict format rule.

Filesystem mtime: 2026-10-17 09:09:43.483 UTC / 14:39:43.483 IST. The file did not change during this investigation. The earlier verification did not capture a timestamp/fingerprint before its explicit disabled-flag write, so modifications since that earlier verification cannot be established conclusively. No claim of an external edit is made.

The earlier audit correctly reported effective missing/empty values but failed to diagnose the underlying rich-text format. Its initial dynamic-import path also needed a CommonJS-default fallback for @next/env; the subsequent successful loader check still returned the same missing/empty results. The permanent read-only checker now handles the loader correctly, identifies RTF explicitly and exits nonzero on failed configuration.

No credential value, substring, length, fingerprint or secret file copy was emitted or persisted. This investigation did not overwrite `.env.local`, change a secret, enable scanning or call YouCam. Preserve existing credentials; the file needs plain-text serialization before Next.js can read them. No credential regeneration is indicated. Conversion was not performed because the user prohibited secret-file modifications.
