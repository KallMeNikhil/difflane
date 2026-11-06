import assert from "node:assert/strict";
import { test } from "node:test";
import type { SessionParticipantEntry } from "../../db/models.js";
import {
  closeAllParticipants,
  markParticipantDeparted,
  participantsOverlapped,
  reassignGuestParticipant,
  upsertJoinedParticipant,
} from "../sessionParticipants.js";

const t = (minutes: number) => new Date(Date.UTC(2026, 0, 1, 12, minutes));

function person(userId: string, identityType: "user" | "guest" = "user", displayName = userId): SessionParticipantEntry {
  return { userId, identityType, displayName, initials: displayName.slice(0, 2).toUpperCase(), role: "editor" };
}

test("people whose presence never overlapped are not collaborators", () => {
  let participants = upsertJoinedParticipant([], person("alice"), t(0));
  participants = markParticipantDeparted(participants, person("alice"), t(10));
  participants = upsertJoinedParticipant(participants, person("bob"), t(20));
  participants = closeAllParticipants(participants, t(30));

  const [alice, bob] = participants;
  assert.equal(participantsOverlapped(alice, bob, t(30)), false);
});

test("people connected at the same time are collaborators", () => {
  let participants = upsertJoinedParticipant([], person("alice"), t(0));
  participants = upsertJoinedParticipant(participants, person("bob"), t(5));
  participants = markParticipantDeparted(participants, person("alice"), t(10));
  participants = closeAllParticipants(participants, t(30));

  const [alice, bob] = participants;
  assert.equal(participantsOverlapped(alice, bob, t(30)), true);
});

test("an open interval overlaps up to the session end", () => {
  let participants = upsertJoinedParticipant([], person("alice"), t(0));
  participants = upsertJoinedParticipant(participants, person("bob"), t(50));
  const [alice, bob] = participants;
  assert.equal(participantsOverlapped(alice, bob, t(60)), true);
});

test("legacy entries without presence data never count as overlapping", () => {
  assert.equal(participantsOverlapped(person("alice"), person("bob"), t(60)), false);
});

test("rejoining refreshes the display name and opens one new interval", () => {
  let participants = upsertJoinedParticipant([], person("alice", "user", "Old Name"), t(0));
  participants = upsertJoinedParticipant(participants, person("alice", "user", "Old Name"), t(1));
  assert.equal(participants[0].intervals?.length, 1);

  participants = markParticipantDeparted(participants, person("alice"), t(5));
  participants = upsertJoinedParticipant(participants, person("alice", "user", "New Name"), t(10));
  assert.equal(participants.length, 1);
  assert.equal(participants[0].displayName, "New Name");
  assert.equal(participants[0].intervals?.length, 2);
});

test("a guest and a user with the same id are different people", () => {
  let participants = upsertJoinedParticipant([], person("same-id", "guest"), t(0));
  participants = upsertJoinedParticipant(participants, person("same-id", "user"), t(1));
  assert.equal(participants.length, 2);
});

test("guest upgrade rewrites the guest entry to the new account", () => {
  const participants = upsertJoinedParticipant([], person("guest-1", "guest"), t(0));
  const result = reassignGuestParticipant(participants, "guest-1", "user-1");
  assert.equal(result.changed, true);
  assert.deepEqual(
    result.participants.map((p) => [p.userId, p.identityType]),
    [["user-1", "user"]],
  );
});

test("guest upgrade merges into an existing entry for the account", () => {
  let participants = upsertJoinedParticipant([], person("user-1"), t(0));
  participants = markParticipantDeparted(participants, person("user-1"), t(5));
  participants = upsertJoinedParticipant(participants, person("guest-1", "guest"), t(10));
  const result = reassignGuestParticipant(participants, "guest-1", "user-1");
  assert.equal(result.participants.length, 1);
  assert.equal(result.participants[0].intervals?.length, 2);
});

test("guest upgrade leaves unrelated sessions untouched", () => {
  const participants = upsertJoinedParticipant([], person("someone"), t(0));
  assert.equal(reassignGuestParticipant(participants, "guest-1", "user-1").changed, false);
});
