// Read-only configuration audit. Never emits environment values, lengths or hashes.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { parseUploadHosts } from "../src/lib/youcam/upload-policy.mjs";
const names = [
  "YOUCAM_API_KEY",
  "TASK_TOKEN_SECRET",
  "REVIEWER_ACCESS_CODE",
  "YOUCAM_BASE_URL",
  "YOUCAM_UPLOAD_HOSTS",
  "YOUCAM_LIVE_ENABLED",
];
function state(name, value) {
  const exists = value !== undefined,
    nonempty = exists && value.length > 0;
  let valid = false;
  if (name === "YOUCAM_API_KEY") valid = Boolean(value);
  else if (name === "TASK_TOKEN_SECRET" || name === "REVIEWER_ACCESS_CODE")
    valid = Boolean(value && value.length >= 32);
  else if (name === "YOUCAM_LIVE_ENABLED") valid = value === "false";
  else if (name === "YOUCAM_BASE_URL") {
    try {
      const u = new URL(value || "https://yce-api-01.makeupar.com");
      valid = u.protocol === "https:" && !u.username && !u.password;
    } catch {}
  } else if (name === "YOUCAM_UPLOAD_HOSTS") {
    try {
      valid = parseUploadHosts(value).length > 0;
    } catch {
      valid = false;
    }
  }
  return { exists, nonempty, validation: valid ? "PASS" : "FAIL" };
}
try {
  const root = fs.realpathSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  );
  const filename = path.join(root, ".env.local");
  const before = fs.statSync(filename);
  const bytes = fs.readFileSync(filename);
  const text = bytes.toString("utf8");
  let utilParsed = {},
    utilParseError = false;
  try {
    utilParsed = parseEnv(text);
  } catch {
    utilParseError = true;
  }
  const inherited = Object.fromEntries(names.map((k) => [k, process.env[k]]));
  let errors = 0;
  const m = await import("@next/env");
  const load = m.loadEnvConfig ?? m.default?.loadEnvConfig;
  if (typeof load !== "function") throw new Error();
  const mode = process.argv.includes("--production")
    ? "production"
    : "development";
  // NODE_ENV is used by Next to select test semantics; do not alter inherited credential variables.
  if (process.env.NODE_ENV === "test") throw new Error();
  const result = load(
    root,
    mode === "development",
    {
      info() {},
      error() {
        errors++;
      },
    },
    true,
  );
  const local = result.loadedEnvFiles.find((f) => f.path === ".env.local");
  const diagnostics = {};
  for (const key of names) {
    const declarations = text
      .split(/\r?\n/)
      .map((line, i) => ({ line, i: i + 1 }))
      .filter(({ line }) =>
        new RegExp("^\\s*(?:export\\s+)?" + key + "\\s*=").test(line),
      );
    const comments = text
      .split(/\r?\n/)
      .filter((line) =>
        new RegExp("^\\s*#+\\s*(?:export\\s+)?" + key + "\\s*=").test(line),
      );
    const loaded =
      Object.hasOwn(inherited, key) && inherited[key] !== undefined
        ? "inherited process environment"
        : (result.loadedEnvFiles.find((f) => Object.hasOwn(f.env, key))?.path ??
          "not defined");
    const v = local?.env[key];
    const quoteIssues = declarations.some(({ line }) => {
      const raw = line.slice(line.indexOf("=") + 1).trimStart();
      return (
        (raw[0] === '"' || raw[0] === "'" || raw[0] === "`") &&
        !raw.slice(1).includes(raw[0])
      );
    });
    diagnostics[key] = {
      ...state(key, result.combinedEnv[key]),
      source: loaded,
      localFile: state(key, v),
      declarations: declarations.length,
      declarationLines: declarations.map((v) => v.i),
      commentedDeclarations: comments.length,
      quoteMaySpanLines: quoteIssues,
      parsedSurroundingWhitespace: Boolean(v && v.trim() !== v),
      parserDifference: !utilParseError && utilParsed[key] !== v,
      ...(key === "YOUCAM_UPLOAD_HOSTS"
        ? {
            policy: result.combinedEnv[key]?.trim()
              ? "explicit exact-host override"
              : "documented exact-host default; regional acceptance unverified",
          }
        : {}),
    };
  }
  const after = fs.statSync(filename);
  const otherFiles = result.loadedEnvFiles.map((f) => ({
    file: f.path,
    declares: names.filter((k) => Object.hasOwn(f.env, k)),
  }));
  const richText = /^\s*\{\\rtf\d/.test(text);
  const report = {
    fileFormat: richText
      ? "FAIL: RTF rich text, not a plain-text dotenv file"
      : "plain-text candidate",
    projectRoot: root,
    localEnvFile: filename,
    realEnvFile: fs.realpathSync(filename),
    mode,
    fileModifiedAt: before.mtime.toISOString(),
    fileChangedDuringAudit:
      before.mtimeMs !== after.mtimeMs || before.size !== after.size,
    encoding: {
      utf8BOM: bytes[0] === 239 && bytes[1] === 187 && bytes[2] === 191,
      utf16BOM:
        (bytes[0] === 255 && bytes[1] === 254) ||
        (bytes[0] === 254 && bytes[1] === 255),
      nulBytes: bytes.includes(0),
      replacementCharacters: text.includes("\uFFFD"),
      crlf: text.includes("\r\n"),
      utilParseError,
    },
    loaderErrors: errors,
    loadedFiles: otherFiles,
    variables: diagnostics,
    liveDisabled: result.combinedEnv.YOUCAM_LIVE_ENABLED === "false",
    credentialValuesDistinct: names
      .slice(0, 3)
      .every((k, i) =>
        names
          .slice(0, 3)
          .every(
            (other, j) =>
              i === j ||
              !result.combinedEnv[k] ||
              result.combinedEnv[k] !== result.combinedEnv[other],
          ),
      ),
    result:
      names
        .filter((k) => !["YOUCAM_BASE_URL"].includes(k))
        .every((k) => diagnostics[k].validation === "PASS") &&
      errors === 0 &&
      !richText
        ? "PASS"
        : "FAIL",
  };
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.result === "PASS" ? 0 : 1;
} catch {
  console.log(
    JSON.stringify({
      result: "FAIL",
      error:
        "Read-only environment audit could not complete; details withheld to protect values.",
    }),
  );
  process.exitCode = 1;
}
