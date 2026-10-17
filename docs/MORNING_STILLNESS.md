# Morning Stillness cassette player

Local implementation, 17 October 2026. No Git commit, push or deployment is part of this change. The preceding local-live work remains intact and uncommitted.

## Original asset

The user-supplied `Morning_Stillness.mp3` is copied byte-for-byte to `public/audio/Morning_Stillness.mp3`. No trimming, looping, remixing, transcoding or artificial extension was performed. Source inspection with macOS `afinfo` reports 33.567292 seconds, stereo 44.1kHz MP3 at 192kbps. File size: **811,740 bytes** (about 793KiB). This is small enough to keep the original quality. SHA-256:

```text
2c0ef7b9742ea98711bf6820b0185a9b7c9476ab9720a9a9c88f1209e2cc113f
```

The same checksum is verified against the supplied original. Native Chromium decoding reports the same **33.567292-second** duration, volume 0.15, loop false and one audio instance. The final review recorded zero browser console/page errors and zero external-origin requests. The composition's natural ending is preserved.

## Shared controller and navigation controls

`MusicProvider` lives in the persistent Next root layout. It owns exactly one hidden HTML audio element and one controller; the small visible cassette controls live in the landing/verification header and notebook sidebar. Client route changes replace controls as needed, not the audio instance. Playback therefore continues through sample navigation and browser history without resetting the composition.

The illustrated SVG tape uses the existing cream/sage/forest-green palette and typography. Reels rotate only in the actual playing state. Play/pause indicators and a focus/hover tooltip make the action explicit. Following visual review, the separate Sound off button and neutral caption were removed; only blocked-playback and loading-error guidance appears below the cassette. Existing stored sound-off preferences remain respected. Controls stay in navigation flow, rather than floating over charts or forms. Mobile controls retain at least 44px hit targets. There is no external font, image, audio CDN or new runtime dependency.

## Playback contract

- One autoplay attempt after the initial page is ready and a paint is scheduled, at volume `0.15`. The app never modifies browser policy or listens for unrelated gestures/scroll to unlock audio.
- `sessionStorage["dermaloop-music-attempted"]` is claimed before attempting playback. Allowed playback, rejection, navigation and reload cannot trigger a second automatic attempt in that session.
- A browser policy rejection is caught; the UI stays stopped and says **“A little music? Tap to play.”** A direct click/keyboard activation invokes playback immediately.
- Manual play/pause also settles the session so a pending initial autoplay cannot override the user's action.
- Pause preserves position. It does not set a permanent opt-out. Natural `ended` stops both playback and reels; only explicit **Play again** restarts from zero. `loop` is always false.
- Previously stored `localStorage["dermaloop-music-choice"]="off"` preferences still prevent autoplay. Only explicit manual play opts back in. The separate opt-out control was removed at the user’s request; pause remains distinct from persistent opt-out.
- If storage access is blocked, automatic playback fails closed; manual audio remains available.
- Media failures disable the playback control and show **“Music unavailable.”** No repeated load/play retries or error logging with user data occur.
- Full page exit pauses playback. Controller disposal cancels scheduled work, detaches listeners, pauses and releases the source. React StrictMode's canceled rehearsal cannot claim/play a duplicate attempt. Unknown/404 pages without visible controls do not autoplay.

No listening analytics, playback history, progress persistence, external activity transmission, background polling or JS animation timer is added. Only the two local preference flags persist. The same-origin asset is requested by the browser when playback is attempted; `preload="none"` avoids eager downloading for opted-out visitors.

## Accessibility and motion

Real buttons have state-specific accessible names and visible focus. The optional status text has no live region, avoiding continuous announcements. The cassette SVG is decorative to assistive technology. OS reduction and DermaLoop's saved global reduction remove reel animation and feedback transitions, without stopping user-selected audio. Reels also pause visually while the document is hidden. The two reel animations use transforms; there is no scan effect, glow, bounce or face animation.

## Validation

- `npm run check`: 242 unit tests in eight files, TypeScript, ESLint and production build passed. Fourteen audio tests cover session claiming, blocked/storage behavior, pause versus off, natural end/restart, stale promise cancellation, cross-tab off and cleanup.
- Production browser suite: 42 tests, including eleven audio checks. Coverage includes simulated deterministic policy/error cases and real native Chromium with permitted and blocked autoplay policies. Test-only Chromium flags configure those policies; the product never bypasses them.
- Native full-track playback is allowed to reach its own `ended` event after pause/resume and route navigation, without seeking or looping. Exact audio-node identity and continued playback position are asserted; manual restart is checked afterwards.
- Existing notebook, persistence, export/delete, decision, disabled public scan and offline local-live tests remain in the suite. The original hero-motion check now scopes its one-orbit assertion to the hero, allowing the two explicitly selected tape reels independently.
- Layouts checked at 320, 375, 768 and 1440px. Actual screenshots at desktop/mobile widths were inspected. A hidden tooltip initially caused mobile overflow; placement was corrected, with no content clipping workaround.
- Existing 4× CPU-throttled mobile layout-stability checks continue to pass. No new JS animation loops, dependencies or layout-dependent progress updates were introduced.
- `npm run public:check` and `git diff --check` pass. Untracked public sources were also checked; the only added binary is the hash-verified user-supplied audio. Screenshots and private artifacts remain ignored.

Provider code, public scan restrictions and the four verified provider measurements have no diff. No YouCam request, image upload or credit operation was performed. No credentials were changed.

Physical iOS/Safari/Firefox and device-specific volume/autoplay behavior remain unverified. Browsers retain control of sound policy. No universal field-performance or assistive-technology conformance claim is made.
