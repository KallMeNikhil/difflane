import assert from "node:assert/strict";
import { test } from "node:test";
import * as Y from "yjs";
import type { RoomParticipant } from "@difflane/shared-types";
import { isRoomFull } from "../roomHandlers.js";

function room(limit: number | null, userIds: string[]) {
  const doc = new Y.Doc();
  if (limit !== null) doc.getMap("workspaceMetadata").set("maxParticipants", limit);
  const participants = new Map<string, RoomParticipant>(
    userIds.map((userId, index) => [
      `socket-${index}`,
      { connectionId: `socket-${index}`, userId, identityType: "user", displayName: userId, initials: "U", role: "editor", color: "#fff" },
    ]),
  );
  return { doc, participants };
}

test("rooms without a limit are never full", () => {
  assert.equal(isRoomFull(room(null, ["a", "b", "c"]), "d"), false);
});

test("a new person can't join once the distinct participant limit is reached", () => {
  assert.equal(isRoomFull(room(2, ["a", "b"]), "c"), true);
  assert.equal(isRoomFull(room(3, ["a", "b"]), "c"), false);
});

test("extra tabs of someone already in the room don't count as new participants", () => {
  assert.equal(isRoomFull(room(2, ["a", "a", "b"]), "a"), false);
});
