// Only exact, documented tokens leave this parser. Never retain provider prose,
// unknown codes, URLs, identifiers, request bodies, image data or arbitrary keys.
const categories = {
  error_below_min_image_size: "image_dimensions",
  error_exceed_max_image_size: "image_dimensions",
  exceed_max_filesize: "image_dimensions",
  error_src_face_too_small: "face_framing",
  error_src_face_out_of_bound: "face_framing",
  error_lighting_dark: "lighting",
  error_no_face: "face_detection",
  error_pose: "pose",
  error_face_parsing: "face_segmentation",
  error_inference: "provider_processing",
  error_download_image: "provider_media_io",
  error_download_mask: "provider_media_io",
  error_decode_image: "image_decode",
  error_decode_mask: "provider_media_io",
  error_upload: "provider_media_io",
  unknown_internal_error: "provider_processing",
  error_nsfw_content_detected: "provider_content_policy",
  exceed_nsfw_retry_limits: "provider_content_policy",
  invalid_parameter: "request_parameters",
  InvalidParameters: "request_parameters",
  BadRequest: "request_parameters",
  CreditInsufficiency: "quota",
  InvalidStyleGroup: "request_parameters",
  InvalidStyle: "request_parameters",
  InvalidApiKey: "authentication",
  InvalidTaskId: "task_reference",
  TaskTimeout: "task_expired",
} as const;
export type ProviderCode = keyof typeof categories;
export type ProviderDiagnostics = {
  providerCode?: ProviderCode;
  category: (typeof categories)[ProviderCode] | "unknown";
  unknownCodePresent: boolean;
  messagePresent: boolean;
  malformedDiagnosticFields: boolean;
  conflictingCodes: boolean;
};
function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
export function providerDiagnostics(raw: unknown): ProviderDiagnostics {
  const root = object(raw),
    data = object(root.data);
  const candidates = [data.error, data.error_code, root.error_code, root.error];
  const codes: ProviderCode[] = [];
  let unknownCodePresent = false,
    malformedDiagnosticFields = false;
  for (const value of candidates) {
    if (value == null || value === "") continue;
    if (typeof value !== "string") {
      malformedDiagnosticFields = true;
      continue;
    }
    if (Object.hasOwn(categories, value)) codes.push(value as ProviderCode);
    else unknownCodePresent = true;
  }
  let messagePresent = false;
  for (const container of [data, root]) {
    for (const key of [
      "error_message",
      "status_description",
      "error_description",
      "message",
    ]) {
      const value = container[key];
      if (value == null || value === "") continue;
      if (typeof value === "string") messagePresent = true;
      else malformedDiagnosticFields = true;
    }
  }
  const unique = [...new Set(codes)];
  // Contradictory known codes must not be reduced to a false specific diagnosis.
  const providerCode = unique.length === 1 ? unique[0] : undefined;
  return {
    ...(providerCode ? { providerCode } : {}),
    category: providerCode ? categories[providerCode] : "unknown",
    unknownCodePresent,
    messagePresent,
    malformedDiagnosticFields,
    conflictingCodes: unique.length > 1,
  };
}
