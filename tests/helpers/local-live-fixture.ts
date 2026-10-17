// This fixture cannot reach a provider: no credentials loaded, all real fetches denied.
import { mkdtemp, mkdir, cp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createLocalServer } from "../../src/local-live/server";
import { analyze } from "../../src/local-live/service";
globalThis.fetch = async () => {
  throw new Error("External requests forbidden in offline fixture");
};
const root = await mkdtemp(path.join(tmpdir(), "dermaloop-browser-fixture-"));
await mkdir(path.join(root, "src/local-live"), { recursive: true });
await cp("src/local-live/ui", path.join(root, "src/local-live/ui"), {
  recursive: true,
});
const html = path.join(root, "src/local-live/ui/index.html");
await writeFile(
  html,
  (await readFile(html, "utf8")).replace(
    "<main>",
    '<main><p role="status">OFFLINE TEST FIXTURE — no provider calls</p>',
  ),
);
const server = createLocalServer({
  root,
  optedIn: true,
  env: {
    NODE_ENV: "development",
    DERMALOOP_LOCAL_LIVE: "true",
    YOUCAM_LIVE_ENABLED: "true",
  },
  configuration: () => ({
    key: "offline-only-key",
    base: "https://yce-api-01.makeupar.com",
    uploadHosts: ["yce-us.s3-accelerate.amazonaws.com"],
  }),
  run: (c, bytes, provenance) =>
    analyze(
      c,
      bytes,
      provenance,
      async (input, init) => {
        if (String(input).endsWith("/file"))
          return Response.json({
            data: {
              files: [
                {
                  file_id: "fixture-file",
                  requests: [
                    {
                      method: "PUT",
                      url: "https://yce-us.s3-accelerate.amazonaws.com/offline",
                      headers: { "Content-Type": "image/jpeg" },
                    },
                  ],
                },
              ],
            },
          });
        if (init?.method === "PUT") return new Response(null, { status: 200 });
        if (init?.method === "POST")
          return Response.json({ data: { task_id: "fixture-task" } });
        return Response.json({
          data: {
            task_status: "success",
            results: {
              output: ["acne", "pore", "texture", "redness"].map((type, i) => ({
                type,
                raw_score: 60 + i + 0.25,
                ui_score: 70 + i,
              })),
            },
          },
        });
      },
      async () => {},
    ),
});
server.listen(3210, "127.0.0.1", () => process.stdout.write("fixture-ready\n"));
