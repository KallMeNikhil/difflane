import assert from "node:assert/strict";
import { test } from "node:test";
import * as Y from "yjs";
import { getUndoManager } from "../collaborativeUndo";

function pair() {
  const mine = new Y.Doc();
  const theirs = new Y.Doc();
  mine.on("update", (update: Uint8Array, origin: unknown) => {
    if (origin !== "remote") Y.applyUpdate(theirs, update, "remote");
  });
  theirs.on("update", (update: Uint8Array, origin: unknown) => {
    if (origin !== "remote") Y.applyUpdate(mine, update, "remote");
  });
  return { mine: mine.getText("file"), theirs: theirs.getText("file") };
}

test("undo only reverts your own edits, never a collaborator's", () => {
  const { mine, theirs } = pair();
  const binding = {};
  const undo = getUndoManager(mine);
  undo.addTrackedOrigin(binding);

  mine.doc!.transact(() => mine.insert(0, "let a = 1;\n"), binding);
  undo.stopCapturing();
  theirs.insert(theirs.length, "let b = 2;\n");
  mine.doc!.transact(() => mine.insert(mine.length, "let c = 3;\n"), binding);

  undo.undo();
  assert.equal(mine.toString(), "let a = 1;\nlet b = 2;\n");
  undo.undo();
  assert.equal(mine.toString(), "let b = 2;\n");
  assert.equal(theirs.toString(), "let b = 2;\n");

  undo.redo();
  undo.redo();
  assert.equal(mine.toString(), "let a = 1;\nlet b = 2;\nlet c = 3;\n");
});

test("undoing after a collaborator edited the same region keeps their text intact", () => {
  const { mine, theirs } = pair();
  const binding = {};
  const undo = getUndoManager(mine);
  undo.addTrackedOrigin(binding);

  mine.doc!.transact(() => mine.insert(0, "hello world"), binding);
  theirs.insert(5, ",");
  theirs.insert(theirs.length, "!");

  undo.undo();
  assert.equal(mine.toString(), ",!");
  assert.equal(theirs.toString(), ",!");
});

test("each text keeps one shared history across editor rebinds", () => {
  const doc = new Y.Doc();
  const text = doc.getText("file");
  assert.equal(getUndoManager(text), getUndoManager(text));
  const firstBinding = {};
  const secondBinding = {};
  const undo = getUndoManager(text);
  undo.addTrackedOrigin(firstBinding);
  doc.transact(() => text.insert(0, "a"), firstBinding);
  undo.removeTrackedOrigin(firstBinding);
  undo.addTrackedOrigin(secondBinding);
  undo.stopCapturing();
  doc.transact(() => text.insert(1, "b"), secondBinding);
  undo.undo();
  undo.undo();
  assert.equal(text.toString(), "");
});
