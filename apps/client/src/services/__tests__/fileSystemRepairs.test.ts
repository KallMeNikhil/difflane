import assert from "node:assert/strict";
import { test } from "node:test";
import * as Y from "yjs";
import type { WorkspaceFileSystemEntry } from "@difflane/shared-types";
import { planFileSystemRepairs, readFileSystemEntries, subscribeFileSystemEntries } from "../WorkspaceFileSystemService";

const file = (id: string, name: string, parentId: string | null = null): WorkspaceFileSystemEntry => ({ id, name, parentId, type: "file", order: 0 });
const folder = (id: string, name: string, parentId: string | null = null): WorkspaceFileSystemEntry => ({ id, name, parentId, type: "folder", order: 0 });

test("files created with the same name at the same time get distinct names, decided the same way everywhere", () => {
  const repairs = planFileSystemRepairs([file("b-id", "main.py"), file("a-id", "main.py"), file("c-id", "MAIN.py")]);
  assert.deepEqual(
    repairs.map((entry) => [entry.id, entry.name]).sort(),
    [
      ["b-id", "main (2).py"],
      ["c-id", "MAIN (3).py"],
    ],
  );
});

test("a numbered name already in use is skipped", () => {
  const repairs = planFileSystemRepairs([file("a", "notes"), file("b", "notes"), file("c", "notes (2)")]);
  assert.deepEqual(repairs.map((entry) => entry.name), ["notes (3)"]);
});

test("same names in different folders are fine", () => {
  assert.deepEqual(planFileSystemRepairs([folder("src", "src"), file("a", "index.ts", "src"), file("b", "index.ts")]), []);
});

test("a file created inside a folder someone just deleted moves to the root instead of disappearing", () => {
  const repairs = planFileSystemRepairs([file("orphan", "draft.py", "deleted-folder")]);
  assert.deepEqual(repairs, [file("orphan", "draft.py", null)]);
});

test("two replicas creating the same file converge on the same repaired tree", () => {
  const first = new Y.Doc();
  const second = new Y.Doc();
  const unsubscribeFirst = subscribeFileSystemEntries(first, () => undefined);
  const unsubscribeSecond = subscribeFileSystemEntries(second, () => undefined);
  first.getMap("workspaceFileSystem").set("x-1", file("x-1", "app.js"));
  second.getMap("workspaceFileSystem").set("x-2", file("x-2", "app.js"));
  Y.applyUpdate(second, Y.encodeStateAsUpdate(first));
  Y.applyUpdate(first, Y.encodeStateAsUpdate(second));
  Y.applyUpdate(second, Y.encodeStateAsUpdate(first));
  const names = (doc: Y.Doc) => readFileSystemEntries(doc).map((entry) => `${entry.id}:${entry.name}`).sort();
  assert.deepEqual(names(first), ["x-1:app.js", "x-2:app (2).js"]);
  assert.deepEqual(names(first), names(second));
  unsubscribeFirst();
  unsubscribeSecond();
});
