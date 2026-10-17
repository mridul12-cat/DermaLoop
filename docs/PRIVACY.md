# Privacy and limitations
DermaLoop has no tracking or advertising. Default sample mode uses no faces and no provider requests. Explicit sample exploration seeds a separate IndexedDB namespace. Private scores/routines/decisions remain on this browser; storage can be cleared/exported in Privacy. Clearing site data also erases these notes. No cloud backup or cross-device account exists.

Live scanning requires informed adult consent before image selection/camera and a separate explicit submission. The image is decoded and orientation-corrected on device, resized without violating SD minimum short side, then re-encoded to strip metadata. Local preview URLs are revoked on replace/cancel/unmount. Camera tracks stop on capture/close/unmount. Photos are never persisted by DermaLoop; server memory and provider processing are necessary for a live task.

Perfect Corp / YouCam is the external processor. The [current retention page](https://docs.makeupar.com/develop/file_retention_period), reviewed 17 October 2026, states 30-day uploaded/generated-media retention and 2-hour download URLs. The older general integration overview mentions a different shorter processed-result window; use the dedicated retention page and reconfirm before live deployment. DermaLoop discards mask URLs and offers honest scores-only output. Browser deletion does not delete provider copies. Retraction before upload is supported; after submission upstream cancellation/deletion is not implemented.

Capture brightness/sharpness heuristics describe pixels, not diagnostic confidence or accuracy. No identity, skin shade, ethnicity or disease inference. Scores cannot prove product efficacy, clinical significance or cause and effect. UI-adjusted and raw scores are distinct. No prescription or treatment change suggestions. Persistent concerns belong with a qualified professional.

No secret in browser bundle/storage/logging. Private reviewer code is entered only in memory and is not the YouCam API key. Live off by default; public anonymous live scanning unsupported without durable abuse protection and approved budget enforcement.

## Phase4 public release

The public site includes a fixed, read-only projection of four genuine raw/UI scores from an AI-generated portrait. It is explicitly labeled Live YouCam API — Synthetic Test Image, is separate from browser notebook storage, contains no portrait/provider identifier and cannot be imported into personal history. The private complete baseline and credentials remain outside the deployment root. Public photo submission is blocked in the browser and on both server endpoints; optional local preparation does not send the photo. Sample journals/analyses remain fictional. No provider call is needed to browse either experience.
