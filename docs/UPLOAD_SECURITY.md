# Presigned upload host policy — 17 October 2026

## Evidence and conclusion
The official [Skin Analysis workflow](https://docs.makeupar.com/reference/ai_skin_analysis/section/overview/unit-consumption) shows `yce-us.s3-accelerate.amazonaws.com` in its returned signed-upload example. The official [File API OpenAPI](https://docs.makeupar.com/_bundle/reference/file.json?download=) defines returned method, URL and headers, but uses a generic URL example. Neither source provides a complete, stable regional hostname registry or promises that every account uses the example host. We cannot establish a universal allowlist from those documents.

## Implemented conservative policy
`src/lib/youcam/upload-policy.mjs` is the single source used by the server and `npm run env:check`:

- Blank/unset `YOUCAM_UPLOAD_HOSTS` uses exactly `yce-us.s3-accelerate.amazonaws.com`, a documented example, not an invented regional address or domain-wide rule.
- Explicit comma-separated entries **replace** that default. Entries are normalized exact DNS hostnames. Malformed lists, schemes, paths, ports, empty entries, wildcards, domain suffix patterns, IP literals and local/internal names fail. Administrative overrides require provider confirmation for the relevant account; configuration syntax alone does not establish ownership or suitability.
- Upload URL is taken only from the schema-validated response of the server's authenticated File API request. No client-supplied upload URL or reusable arbitrary-URL proxy exists. The API origin is administrator-configured and must be the trusted regional provider origin.
- URL must use HTTPS and exactly match an approved hostname. Userinfo, nonstandard ports, fragments, IP literals, backslash ambiguity and surrounding whitespace fail. Signed path/query data is preserved; the app does not invent a signature format or claim to verify the provider's storage signature cryptographically.
- Upload is PUT with the response's required headers, a byte/time bound and `redirect: error`. API bearer is not attached to the storage PUT. Unapproved hosts stop the flow **before image transfer and before task creation**. They are never silently added, even when returned by an authenticated API.
- The default selects a narrowly trusted provider-documented AWS storage hostname. It does not broadly trust `*.amazonaws.com`, other S3 buckets, a `yce-` prefix, all Perfect Corp subdomains, or all HTTPS URLs. A shared storage-domain suffix would allow attacker-owned buckets and is not a safe policy.

This resolves the missing-variable configuration failure without modifying `.env.local` or secrets. `env:check` explicitly labels the default as documented but regionally unverified. PASS means local syntax/policy checks pass, not that a real account is authenticated or its returned upload host has been observed.

## If an authorized request later returns another host
Stop without uploading or starting a task. Review only the hostname locally, keeping its signed path/query and all credentials private; confirm the exact host with official account-specific documentation or provider support. Add it as a deliberate exact-host override after confirmation. Re-run env check and tests. Do not retry task creation automatically.

## Safe dynamic alternative (proposal, NOT enabled)
If future account requirements make static hosts impractical, authenticated provider provenance alone is insufficient for accepting arbitrary URL destinations. A dynamic design would additionally need independently confirmed storage-origin/tenant constraints, strict HTTPS/URL/method/header checks, rejection of all private/loopback/link-local/multicast/reserved IPv4 and IPv6 destinations, and a transport that pins the validated DNS address to the connection while retaining TLS hostname verification. A DNS preflight followed by ordinary fetch is vulnerable to rebinding; redirects must remain forbidden at every stage. Use equivalent network-level egress controls where available. Without those controls, fail closed instead of enabling a response-only trust mode. No such permissive mode or DNS-based fallback was introduced here.

## Remaining verification
No provider request was made, including File API initialization. No actual regional host or signed storage request has been observed. A future explicitly approved live scan may stop on a different host. Account key validity, units, region acceptance and live provider output remain unverified. Live scanning remains false. Public quota protection and deployment gates are unchanged.
