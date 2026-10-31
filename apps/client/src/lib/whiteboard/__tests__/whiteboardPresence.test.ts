import assert from "node:assert/strict";
import { test } from "node:test";
import * as Y from "yjs";
import { readLocalAuthor, readWhiteboardPeers } from "../whiteboardPresence";
import { readElementAuthorship, writeLocalElements, type SyncedElement, type WhiteboardAuthor } from "../whiteboardSync";

const nikhil: WhiteboardAuthor = { userId: "u-nikhil", name: "Nikhil", color: "#b4c5ff" };
const rahul: WhiteboardAuthor = { userId: "u-rahul", name: "Rahul", color: "#ffb596" };
const shape = (version: number, extra: Partial<SyncedElement> = {}): SyncedElement => ({ id: "shape-1", version, versionNonce: 1, ...extra });

test("only people with the whiteboard open count as present, excluding yourself", () => {
  const states = new Map<number, unknown>([
    [1, { userId: "u-me", displayName: "Me", whiteboardOpen: true }],
    [2, { userId: "u-rahul", displayName: "Rahul", initials: "RA", color: "#ffb596", whiteboardOpen: true, whiteboardPointer: { x: 4, y: 5, button: "up", selectedElementIds: {} } }],
    [3, { userId: "u-aman", displayName: "Aman Gupta", whiteboardOpen: false }],
    [4, { userId: "u-priya", displayName: "Priya", whiteboardOpen: true }],
  ]);
  const peers = readWhiteboardPeers(states, 1, "u-me");
  assert.deepEqual(peers.map((peer) => peer.name), ["Priya", "Rahul"]);
  assert.equal(peers[1].initials, "RA");
  assert.deepEqual(peers[1].pointer, { x: 4, y: 5, button: "up", selectedElementIds: {} });
  assert.equal(peers[0].initials, "P");
});

test("several tabs of one person show once, preferring the tab with a live cursor", () => {
  const states = new Map<number, unknown>([
    [7, { userId: "u-rahul", displayName: "Rahul", whiteboardOpen: true }],
    [8, { userId: "u-rahul", displayName: "Rahul", whiteboardOpen: true, whiteboardPointer: { x: 1, y: 1, button: "up", selectedElementIds: {} } }],
  ]);
  const peers = readWhiteboardPeers(states, 99, null);
  assert.equal(peers.length, 1);
  assert.equal(peers[0].clientId, 8);
});

test("the local author comes from the awareness state", () => {
  assert.deepEqual(readLocalAuthor({ userId: "u-1", displayName: "Nikhil", color: "#fff" }), { userId: "u-1", name: "Nikhil", color: "#fff" });
  assert.equal(readLocalAuthor(null), undefined);
});

test("the creator is kept while later edits by someone else are recorded", () => {
  const doc = new Y.Doc();
  writeLocalElements(doc, [shape(1)], nikhil, 1_000);
  writeLocalElements(doc, [shape(2)], nikhil, 2_000);
  assert.deepEqual(readElementAuthorship(doc, "shape-1"), { createdBy: nikhil, createdAt: 1_000, updatedBy: nikhil, updatedAt: 1_000 });

  writeLocalElements(doc, [shape(3)], rahul, 5_000);
  const authorship = readElementAuthorship(doc, "shape-1");
  assert.equal(authorship?.createdBy.name, "Nikhil");
  assert.equal(authorship?.updatedBy.name, "Rahul");
  assert.equal(authorship?.updatedAt, 5_000);
});

test("authorship syncs to other collaborators with the shape", () => {
  const first = new Y.Doc();
  const second = new Y.Doc();
  first.on("update", (update: Uint8Array) => Y.applyUpdate(second, update));
  writeLocalElements(first, [shape(1)], nikhil);
  assert.equal(readElementAuthorship(second, "shape-1")?.createdBy.userId, "u-nikhil");
});
