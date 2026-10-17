# Implementation decisions — 17 October 2026
Empty repository audited; no existing files or instructions. Next.js App Router / TypeScript, semantic CSS, handcrafted SVG, Zod, IndexedDB, Vitest, Playwright. No paid resources. Original vector artwork and system serif/sans fallbacks avoid remote font dependency.

Phase order: server-only provider adapter and validation → fixtures and deterministic product logic → editorial UI → browser QA and submission documentation.

Selected contract: V2.1 SD, JSON only. Seven actions verified in official reference. File init and signed PUT precede task creation. Status retrieval alone retries transient failures. No task POST retries. Exact upload host allowlist, private reviewer secret, scoped expiring HMAC task tokens. Live defaults OFF. No anonymous live access or claimed distributed limiter.

Risks: unverified regional credentials, provider output contract drift, units not requests, uncertain task completion after network loss, shared reviewer credentials unsuitable for public launch, API engine revisions may occur without version changes. No claim of clinical accuracy, causality or calibrated confidence. No provider credits authorized.
