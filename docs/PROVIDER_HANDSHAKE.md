# Phase 3B revised — actual registration evidence

Executed 17 October 2026 at 15:03:30 IST / 09:33:30 UTC, under the user's revised authorization for one registration using existing free credits, accepting possible unit deduction.

| Item | Observed result |
| --- | --- |
| Authenticated operation | Exactly one POST `/s2s/v2.0/file` to the documented India API origin |
| Metadata only | Harmless placeholder filename, image/png MIME and byte-size metadata; no actual file contents |
| HTTP status | **200** |
| Authentication | Accepted for File API registration |
| Schema | PASS: status 200, one file with nonempty file_id, one PUT upload request, URL and string/number headers |
| Returned upload hostname | **yce-us.s3-accelerate.amazonaws.com** |
| Existing exact-host policy | **Accepted**, including HTTPS/URL constraints; no allowlist change |
| Image PUT / skin-analysis tasks | **0 / 0** |
| Automatic retries / redirects | **0 / forbidden** |
| Public live-scanning setting | Still **false** |
| Billing or credits purchased | **None activated or purchased by this phase** |
| Unit balance before/after | **Unavailable**; browser dashboard session was signed out |
| Observed unit deduction | **Unknown**, not asserted to be zero |

Free-credit basis is the user's explicit confirmation, not an independently authenticated dashboard inspection. No account billing state or free-credit allocation was independently established. No billing controls, paid plans or purchases were touched, and no evidence of monetary charges beyond available credits was observed. Only the bounded metadata POST was sent; no additional authenticated balance query was made.

[Sanitized machine-readable evidence](evidence/phase3b-registration-attempt.json). No API key, secret, signed URL, provider file ID, response headers or raw provider body was persisted or printed. The response was validated in memory; only hostname and status metadata retained.

`scripts/youcam-register-once.mjs` is an isolated metadata-only diagnostic with explicit authorization flags and a persisted single-use attempt guard. It refuses another run once evidence exists. It never calls the application upload helper (which would PUT bytes), imports task logic, enables live mode or queries billing. An ambiguous network error would also consume its one attempt. Do not remove its evidence file to retry without a new explicit authorization.

Local configuration and provider registration/hostname checks now pass. A separately authorized, consenting-adult real scan is the next validation step; signed image transfer, V2.1 task acceptance, analysis output and actual analysis unit cost remain unverified. No scan is authorized by this registration-only phase. Public deployment and public-live abuse/budget gates are unchanged.

---

## Earlier strict no-charge documentation gate (historical)

# Phase 3B — controlled handshake gate

Date: 17 October 2026. Outcome: **not executed; documentation gate not established**.

## Reviewed evidence
- [File API operation](https://docs.makeupar.com/reference/file/paths/~1s2s~1v2.0~1file/post) and [OpenAPI](https://docs.makeupar.com/_bundle/reference/file.json?download=): authenticated POST `/s2s/v2.0/file` registers metadata and returns file ID plus upload requests. Actual byte upload is a separate operation. No dedicated credential-validation/dry-run route or explicit registration zero-unit statement was found in the reviewed File API contract.
- [Skin Analysis workflow](https://docs.makeupar.com/reference/ai_skin_analysis/section/overview/unit-consumption): separates metadata registration, signed PUT and task creation. Describes units being consumed when analysis succeeds. This supports an inference that metadata registration does not incur an analysis charge, but was not treated as an explicit File API billing guarantee under the user's stricter condition.
- [Unit system](https://docs.makeupar.com/reference/unit_system) and [FAQ](https://docs.makeupar.com/develop/faq): reviewed for billing/authentication context. No account-specific usage evidence queried.

## Client inspection
`config()` intentionally fails while live mode is disabled. `upload()` combines metadata registration and image PUT; calling it would violate this phase's no-upload restriction. It was not invoked. REST POST requests are not automatically retried. No new bypass, handshake endpoint, allowlist relaxation or execution script was added. Existing source/tests/security restrictions preserved.

## Verification report
| Item | Actual evidence |
| --- | --- |
| Provider authentication | Not attempted; credential validity unverified |
| Legitimate registration response | None; no authenticated request sent |
| Returned upload hostname | Not obtained; published example is not an observed response |
| Allowlist acceptance | Not exercised against provider metadata; existing exact-host policy retained |
| Units consumed | Zero provider requests initiated in this phase; no before/after account usage query, so no independently measured balance delta |
| Controlled real scan readiness | Local configuration passes; provider acceptance/region/upload-host behavior remain unverified. This phase does not establish readiness or authorize an analysis task |

`npm run env:check` logic was run via its read-only script and returned PASS; effective live-disabled status true. `.env.local`, credentials and application configuration were not changed. No image read/upload, task, paid resource, authenticated account request or automatic retry performed.

The user's conditional authorization required a documented safe, non-chargeable handshake. Without an explicit File API registration billing guarantee, stopped rather than treating absence of a listed fee as proof of zero cost. Remaining gate: official provider documentation or account-specific written confirmation of registration-only zero-unit behavior, or a separately revised authorization. Do not claim provider connectivity, authentication or live integration verified from this result.
