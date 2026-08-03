import type { MemberRole, RoomParticipant, SessionHistoryEntry } from "@difflane/shared-types";
import type {
  SessionDateRangeFilter,
  SessionHistoryFilters,
  SessionRecord,
  SessionSortOrder,
} from "../types/session";
import type { Collaborator, WorkspaceMetadata, WorkspaceRepositoryInfo } from "../types/workspace";
import { getMemberRoleLabel } from "../utils/workspaceDisplay";
import { fetchSessionHistory } from "./AuthService";
import { DEFAULT_WORKSPACE_METADATA } from "./WorkspaceFileSystemService";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function toSessionRecord(entry: SessionHistoryEntry): SessionRecord {
  return {
    id: entry.id,
    roomCode: entry.roomCode,
    title: entry.workspaceName,
    status: entry.status,
    workspace: { ...DEFAULT_WORKSPACE_METADATA, name: entry.workspaceName },
    fileSystem: { type: "Virtual FS", folderCount: entry.folderCount, fileCount: entry.fileCount },
    counts: { filesImported: entry.fileCount, filesReviewed: 0, discussionsCreated: 0, discussionsResolved: 0 },
    participants: entry.participants.map((participant) => ({
      id: participant.userId,
      initials: participant.initials,
      name: participant.displayName,
      role: getMemberRoleLabel(participant.role as MemberRole),
      presence: "offline",
    })),
    timeline: entry.timeline.map((event) => ({
      id: event.id,
      actorName: event.actorName,
      description: event.description,
      timestampLabel: formatDateTimeLabel(event.occurredAt),
    })),
    outcomes: entry.status === "completed" ? ["Session completed successfully"] : ["Session in progress"],
    startedAt: entry.startedAt,
    endedAt: entry.endedAt,
    lastActivityAt: entry.lastActivityAt,
  };
}

export async function fetchSessionRecords(guestId: string | null): Promise<SessionRecord[]> {
  const response = await fetchSessionHistory(guestId);
  return response.sessions.map(toSessionRecord);
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

export function filterSessionRecords(records: SessionRecord[], filters: SessionHistoryFilters, currentUserId?: string): SessionRecord[] {
  return records.filter((record) => {
    if (filters.status !== "all" && record.status !== filters.status) {
      return false;
    }
    if (filters.workspaceName !== "all" && record.workspace.name !== filters.workspaceName) {
      return false;
    }
    if (filters.participant === "me" && !record.participants.some((participant) => participant.id === currentUserId)) {
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
