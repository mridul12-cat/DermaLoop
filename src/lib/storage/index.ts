import { openDB } from "idb";
import { WorkspaceSchema, type Workspace } from "../models";
const db = () =>
  openDB("dermaloop", 1, {
    upgrade(db) {
      db.createObjectStore("workspaces");
    },
  });
export const empty = (namespace: Workspace["namespace"]): Workspace => ({
  schemaVersion: 1,
  namespace,
  scans: [],
  routines: [],
  decisions: [],
});
export async function load(namespace: Workspace["namespace"]) {
  const d = await db();
  const value = await d.get("workspaces", namespace);
  return value ? WorkspaceSchema.parse(value) : empty(namespace);
}
export async function save(w: Workspace) {
  const parsed = WorkspaceSchema.parse(w);
  const d = await db();
  await d.put("workspaces", parsed, w.namespace);
}
export async function removeAll() {
  const d = await db();
  await d.clear("workspaces");
}
export function parseImport(text: string) {
  if (text.length > 2000000) throw new Error("Import too large");
  const w = WorkspaceSchema.parse(JSON.parse(text));
  if (w.namespace === "live")
    throw new Error(
      "Live import is disabled: imported JSON cannot be authenticated as a YouCam response.",
    );
  return w;
}
