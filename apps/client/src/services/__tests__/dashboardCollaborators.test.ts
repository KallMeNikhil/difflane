import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCollaborators } from "../DashboardInsightsService";
import type { SessionParticipant, SessionRecord } from "../../types/session";

function participant(id: string, overrides: Partial<SessionParticipant> = {}): SessionParticipant {
  return { id, name: id, initials: id.slice(0, 2).toUpperCase(), role: "Editor", presence: "offline", identityType: "user", ...overrides };
}

function session(id: string, lastActivityAt: string, participants: SessionParticipant[]): SessionRecord {
  return {
    id,
    roomCode: id.toUpperCase(),
    title: `Workspace ${id}`,
    status: "completed",
    workspace: { name: `Workspace ${id}`, description: "", collaboration: {} as never, defaultLanguage: "plaintext", maxParticipants: null },
    fileSystem: { type: "Virtual FS", folderCount: 0, fileCount: 0 },
    counts: { filesImported: 0, filesReviewed: null, discussionsCreated: null, discussionsResolved: null },
    participants,
    timeline: [],
    outcomes: [],
    startedAt: lastActivityAt,
    endedAt: lastActivityAt,
    lastActivityAt,
  };
}

const self = { id: "me", identityType: "user" as const };

test("only people who overlapped with the viewer are collaborators", () => {
  const records = [
    session("a", "2026-01-01T00:00:00Z", [
      participant("me"),
      participant("worked-with", { overlappedWithViewer: true }),
      participant("never-met", { overlappedWithViewer: false }),
    ]),
  ];
  assert.deepEqual(
    buildCollaborators(records, self).map((c) => c.name),
    ["worked-with"],
  );
});

test("the viewer never appears as their own collaborator", () => {
  const records = [session("a", "2026-01-01T00:00:00Z", [participant("me", { overlappedWithViewer: true })])];
  assert.equal(buildCollaborators(records, self).length, 0);
});

test("a guest sharing the viewer's id is still a different person", () => {
  const records = [session("a", "2026-01-01T00:00:00Z", [participant("me", { identityType: "guest", overlappedWithViewer: true })])];
  assert.equal(buildCollaborators(records, self).length, 1);
});

test("the most recent session's name is used and live collaborators sort first", () => {
  const records = [
    session("old", "2026-01-01T00:00:00Z", [participant("bob", { name: "Bob Old", overlappedWithViewer: true })]),
    session("new", "2026-02-01T00:00:00Z", [participant("bob", { name: "Bob New", overlappedWithViewer: true })]),
    session("live", "2026-01-15T00:00:00Z", [participant("carol", { presence: "online", overlappedWithViewer: true })]),
  ];
  const result = buildCollaborators(records, self);
  assert.deepEqual(
    result.map((c) => [c.name, c.presence]),
    [
      ["carol", "online"],
      ["Bob New", "offline"],
    ],
  );
});
