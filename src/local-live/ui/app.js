/* global document, window, fetch, URL, setTimeout, AbortSignal */
const el = (id) => document.getElementById(id);
let session,
  locked = true,
  preview;
const errors = {
  KEY_REQUIRED:
    "Configure your own server-side YouCam API key, then restart locally. No provider request was made.",
  LOCAL_QUOTA_EXHAUSTED:
    "This local notebook has already used its one attempt. It cannot be resubmitted, even after a failure.",
  IMAGE_TYPE: "Choose a real JPEG or PNG file.",
  IMAGE_SIZE: "The file must be between 32 bytes and 3.5MB.",
  IMAGE_DIMENSIONS_OR_CORRUPT:
    "The image is corrupt, animated, or outside the 480–2560px limits.",
  PROVIDER_AUTH:
    "YouCam rejected authentication. Check your own server-side API key.",
  QUOTA_EXHAUSTED:
    "YouCam reported insufficient units. Check your own dashboard; do not purchase through this app.",
  LOCAL_POLL_TIMEOUT:
    "Polling timed out. The provider may still finish. Do not resubmit.",
  MALFORMED_RESULT:
    "The provider completed, but its output could not be normalized. No replacement task was made.",
  MISSING_REQUESTED_METRICS:
    "The completed output did not contain all four requested raw measurements. No missing scores were invented.",
};
function fail(code) {
  el("error").textContent =
    errors[code] ||
    "The local operation failed. No automatic resubmission was made. Check setup and the provider dashboard.";
}
function clear() {
  for (const id of ["consent", "credits", "budget"]) el(id).checked = false;
  el("image").value = "";
  el("preview").hidden = true;
  el("preview").removeAttribute("src");
  el("image-context").textContent = "";
  if (preview) URL.revokeObjectURL(preview);
  preview = undefined;
}
function ready() {
  el("submit").disabled =
    locked ||
    !el("image").files.length ||
    !["consent", "credits", "budget"].every((id) => el(id).checked);
}
async function call(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "x-local-session": session, ...options.headers },
    signal: AbortSignal.timeout(20000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "LOCAL_REQUEST_FAILED");
  return data;
}
function show(state) {
  locked = state.quotaUsed;
  ready();
  el("status").textContent = {
    idle: "Ready locally. No provider call until you explicitly submit.",
    running:
      "One task is processing. Reading existing status only; do not resubmit.",
    success:
      "Analysis complete. Genuine scores saved privately on this computer.",
    error: "The attempt failed. Its allowance remains consumed.",
    interrupted:
      "An earlier attempt exists. Its outcome may be ambiguous; automatic continuation and resubmission are disabled.",
  }[state.state];
  if (state.error) {
    fail(state.error);
    if (state.providerCode)
      el("error").textContent +=
        " Documented provider code: " +
        state.providerCode +
        " (" +
        state.category +
        ").";
  }
  if (state.result) {
    el("results").hidden = false;
    el("source").textContent = state.result.source;
    el("provenance-note").textContent =
      state.result.provenance === "synthetic_test_image"
        ? "Synthetic Test Image — integration evidence only, not real skin health."
        : "Own adult image — operator consent recorded for this local attempt. Not medical advice.";
    el("scores").replaceChildren();
    for (const score of state.result.scores) {
      const row = document.createElement("tr");
      for (const value of [
        score.providerAction,
        score.rawScore,
        score.uiScore ?? "Not returned",
      ]) {
        const cell = document.createElement(row.children.length ? "td" : "th");
        if (!row.children.length) cell.scope = "row";
        cell.textContent = String(value);
        row.append(cell);
      }
      el("scores").append(row);
    }
  }
  return state.state === "running";
}
async function poll() {
  for (let i = 0; i < 22; i++) {
    if (!show(await call("/result"))) return;
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
  el("status").textContent =
    "Local viewing timed out. Reload to read saved state; never submit a replacement task.";
}
el("clear").addEventListener("click", () => {
  clear();
  ready();
});
el("image").addEventListener("change", () => {
  clearPreview();
  el("consent").checked = false;
  el("budget").checked = false;
  const file = el("image").files[0];
  if (file) {
    preview = URL.createObjectURL(file);
    el("preview").src = preview;
    el("preview").hidden = false;
    el("image-context").textContent =
      "Preview is local only. Framing and lighting require your review.";
  }
  ready();
});
function clearPreview() {
  if (preview) URL.revokeObjectURL(preview);
}
el("provenance").addEventListener("change", () => {
  el("consent").checked = false;
  el("consent-copy").textContent =
    el("provenance").value === "synthetic_test_image"
      ? "I authorize processing this synthetic adult test image. It is fictional, not a photograph of a consenting person; its scores cannot establish real skin health."
      : "I am an adult, own this image and consent to sending it to Perfect Corp / YouCam for skin analysis.";
  ready();
});
for (const id of ["consent", "credits", "budget"])
  el(id).addEventListener("change", ready);
el("scan").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (el("submit").disabled) return;
  locked = true;
  ready();
  el("error").textContent = "";
  try {
    const file = el("image").files[0];
    await call("/analyze", {
      method: "POST",
      headers: {
        "Content-Type": file.type,
        "x-local-provenance": el("provenance").value,
        "x-local-consent": "confirmed",
        "x-local-free-credit-confirmation": "confirmed",
        "x-local-budget-confirmation": "confirmed",
      },
      body: file,
    });
    clear();
    await poll();
  } catch (error) {
    fail(error.message);
    el("status").textContent =
      "Stopped. Reload to check the durable allowance before doing anything else. No request was automatically retried.";
  }
});
window.addEventListener("pagehide", clearPreview);
(async () => {
  try {
    const response = await fetch("/session", {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error();
    session = (await response.json()).session;
    await poll();
  } catch {
    fail("LOCAL_SETUP_REQUIRED");
  }
})();
