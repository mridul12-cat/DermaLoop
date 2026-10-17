// Non-secret policy shared by the server adapter and read-only environment audit.
import { isIP } from "node:net";
import { URL } from "node:url";

// An exact hostname shown in YouCam's published Skin Analysis upload example.
// This is NOT a complete or guaranteed regional host registry.
export const DOCUMENTED_UPLOAD_HOSTS = Object.freeze([
  "yce-us.s3-accelerate.amazonaws.com",
]);

/** @param {string} host */
function validHost(host) {
  return (
    host.length <= 253 &&
    !isIP(host) &&
    !/(?:^|\.)(?:localhost|local|internal|test|invalid|example)$/.test(host) &&
    host.split(".").length >= 2 &&
    host
      .split(".")
      .every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) &&
    /[a-z]/.test(host.split(".").at(-1) || "")
  );
}

/** Unset/blank selects the documented default; explicit lists REPLACE it.
 * Entries must be reviewed exact DNS names, never URLs, wildcards or suffixes.
 * @param {string | undefined} value
 * @returns {string[]}
 */
export function parseUploadHosts(value) {
  if (value === undefined || value.trim() === "")
    return [...DOCUMENTED_UPLOAD_HOSTS];
  const hosts = value.split(",").map((h) => h.trim().toLowerCase());
  if (hosts.some((h) => !validHost(h)))
    throw new Error("INVALID_UPLOAD_HOST_CONFIGURATION");
  return [...new Set(hosts)];
}

/** Only use with URLs from this request's authenticated File API response.
 * @param {string} value
 * @param {string[]} hosts
 * @returns {string}
 */
export function validateUploadUrl(value, hosts) {
  try {
    const u = new URL(value);
    if (
      value.trim() !== value ||
      !value.startsWith("https://") ||
      value.includes("\\") ||
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      u.port ||
      u.hash ||
      !validHost(u.hostname) ||
      !hosts.includes(u.hostname)
    )
      throw new Error();
    return u.href;
  } catch {
    throw new Error("UNSAFE_UPLOAD_URL");
  }
}
