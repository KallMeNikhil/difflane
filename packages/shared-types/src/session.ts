export type SessionRecordStatus = "active" | "completed";

export interface SessionParticipantPayload {
  userId: string;
  identityType: "user" | "guest";
  displayName: string;
  initials: string;
  role: string;
}

export interface SessionTimelineEventPayload {
  id: string;
  actorName: string;
  description: string;
  occurredAt: string;
}

export interface SessionHistoryEntry {
  id: string;
  workspaceCode: string;
  workspaceName: string;
  roomCode: string;
  status: SessionRecordStatus;
  fileCount: number;
  folderCount: number;
  participants: SessionParticipantPayload[];
  timeline: SessionTimelineEventPayload[];
  startedAt: string;
  endedAt: string | null;
  lastActivityAt: string;
}

export interface SessionHistoryResponse {
  sessions: SessionHistoryEntry[];
}
