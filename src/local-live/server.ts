import "server-only";
import { createServer, type IncomingMessage } from "node:http";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ProviderError, type Config } from "../lib/youcam/client";
import {
  activation,
  localRequest,
  localConfig,
  LOCAL_ORIGIN,
  MAX_BYTES,
  RateLimit,
  hasAttempt,
  reserveAttempt,
  prepareImage,
  analyze,
  safeFailure,
  saveResult,
  storedResult,
  type LocalState,
  type LocalResult,
} from "./service";
const header = (req: IncomingMessage, name: string) =>
  typeof req.headers[name] === "string"
    ? (req.headers[name] as string)
    : undefined;
const confirmations = [
  "x-local-consent",
  "x-local-free-credit-confirmation",
  "x-local-budget-confirmation",
];
export function createLocalServer(options: {
  root: string;
  optedIn: boolean;
  env?: Record<string, string | undefined>;
  run?: (
    c: Config,
    bytes: Uint8Array,
    provenance: LocalResult["provenance"],
  ) => Promise<LocalResult>;
  configuration?: () => Config;
}) {
  const env = options.env || process.env;
  activation(env, options.optedIn);
  (options.configuration || localConfig)(); // Validate local credentials/policy before listening; no network.
  const secret = randomBytes(32).toString("base64url"),
    rate = new RateLimit();
  let current: LocalState | undefined,
    accepting = false;
  const server = createServer(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; script-src 'self'; style-src 'self'; img-src blob:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    res.setHeader("X-Frame-Options", "DENY");
    const json = (body: unknown, code = 200) => {
      res.writeHead(code, { "Content-Type": "application/json" });
      res.end(JSON.stringify(body));
    };
    try {
      activation(env, options.optedIn);
      const bound = server.address();
      const url = new URL(req.url || "/", LOCAL_ORIGIN);
      if (url.origin !== LOCAL_ORIGIN || url.search)
        throw new ProviderError("LOCAL_ORIGIN_REJECTED", 403);
      const authenticated =
        url.pathname === "/result" || url.pathname === "/analyze";
      localRequest(
        {
          remote: req.socket.remoteAddress,
          bound: bound && typeof bound !== "string" ? bound.address : undefined,
          port: bound && typeof bound !== "string" ? bound.port : undefined,
          host: header(req, "host"),
          origin: header(req, "origin"),
          site: header(req, "sec-fetch-site"),
          forwarded: Object.keys(req.headers).some((k) =>
            /^(forwarded|x-forwarded-|x-real-ip|via|cf-connecting-ip)/i.test(k),
          ),
          mutation: req.method !== "GET",
          authenticated,
          session: header(req, "x-local-session"),
        },
        secret,
      );
      rate.check();
      if (
        req.method === "GET" &&
        ["/", "/app.js", "/app.css"].includes(url.pathname)
      ) {
        const name =
          url.pathname === "/" ? "index.html" : url.pathname.slice(1);
        const content = await readFile(
          path.join(options.root, "src/local-live/ui", name),
        );
        res.writeHead(200, {
          "Content-Type": name.endsWith(".html")
            ? "text/html; charset=utf-8"
            : name.endsWith(".js")
              ? "text/javascript"
              : "text/css",
        });
        res.end(content);
        return;
      }
      if (req.method === "GET" && url.pathname === "/session") {
        if (header(req, "sec-fetch-site") !== "same-origin")
          throw new ProviderError("LOCAL_ORIGIN_REJECTED", 403);
        json({ session: secret });
        return;
      }
      if (req.method === "GET" && url.pathname === "/result") {
        if (!current) {
          const quotaUsed = await hasAttempt(options.root),
            result = quotaUsed ? await storedResult(options.root) : undefined;
          current = {
            state: result ? "success" : quotaUsed ? "interrupted" : "idle",
            quotaUsed,
            ...(result ? { result } : {}),
          };
        }
        json(current);
        return;
      }
      if (req.method !== "POST" || url.pathname !== "/analyze")
        throw new ProviderError("NOT_FOUND", 404);
      if (
        confirmations.some((k) => header(req, k) !== "confirmed") ||
        !["real_adult", "synthetic_test_image"].includes(
          header(req, "x-local-provenance") || "",
        )
      )
        throw new ProviderError("LOCAL_CONFIRMATION_REQUIRED", 400);
      if (accepting) throw new ProviderError("LOCAL_QUOTA_EXHAUSTED", 409);
      // Lock before awaiting image bytes; the on-disk exclusive claim also protects other processes.
      accepting = true;
      try {
        if (await hasAttempt(options.root))
          throw new ProviderError("LOCAL_QUOTA_EXHAUSTED", 409);
        const c = (options.configuration || localConfig)();
        const mime = header(req, "content-type") || "";
        if (!["image/jpeg", "image/png"].includes(mime))
          throw new ProviderError("IMAGE_TYPE", 415);
        if (Number(header(req, "content-length") || 0) > MAX_BYTES)
          throw new ProviderError("IMAGE_SIZE", 413);
        let size = 0;
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          const b = Buffer.from(chunk);
          size += b.length;
          if (size > MAX_BYTES) throw new ProviderError("IMAGE_SIZE", 413);
          chunks.push(b);
        }
        const bytes = await prepareImage(Buffer.concat(chunks), mime);
        const provenance = header(
          req,
          "x-local-provenance",
        ) as LocalResult["provenance"];
        await reserveAttempt(options.root, provenance);
        current = { state: "running", quotaUsed: true };
        // No request-abort resubmission or persisted task continuation. Restarting
        // leaves the durable claim consumed and an interrupted state visible.
        void (async () => {
          try {
            const result = await (options.run || analyze)(c, bytes, provenance);
            await saveResult(options.root, result);
            current = { state: "success", result, quotaUsed: true };
          } catch (error) {
            current = safeFailure(error);
          }
        })();
        json({ state: "running", quotaUsed: true }, 202);
      } finally {
        accepting = false;
      }
    } catch (error) {
      json(
        {
          error:
            error instanceof ProviderError
              ? error.code
              : "LOCAL_REQUEST_FAILED",
        },
        error instanceof ProviderError ? error.status : 503,
      );
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.maxHeadersCount = 40;
  return server;
}
