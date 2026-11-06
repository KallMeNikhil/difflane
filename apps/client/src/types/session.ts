import type { ActivityEvent, Collaborator, WorkspaceMetadata, WorkspaceRepositoryInfo } from "./workspace";

export type SessionStatus = "active" | "completed" | "archived";

export interface SessionFileSystemSummary {
  type: string;
  folderCount: number;
  fileCount: number;
}

export interface SessionCounts {
  filesImported: number;
  filesReviewed: number | null;
  discussionsCreated: number | null;
  discussionsResolved: number | null;
}

export interface SessionParticipant extends Collaborator {
  identityType?: "user" | "guest";
  overlappedWithViewer?: boolean;
}

export interface SessionRecord {
  id: string;
  roomCode: string;
  title: string;
  status: SessionStatus;
  workspace: WorkspaceMetadata;
  repository?: WorkspaceRepositoryInfo;
  fileSystem: SessionFileSystemSummary;
  counts: SessionCounts;
  participants: SessionParticipant[];
  timeline: ActivityEvent[];
  outcomes: string[];
  startedAt: string;
  endedAt: string | null;
  lastActivityAt: string;
}

export type SessionStatusFilter = SessionStatus | "all";
export type SessionDateRangeFilter = "all" | "7d" | "30d" | "year";
export type SessionParticipantFilter = "all" | "me";
export type SessionSortOrder = "newest" | "oldest";

export interface SessionHistoryFilters {
  query: string;
  status: SessionStatusFilter;
  workspaceName: string | "all";
  dateRange: SessionDateRangeFilter;
  participant: SessionParticipantFilter;
}

export const DEFAULT_SESSION_HISTORY_FILTERS: SessionHistoryFilters = {
  query: "",
  status: "all",
  workspaceName: "all",
  dateRange: "all",
  participant: "all",
};
