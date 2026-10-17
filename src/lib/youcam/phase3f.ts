import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";
import { ProviderError, type Config } from "./client";
import { validateApproval } from "./controlled";
import { validateImage } from "./image";
import { measure } from "../skin/photo-quality";

// Established offline from the reviewed Phase 3E file and exact reconstruction.
// These are integrity digests of artifacts, never credentials or credential hashes.
export const PHASE3F_IMAGE_SHA256 =
  "335b1d952d0ec5effc9569ec253ffad2ebbf37d1a5fdf70fd609f756d598c8b6";
export const PHASE3C_MARKER_SHA256 =
  "d13bda0cb61c70bad11a754013d081a8efb8eb8d4c84ca529ee9d0ce133e4633";
export const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
const envelope = z
  .object({
    phase: z.literal("3F"),
    authorizationScope: z.literal("second_controlled_synthetic_test"),
    secondAttemptExplicitlyAuthorized: z.literal(true),
    imageSha256: z.literal(PHASE3F_IMAGE_SHA256),
    priorAttemptSha256: z.literal(PHASE3C_MARKER_SHA256),
    approval: z.unknown(),
  })
  .strict();
export function validatePhase3FAuthorization(
  input: unknown,
  expectedPath: string,
  now = Date.now(),
) {
  const parsed = envelope.safeParse(input);
  if (!parsed.success)
    throw new ProviderError("PHASE3F_FRESH_AUTHORIZATION_REQUIRED", 403);
  const approval = validateApproval(parsed.data.approval, now);
  if (approval.schemaVersion !== 3 || approval.imagePath !== expectedPath)
    throw new ProviderError("PHASE3F_ARTIFACT_OR_AUTHORIZATION_SCOPE", 403);
  return approval;
}
export function verifyPriorAttempt(bytes: Uint8Array) {
  if (sha256(bytes) !== PHASE3C_MARKER_SHA256)
    throw new ProviderError("PHASE3C_EVIDENCE_CHANGED", 403);
}
export function validatePhase3FConfig(c: Config) {
  if (
    !c.key.trim() ||
    new URL(c.base).href !== "https://yce-api-01.makeupar.com/" ||
    c.uploadHosts.length !== 1 ||
    c.uploadHosts[0] !== "yce-us.s3-accelerate.amazonaws.com"
  )
    throw new ProviderError("PHASE3F_CONFIGURATION_NOT_APPROVED", 403);
  return { ...c, base: new URL(c.base).origin };
}
export async function prepareReviewedJpeg(
  bytes: Uint8Array,
  expected: { sha256: string; width: number; height: number },
) {
  if (sha256(bytes) !== expected.sha256)
    throw new ProviderError("PHASE3F_REVIEWED_IMAGE_HASH_MISMATCH", 403);
  const dimensions = await validateImage(bytes, "image/jpeg");
  const meta = await sharp(bytes).metadata();
  if (
    meta.format !== "jpeg" ||
    meta.space !== "srgb" ||
    meta.exif ||
    meta.xmp ||
    meta.iptc ||
    meta.icc ||
    meta.orientation ||
    dimensions.width !== expected.width ||
    dimensions.height !== expected.height
  )
    throw new ProviderError("PHASE3F_REVIEWED_IMAGE_FORMAT_MISMATCH", 403);
  // Thumbnail only for local pixel proxies. Upload bytes are returned unchanged.
  const { data, info } = await sharp(bytes)
    .resize({ width: 160 })
    .removeAlpha()
    .toColourspace("srgb")
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rgba = new Uint8ClampedArray(info.width * info.height * 4);
  for (let i = 0; i < info.width * info.height; i++)
    rgba.set([data[i * 3], data[i * 3 + 1], data[i * 3 + 2], 255], i * 4);
  return {
    bytes,
    capture: {
      ...dimensions,
      ...measure(rgba, info.width, info.height),
      frontView: true,
    },
  };
}
