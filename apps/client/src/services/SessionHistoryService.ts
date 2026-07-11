import type { RoomParticipant } from "@difflane/shared-types";
import type {
  SessionDateRangeFilter,
  SessionHistoryFilters,
  SessionRecord,
  SessionSortOrder,
} from "../types/session";
import type { Collaborator, WorkspaceMetadata, WorkspaceRepositoryInfo } from "../types/workspace";
import { getMemberRoleLabel } from "../utils/workspaceDisplay";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * HOUR).toISOString();
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * DAY).toISOString();
}

const CURRENT_USER_PARTICIPANT = { id: "participant-me", initials: "ME", name: "You", role: "Editor · Host", presence: "offline" as const };

const SESSION_RECORDS: SessionRecord[] = [
  {
    id: "session-auth-review",
    roomCode: "auth-review",
    title: "Authentication Review",
    status: "active",
    workspace: {
      name: "Frontend Core Migration",
      description: "Shared workspace for the frontend authentication and session-handling migration.",
      collaboration: { cursorPresence: true, inlineDiscussions: true, sharedNavigation: true },
    },
    repository: {
      provider: "github",
      owner: "org",
      name: "frontend-core",
      branch: "main",
      fileCount: 148,
      lastSyncedAt: hoursAgo(2),
    },
    fileSystem: { type: "Virtual FS", folderCount: 12, fileCount: 148 },
    counts: { filesImported: 32, filesReviewed: 3, discussionsCreated: 10, discussionsResolved: 8 },
    participants: [
      CURRENT_USER_PARTICIPANT,
      { id: "participant-lead-architect", initials: "L", name: "Lead Architect", role: "Reviewer · Collaborator", presence: "online" },
      { id: "participant-frontend-engineer", initials: "F", name: "Frontend Engineer", role: "Editor · Collaborator", presence: "online" },
      { id: "participant-backend-engineer", initials: "B", name: "Backend Engineer", role: "Viewer · Collaborator", presence: "offline" },
    ],
    timeline: [
      { id: "event-1", actorName: "System", description: "Workspace created", timestampLabel: "Oct 24, 08:45 AM" },
      { id: "event-2", actorName: "System", description: "Repository imported", timestampLabel: "Oct 24, 08:48 AM" },
      { id: "event-3", actorName: "System", description: "Participants joined", timestampLabel: "Oct 24, 08:50 AM" },
      { id: "event-4", actorName: "Lead Architect", description: "Discussion created", timestampLabel: "Oct 24, 09:15 AM" },
      { id: "event-5", actorName: "You", description: "Discussion resolved", timestampLabel: "Oct 25, 02:15 PM" },
    ],
    outcomes: [
      "Workspace successfully initialized",
      "Repository imported successfully",
      "Workspace synchronized",
      "2 discussions still awaiting resolution",
    ],
    startedAt: hoursAgo(27),
    endedAt: null,
    lastActivityAt: hoursAgo(2),
  },
  {
    id: "session-rate-limiting",
    roomCode: "rate-limiting",
    title: "Rate Limiting Implementation",
    status: "completed",
    workspace: {
      name: "API Gateway",
      description: "Shared workspace for API gateway request-handling and throttling changes.",
      collaboration: { cursorPresence: true, inlineDiscussions: true, sharedNavigation: false },
    },
    repository: {
      provider: "github",
      owner: "org",
      name: "api-gateway",
      branch: "main",
      fileCount: 64,
      lastSyncedAt: daysAgo(20),
    },
    fileSystem: { type: "Virtual FS", folderCount: 6, fileCount: 64 },
    counts: { filesImported: 18, filesReviewed: 3, discussionsCreated: 2, discussionsResolved: 2 },
    participants: [
      { id: "participant-backend-engineer-2", initials: "B", name: "Backend Engineer", role: "Editor · Host", presence: "offline" },
      { id: "participant-lead-architect-2", initials: "L", name: "Lead Architect", role: "Reviewer · Collaborator", presence: "offline" },
    ],
    timeline: [
      { id: "event-1", actorName: "System", description: "Workspace created", timestampLabel: "Oct 20, 09:40 AM" },
      { id: "event-2", actorName: "System", description: "Repository imported", timestampLabel: "Oct 20, 09:42 AM" },
      { id: "event-3", actorName: "Backend Engineer", description: "Discussion created", timestampLabel: "Oct 20, 10:05 AM" },
      { id: "event-4", actorName: "Lead Architect", description: "Discussion resolved", timestampLabel: "Oct 20, 10:20 AM" },
      { id: "event-5", actorName: "System", description: "Session completed", timestampLabel: "Oct 20, 10:25 AM" },
    ],
    outcomes: [
      "Workspace successfully initialized",
      "Repository imported successfully",
      "Workspace synchronized",
      "All blocking discussions resolved",
      "Session completed successfully",
    ],
    startedAt: daysAgo(20),
    endedAt: daysAgo(20),
    lastActivityAt: daysAgo(20),
  },
  {
    id: "session-ui-polish",
    roomCode: "ui-polish",
    title: "UI Polish Session",
    status: "completed",
    workspace: {
      name: "Frontend Core Migration",
      description: "Shared workspace for the frontend authentication and session-handling migration.",
      collaboration: { cursorPresence: true, inlineDiscussions: true, sharedNavigation: true },
    },
    repository: {
      provider: "github",
      owner: "org",
      name: "frontend-core",
      branch: "main",
      fileCount: 148,
      lastSyncedAt: daysAgo(3),
    },
    fileSystem: { type: "Virtual FS", folderCount: 12, fileCount: 148 },
    counts: { filesImported: 12, filesReviewed: 5, discussionsCreated: 4, discussionsResolved: 4 },
    participants: [
      CURRENT_USER_PARTICIPANT,
      { id: "participant-frontend-engineer-2", initials: "F", name: "Frontend Engineer", role: "Reviewer · Collaborator", presence: "offline" },
    ],
    timeline: [
      { id: "event-1", actorName: "System", description: "Workspace created", timestampLabel: "3 days ago" },
      { id: "event-2", actorName: "You", description: "Discussion created", timestampLabel: "3 days ago" },
      { id: "event-3", actorName: "Frontend Engineer", description: "Discussion resolved", timestampLabel: "3 days ago" },
      { id: "event-4", actorName: "System", description: "Session completed", timestampLabel: "3 days ago" },
    ],
    outcomes: [
      "Workspace successfully initialized",
      "Workspace synchronized",
      "All blocking discussions resolved",
      "Session completed successfully",
    ],
    startedAt: daysAgo(3),
    endedAt: daysAgo(3),
    lastActivityAt: daysAgo(3),
  },
  {
    id: "session-db-refactor",
    roomCode: "db-refactor",
    title: "Database Refactor",
    status: "completed",
    workspace: {
      name: "API Gateway",
      description: "Shared workspace for API gateway request-handling and throttling changes.",
      collaboration: { cursorPresence: true, inlineDiscussions: false, sharedNavigation: false },
    },
    repository: {
      provider: "github",
      owner: "org",
      name: "api-gateway",
      branch: "main",
      fileCount: 64,
      lastSyncedAt: daysAgo(1),
    },
    fileSystem: { type: "Virtual FS", folderCount: 6, fileCount: 64 },
    counts: { filesImported: 9, filesReviewed: 2, discussionsCreated: 3, discussionsResolved: 1 },
    participants: [
      CURRENT_USER_PARTICIPANT,
      { id: "participant-backend-engineer-3", initials: "B", name: "Backend Engineer", role: "Reviewer · Collaborator", presence: "offline" },
    ],
    timeline: [
      { id: "event-1", actorName: "System", description: "Workspace created", timestampLabel: "Yesterday" },
      { id: "event-2", actorName: "You", description: "Discussion created", timestampLabel: "Yesterday" },
      { id: "event-3", actorName: "System", description: "Session completed", timestampLabel: "Yesterday" },
    ],
    outcomes: [
      "Workspace successfully initialized",
      "Repository imported successfully",
      "2 discussions still awaiting resolution",
    ],
    startedAt: daysAgo(1),
    endedAt: daysAgo(1),
    lastActivityAt: daysAgo(1),
  },
  {
    id: "session-legacy-auth-cleanup",
    roomCode: "legacy-auth-cleanup",
    title: "Legacy Auth Cleanup",
    status: "archived",
    workspace: {
      name: "Frontend Core Migration",
      description: "Shared workspace for the frontend authentication and session-handling migration.",
      collaboration: { cursorPresence: true, inlineDiscussions: true, sharedNavigation: true },
    },
    fileSystem: { type: "Virtual FS", folderCount: 12, fileCount: 148 },
    counts: { filesImported: 21, filesReviewed: 6, discussionsCreated: 6, discussionsResolved: 6 },
    participants: [{ id: "participant-lead-architect-3", initials: "L", name: "Lead Architect", role: "Editor · Host", presence: "offline" }],
    timeline: [
      { id: "event-1", actorName: "System", description: "Workspace created", timestampLabel: "Aug 12, 11:00 AM" },
      { id: "event-2", actorName: "Lead Architect", description: "Discussion resolved", timestampLabel: "Aug 12, 04:30 PM" },
      { id: "event-3", actorName: "System", description: "Session completed", timestampLabel: "Aug 12, 04:45 PM" },
    ],
    outcomes: [
      "Workspace successfully initialized",
      "Workspace synchronized",
      "All blocking discussions resolved",
      "Session archived",
    ],
    startedAt: daysAgo(60),
    endedAt: daysAgo(60),
    lastActivityAt: daysAgo(60),
  },
];

export interface SessionHistoryResult {
  records: SessionRecord[];
}

export async function fetchSessionRecords(): Promise<SessionRecord[]> {
  return Promise.resolve(SESSION_RECORDS.map((record) => ({ ...record })));
}

export function getSessionRecordById(records: SessionRecord[], id: string): SessionRecord | undefined {
  return records.find((record) => record.id === id);
}

export function getWorkspaceNameOptions(records: SessionRecord[]): string[] {
  return Array.from(new Set(records.map((record) => record.workspace.name))).sort((a, b) => a.localeCompare(b));
}

function matchesQuery(record: SessionRecord, query: string): boolean {
  if (!query.trim()) {
    return true;
  }
  const haystack = [record.title, record.workspace.name, record.repository?.name ?? "", record.repository?.owner ?? ""]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

function matchesDateRange(record: SessionRecord, range: SessionDateRangeFilter): boolean {
  if (range === "all") {
    return true;
  }
  const startedAt = new Date(record.startedAt).getTime();
  const now = Date.now();
  if (range === "7d") {
    return now - startedAt <= 7 * DAY;
  }
  if (range === "30d") {
    return now - startedAt <= 30 * DAY;
  }
  return now - startedAt <= 365 * DAY;
}

export function filterSessionRecords(records: SessionRecord[], filters: SessionHistoryFilters): SessionRecord[] {
  return records.filter((record) => {
    if (filters.status !== "all" && record.status !== filters.status) {
      return false;
    }
    if (filters.workspaceName !== "all" && record.workspace.name !== filters.workspaceName) {
      return false;
    }
    if (filters.participant === "me" && !record.participants.some((participant) => participant.id === CURRENT_USER_PARTICIPANT.id)) {
      return false;
    }
    if (!matchesDateRange(record, filters.dateRange)) {
      return false;
    }
    return matchesQuery(record, filters.query);
  });
}

export function sortSessionRecords(records: SessionRecord[], order: SessionSortOrder): SessionRecord[] {
  const sorted = [...records].sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
  return order === "newest" ? sorted.reverse() : sorted;
}

const DATE_LABEL_FORMAT: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
const DATE_TIME_LABEL_FORMAT: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

export function formatDateTimeLabel(iso: string): string {
  return new Date(iso).toLocaleString("en-US", DATE_TIME_LABEL_FORMAT);
}

export function formatDateRangeLabel(startIso: string, endIso: string | null): string {
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : null;
  if (!end || start.toDateString() === end.toDateString()) {
    return start.toLocaleDateString("en-US", DATE_LABEL_FORMAT);
  }
  return `${start.toLocaleDateString("en-US", DATE_LABEL_FORMAT)} - ${end.toLocaleDateString("en-US", DATE_LABEL_FORMAT)}`;
}

export function formatDurationLabel(startIso: string, endIso: string | null): string {
  const durationMs = (endIso ? new Date(endIso).getTime() : Date.now()) - new Date(startIso).getTime();
  const totalMinutes = Math.max(0, Math.round(durationMs / (60 * 1000)));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours > 0 || days > 0) {
    parts.push(`${hours}h`);
  }
  parts.push(`${minutes}m`);
  return parts.join(" ");
}

export function formatRelativeTimeLabel(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMinutes = Math.round(diffMs / (60 * 1000));
  if (diffMinutes < 1) {
    return "Just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }
  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) {
    return "Yesterday";
  }
  if (diffDays < 30) {
    return `${diffDays} days ago`;
  }
  return new Date(iso).toLocaleDateString("en-US", DATE_LABEL_FORMAT);
}

export interface LiveSessionCounts {
  filesReviewed: number;
  discussionsCreated: number;
  discussionsResolved: number;
}

export interface LiveSessionInputs {
  roomCode: string;
  workspace: WorkspaceMetadata;
  repository: WorkspaceRepositoryInfo | null;
  folderCount: number;
  fileCount: number;
  counts: LiveSessionCounts;
  participants: RoomParticipant[];
  startedAt: string;
  lastActivityAt: string;
}

function mapParticipantsToCollaborators(participants: RoomParticipant[]): Collaborator[] {
  return participants.map((participant) => ({
    id: participant.userId,
    initials: participant.initials,
    name: participant.displayName,
    role: getMemberRoleLabel(participant.role),
    presence: "online",
  }));
}

function deriveLiveOutcomes(repository: WorkspaceRepositoryInfo | null, discussionsResolved: number, discussionsPending: number): string[] {
  const outcomes = ["Workspace successfully initialized"];
  if (repository) {
    outcomes.push("Repository imported successfully");
    outcomes.push("Workspace synchronized");
  }
  if (discussionsPending === 0 && discussionsResolved > 0) {
    outcomes.push("All blocking discussions resolved");
  } else if (discussionsPending > 0) {
    outcomes.push(`${discussionsPending} discussion${discussionsPending === 1 ? "" : "s"} still awaiting resolution`);
  }
  return outcomes;
}

export function buildLiveSessionRecord(inputs: LiveSessionInputs): SessionRecord {
  const { roomCode, workspace, repository, folderCount, fileCount, counts, participants, startedAt, lastActivityAt } = inputs;
  const discussionsPending = counts.discussionsCreated - counts.discussionsResolved;

  return {
    id: `session-${roomCode.toLowerCase()}`,
    roomCode,
    title: "Live Collaboration Session",
    status: "active",
    workspace,
    repository: repository ?? undefined,
    fileSystem: { type: "Virtual FS", folderCount, fileCount },
    counts: {
      filesImported: repository ? repository.fileCount : fileCount,
      filesReviewed: counts.filesReviewed,
      discussionsCreated: counts.discussionsCreated,
      discussionsResolved: counts.discussionsResolved,
    },
    participants: mapParticipantsToCollaborators(participants),
    timeline: [
      { id: "live-session-start", actorName: "You", description: "Workspace session started", timestampLabel: formatDateTimeLabel(startedAt) },
    ],
    outcomes: deriveLiveOutcomes(repository, counts.discussionsResolved, discussionsPending),
    startedAt,
    endedAt: null,
    lastActivityAt,
  };
}
