// Separate development-only companion; never mounted by Next or deployed by Vercel.
import path from "node:path";
import { fileURLToPath } from "node:url";
import nextEnvironment from "@next/env";
const { loadEnvConfig } = nextEnvironment;
import { createLocalServer } from "../src/local-live/server";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const environment: Record<string, string | undefined> = process.env;
if (!environment.NODE_ENV) environment.NODE_ENV = "development";
let envErrors = false;
loadEnvConfig(root, true, {
  info() {},
  error() {
    envErrors = true;
  },
});
try {
  if (envErrors) throw new Error();
  const server = createLocalServer({
    root,
    optedIn: process.argv.includes("--allow-local-live"),
  });
  // No configurable bind address, proxy mode, port override or production startup.
  server.listen(3210, "127.0.0.1", () =>
    console.log(
      "DermaLoop local operator workspace: http://127.0.0.1:3210 — no provider request has been made.",
    ),
  );
  server.on("error", () => {
    console.error(
      "Local startup failed; details withheld. Check port 3210 and local activation settings.",
    );
    process.exitCode = 1;
  });
} catch {
  console.error(
    "Local live mode refused. Require development, explicit local opt-in and CLI approval, own API key and approved hosts, with no deployment environment. No provider request made.",
  );
  process.exitCode = 1;
}
