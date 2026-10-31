import assert from "node:assert/strict";
import { test } from "node:test";
import * as Y from "yjs";
import {
  getWhiteboardElementsMap,
  isNewerElement,
  LOCAL_WHITEBOARD_ORIGIN,
  MAX_WHITEBOARD_FILE_BYTES,
  readWhiteboardElements,
  readWhiteboardFiles,
  writeLocalElements,
  writeLocalFiles,
  type SyncedElement,
} from "../whiteboardSync";

const element = (id: string, version: number, versionNonce = 1, extra: Record<string, unknown> = {}): SyncedElement => ({
  id,
  version,
  versionNonce,
  type: "rectangle",
  ...extra,
});

test("a higher version wins; equal versions break ties on the lower nonce", () => {
  assert.equal(isNewerElement(element("a", 2), undefined), true);
  assert.equal(isNewerElement(element("a", 3), element("a", 2)), true);
  assert.equal(isNewerElement(element("a", 2), element("a", 3)), false);
  assert.equal(isNewerElement(element("a", 2, 5), element("a", 2, 5)), false);
  assert.equal(isNewerElement(element("a", 2, 4), element("a", 2, 9)), true);
  assert.equal(isNewerElement(element("a", 2, 9), element("a", 2, 4)), false);
});

test("only changed elements are written, tagged with the local origin", () => {
  const doc = new Y.Doc();
  const origins: unknown[] = [];
  doc.on("afterTransaction", (transaction: Y.Transaction) => origins.push(transaction.origin));

  assert.equal(writeLocalElements(doc, [element("a", 1), element("b", 1)]), 2);
  assert.equal(writeLocalElements(doc, [element("a", 1), element("b", 1)]), 0);
  assert.equal(writeLocalElements(doc, [element("a", 2), element("b", 1)]), 1);
  assert.deepEqual(origins, [LOCAL_WHITEBOARD_ORIGIN, LOCAL_WHITEBOARD_ORIGIN]);
  assert.equal(getWhiteboardElementsMap(doc).get("a")?.version, 2);
});

test("deleted elements sync as tombstones", () => {
  const doc = new Y.Doc();
  writeLocalElements(doc, [element("a", 1)]);
  writeLocalElements(doc, [element("a", 2, 1, { isDeleted: true })]);
  assert.equal(readWhiteboardElements(doc)[0].isDeleted, true);
});

test("changes reach another replica through Yjs updates", () => {
  const first = new Y.Doc();
  const second = new Y.Doc();
  first.on("update", (update: Uint8Array) => Y.applyUpdate(second, update));
  writeLocalElements(first, [element("shape", 4)]);
  assert.equal(readWhiteboardElements(second)[0].id, "shape");
});

test("images are stored once and oversized ones are skipped", () => {
  const doc = new Y.Doc();
  const small = { id: "img1", mimeType: "image/png", dataURL: "data:image/png;base64,AAAA", created: 1 };
  const huge = { id: "img2", mimeType: "image/png", dataURL: `data:image/png;base64,${"A".repeat(MAX_WHITEBOARD_FILE_BYTES)}`, created: 1 };
  writeLocalFiles(doc, [small, huge]);
  writeLocalFiles(doc, [small]);
  assert.deepEqual(readWhiteboardFiles(doc).map((file) => file.id), ["img1"]);
});
